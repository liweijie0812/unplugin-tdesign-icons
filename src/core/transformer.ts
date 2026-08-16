import { parse } from 'es-module-lexer'
import { MagicString } from 'magic-string'
import type { FrameworkConfig, TransformResult } from '../types.ts'
import { collectLocalIconTags } from './local-icons.ts'
import { loadManifest } from './manifest.ts'
import { transformSfc } from './vue-sfc.ts'

/**
 * 创建针对某个框架配置的转换器。
 * 负责把「图标桶导入」改写为「深层单图标导入」，并在开启 `localIcons` 时
 * 把 `<Icon>` / `<t-icon>` 指向构建产物中的本地 svg-sprite。
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
    // --- 快速短路（dev/编译性能关键路径）----------------------------------
    // 绝大多数业务文件并不导入图标包。在启动 es-module-lexer / SFC 解析器
    //（体积大、耗 CPU）之前，先用一次廉价的字符串包含检查把无关文件挡在门外。
    const mentionsPkg = code.includes(config.packageName)
    if (!mentionsPkg && !config.localIcons) {
      // 未开启 `localIcons` 时，转换器只处理图标包导入：文件不含包名即无任何可改之处。
      return null
    }
    // `localIcons` 开启时，无包导入的文件仍可能因别名标签（例如全局注册的
    // `<t-icon>`）需要注入本地 sprite URL，需进一步做标签预检。
    if (!mentionsPkg && config.localIcons) {
      const tagRe = /<(Icon|icon|[A-Za-z][\w-]*)\b/g
      let canRewrite = false
      const aliasTags = new Set(['Icon', 'icon', ...Object.keys(config.aliases ?? {})])
      let m: RegExpExecArray | null
      while ((m = tagRe.exec(code))) {
        if (aliasTags.has(m[1])) {
          canRewrite = true
          break
        }
      }
      if (!canRewrite) return null
    }

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
    //    掩码标签扫描器注入 sprite URL。静态和动态 name 都保留原样。
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

    // 收集桶 `Icon` 在本文件导入时的本地名，供 localIcons 标签扫描使用。
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

    // 当存在桶 `Icon` 绑定或配置了别名标签时，为所有静态/动态图标用法覆盖
    // url 与 loadDefaultIcons。组件库可能全局注册 `t-icon`，无需显式 import。
    const iconTags = [] as ReturnType<typeof collectLocalIconTags>
    const hasAliasTags = config.aliases ? Object.keys(config.aliases).length > 0 : false
    if (config.localIcons && (iconLocalNames.length || hasAliasTags)) {
      iconTags.push(
        ...collectLocalIconTags(
          code,
          iconLocalNames,
          config.aliases,
          config.localIcons.url,
          /\.vue$/.test(id ?? ''),
        ),
      )
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
      for (const name of specifiers) {
        const [original, alias] = name.split(/\s+as\s+/)
        const local = alias ? alias.trim() : original
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
        // 整条语句只包含重复或无法保留的图标说明符，直接移除。
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

    // 覆盖用户已有的 url/loadDefaultIcons，保证只加载本次构建输出的 sprite。
    for (const usage of iconTags) {
      s.overwrite(usage.openTagStart, usage.openTagEnd, usage.replacement)
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
