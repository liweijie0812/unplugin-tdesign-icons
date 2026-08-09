import { parse } from 'es-module-lexer'
import { MagicString } from 'magic-string'
import type { FrameworkConfig, TransformResult } from '../types.ts'
import { collectIconUsages, findInjectPosition } from './local-icons.ts'
import { loadManifest, loadManifestByName } from './manifest.ts'
import { transformSfc } from './vue-sfc.ts'

/**
 * 创建针对某个框架配置的转换器。
 * 负责把「图标桶导入」改写为「深层单图标导入」，并在开启 `localIcons` 时
 * 把 `<Icon name="...">` 模板标签改写为深层单图标组件。
 */
export function createTransformer(config: FrameworkConfig) {
  // 缓存 manifest 数据，避免每个文件都重复解析
  let manifestData: ReturnType<typeof loadManifest> | null = null

  function cachedLoadManifest() {
    if (manifestData) return manifestData
    manifestData = loadManifest(config.packageName)
    return manifestData
  }

  async function transform(code: string, id?: string): Promise<TransformResult> {
    const { exportMap } = cachedLoadManifest()
    // 用 MagicString 记录对代码的增删改，最后统一生成新的代码与 sourcemap
    const s = new MagicString(code)
    let changed = false

    // 用 es-module-lexer 解析 import / export 语句
    let imports: readonly import('es-module-lexer').ImportSpecifier[] = []
    try {
      ;[imports] = parse(code)
    } catch {
      // 非 JS 内容（例如原始的 .vue SFC）可能让词法器抛错，
      // 回退到只匹配普通 import 语句的宽松正则。
    }

    // --- Vue 3 SFC `<Icon name="...">` 模板改写 ---------------------------
    // 两条互补、互斥的路径：
    //
    // 1. `localIcons` 关闭（默认）：`.vue` 文件优先走 SFC 流水线 ——
    //    `@vue/compiler-sfc` 解析 `<script setup>` + `<template>`，并把静态的
    //    `<Icon name="..." />` 改写为单图标组件。如果没有可改写的标签，
    //    则继续走下面的普通导入改写。
    //    这里的廉价预过滤可避免对不含图标的文件加载（体积较大的）SFC 解析器。
    //
    // 2. `localIcons` 开启：整个文件（任意后缀，包括 `.vue`）由下面的字符串
    //    掩码标签扫描器处理，它同样能识别 `<t-icon>` 封装标签（`aliases`）和
    //    全局注册的图标。此时跳过 SFC 流水线，避免两条路径对同一文件双重改写。
    if (!config.localIcons && /\.vue$/.test(id ?? '') && (code.includes(config.packageName) || /<Icon\b/.test(code))) {
      const sfcResult = await transformSfc(code, id!, config)
      if (sfcResult) return sfcResult
    }

    // 收集 import 语句范围：优先使用 lexer 结果，失败则回退正则
    const stmts =
      imports.length > 0
        ? imports.map((imp) => ({ start: imp.ss, end: imp.se, n: imp.n }))
        : [...code.matchAll(/import\s*\{[^}]*\}\s*from\s*['"]([^'"]+)['"]/g)].map(
            (m) => ({ start: m.index!, end: m.index! + m[0].length, n: m[1]! }),
          )

    // 开启 `localIcons` 时，我们还会把 `<Icon name="xxx" />`
    //（默认会加载 CDN sprite 的 svg-sprite `Icon`）改写成深层单图标组件
    // `<XxxIcon />`，让图标离线也能渲染。
    // 先收集桶 `Icon` 在本文件导入时的本地名。
    let iconLocalNames: string[] = []
    if (config.localIcons) {
      for (const stmt of stmts) {
        if (stmt.n !== config.packageName) continue
        const statement = code.slice(stmt.start, stmt.end)
        const specifierMatch = statement.match(/\{([\s\S]*)\}/)
        if (!specifierMatch) continue
        for (const spec of specifierMatch[1]!.split(',').map((n) => n.trim()).filter(Boolean)) {
          const [original, alias] = spec.split(/\s+as\s+/)
          // 标签改写针对桶的 `Icon` 导出（始终）以及 `aliases` 引用的其它桶导出
          //（例如组件库把某个导出重新映射为 `<t-icon>`）。
          const isBarrelIcon =
            original === 'Icon' ||
            (config.aliases && Object.values(config.aliases).includes(original))
          if (isBarrelIcon) {
            const local = alias ? alias.trim() : original
            if (!iconLocalNames.includes(local)) iconLocalNames.push(local)
          }
        }
      }
    }

    // 收集 `<Icon name="xxx" />` 用法，以便在开启 `localIcons` 时改写为深层
    // 单图标组件。当存在桶 `Icon` 绑定 **或** 配置了别名标签（例如 `t-icon`）时
    // 运行 —— 组件库可能全局注册了 `t-icon`，而同一文件里没有显式 `import { Icon }`。
    const iconUsages: ReturnType<typeof collectIconUsages>['usages'] = []
    const iconStillUsed = new Set<string>()
    const hasAliasTags = config.aliases ? Object.keys(config.aliases).length > 0 : false
    if (config.localIcons && (iconLocalNames.length || hasAliasTags)) {
      const collected = collectIconUsages(code, iconLocalNames, config.aliases, loadManifestByName(cachedLoadManifest()))
      iconUsages.push(...collected.usages)
      for (const name of collected.stillUsed) iconStillUsed.add(name)
    }

    // 已使用的图标 key（`本地名@stem`），用于去重注入的深层导入
    const usedIconKeys = new Set<string>()
    for (const stmt of stmts) {
      if (stmt.n !== config.packageName) continue

      const statement = code.slice(stmt.start, stmt.end)
      // `export { X } from 'pkg'` 是再导出（lexer 也会把它报告为导入）；
      // 必须保留 `export` 关键字，否则模块会静默停止再导出该图标。
      const isReExport = /^export\b/.test(statement)
      // 从 import 语句中收集 `{ ... }` 具名说明符
      const specifierMatch = statement.match(/\{([\s\S]*)\}/)
      if (!specifierMatch) continue

      const specifiers = specifierMatch[1]!
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)

      // 仅类型的说明符（`import type { X }`、`import { type X }`、
      // `export type { X }`）必须原样保留 —— 深层模块是 JS 值模块，
      // 把它改写成值导入/导出会改变 TS 语义，且在 `isolatedModules` 下会报错。
      if (/^import\s+type\b|^export\s+type\b|\btype\s+[A-Za-z_$]/.test(statement)) continue

      const iconSpecs: { original: string; local: string; stem: string }[] = []
      const barrelSpecifiers: string[] = []
      const inStatement = new Set<string>()
      const aliasBarrel = config.aliases ? Object.values(config.aliases) : []
      // 可被 `localIcons` 改写标签的桶导出：始终是 `Icon`，加上 `aliases` 引用的
      const rewritableBarrel = ['Icon', ...aliasBarrel]
      for (const name of specifiers) {
        const [original, alias] = name.split(/\s+as\s+/)
        const local = alias ? alias.trim() : original
        // 如果 `localIcons` 已把所有 `<Icon ...>` 引用全部改写，就丢掉
        // 现在已无用的桶 `Icon` 导入，让 CDN-sprite 模块能被 tree-shake。
        if (config.localIcons && rewritableBarrel.includes(original) && !iconStillUsed.has(local)) {
          continue
        }
        if (!original || !exportMap.has(original)) {
          // 非图标导出（普通值/类型），原样保留在桶导入中
          barrelSpecifiers.push(name)
          continue
        }
        const stem = exportMap.get(original)!
        const key = `${local}@${stem}`
        // 对同一语句内重复的说明符去重，并记录深层导入 key 供注入复用
        if (inStatement.has(key)) continue
        inStatement.add(key)
        usedIconKeys.add(key)
        iconSpecs.push({ original, local, stem })
      }

      if (!iconSpecs.length && !barrelSpecifiers.length) {
        // 整条语句变成空（例如只导入了 `Icon`，且因 `localIcons` 改写了所有
        // 用法而被丢弃）—— 直接移除整条语句。
        s.remove(stmt.start, stmt.end)
        changed = true
        continue
      }
      if (!iconSpecs.length) continue

      const lines: string[] = []
      if (isReExport) {
        // 保留剩余的桶说明符作为再导出，然后把每个图标改写为深层再导出
        //（`export { default as X } from ...`），让模块继续以原名导出该图标。
        if (barrelSpecifiers.length) {
          lines.push(`export { ${barrelSpecifiers.join(', ')} } from '${config.packageName}'`)
        }
        for (const { local, stem } of iconSpecs) {
          lines.push(
            `export { default as ${local} } from '${config.packageName}/${config.componentDir}/${stem}.js'`,
          )
        }
      } else {
        // 普通导入：桶说明符保留为桶导入，图标改写为默认导入的深层模块
        if (barrelSpecifiers.length) {
          lines.push(`import { ${barrelSpecifiers.join(', ')} } from '${config.packageName}'`)
        }
        for (const { local, stem } of iconSpecs) {
          lines.push(
            `import ${local} from '${config.packageName}/${config.componentDir}/${stem}.js'`,
          )
        }
      }
      // 用改写后的多行语句覆盖原 import 语句
      s.overwrite(stmt.start, stmt.end, lines.join('\n'))
      changed = true
    }

    // 把 `<Icon name="xxx" />` 改写为 `<XxxIcon />`，并为引用的图标注入深层
    // 导入（让应用完全离线可用）。新导入追加在最后一条已有 import 语句之后
    //（`.vue` SFC 则插入 `<script>` 块内），保证输出仍是合法代码。
    const injectPos = findInjectPosition(code, stmts)
    const injectBuffer: string[] = []
    for (const usage of iconUsages) {
      const component = usage.component
      const key = `${component}@${usage.stem}`
      // 若该图标此前未导入过，则生成深层导入语句
      if (!usedIconKeys.has(key)) {
        usedIconKeys.add(key)
        injectBuffer.push(
          `import ${component} from '${config.packageName}/${config.componentDir}/${usage.stem}.js'`,
        )
      }
      // `<Icon name="sneer" ... />` → `<SneerIcon ... />`
      s.overwrite(usage.openTagStart, usage.openTagEnd, `<${component}${usage.attrs}${usage.selfClosing ? ' /' : ''}>`)
      if (usage.closeTagStart >= 0) {
        s.overwrite(usage.closeTagStart, usage.closeTagEnd, `</${component}>`)
      }
      changed = true
    }

    // 注入新生成的深层导入语句
    if (injectBuffer.length) {
      const sep = /\n$/.test(code.slice(0, injectPos)) ? '' : '\n'
      s.appendLeft(injectPos, `${sep}${injectBuffer.join('\n')}\n`)
      changed = true
    }

    // 没有产生任何改动则返回 null，表示「不处理这个文件」
    if (!changed) return null
    return {
      code: s.toString(),
      map: s.generateMap({ hires: true }),
    }
  }

  // 对外暴露转换器与（可复用的）manifest 加载函数
  return { transform, loadManifest: cachedLoadManifest }
}
