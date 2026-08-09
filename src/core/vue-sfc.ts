import { parse } from 'es-module-lexer'
import { MagicString } from 'magic-string'
import type { FrameworkConfig, TransformResult } from '../types.ts'
import { getBabelParse, getSfcParse } from './lazy-loaders.ts'
import { loadManifest } from './manifest.ts'
import type { ComponentRegistrations, SFCAstNode } from './types.ts'

/**
 * 在经典 `<script>`（Options API）中定位 `components` 选项，并返回把模板标签
 * 映射到图标桶本地名（`Icon`）的注册项，以及标签被改写后更新对象所需的偏移量。
 * 当不存在 `components` 对象时返回 `null`。
 */
export async function getComponentRegistrations(
  scriptCode: string,
  iconLocals: Set<string>,
): Promise<ComponentRegistrations | null> {
  // 懒加载 babel 解析器（无法解析时返回 null）
  const parse = await getBabelParse()
  if (!parse) return null
  let ast: any
  try {
    ast = parse(scriptCode, { sourceType: 'module', errorRecovery: true })
  } catch {
    return null
  }
  // 找到默认导出对象 `export default { ... }`
  const defaultExport = ast.program.body.find(
    (n: any) => n.type === 'ExportDefaultDeclaration',
  )
  if (!defaultExport || defaultExport.declaration.type !== 'ObjectExpression') return null
  // 定位 `components: { ... }` 属性
  const componentsProp = defaultExport.declaration.properties.find(
    (p: any) => p.type === 'ObjectProperty' && p.key?.name === 'components',
  )
  if (!componentsProp || componentsProp.value.type !== 'ObjectExpression') return null
  const regs: { tag: string; local: string; start: number; end: number }[] = []
  const props: { start: number; end: number; raw: string }[] = []
  for (const prop of componentsProp.value.properties) {
    if (prop.type !== 'ObjectProperty' && prop.type !== 'ObjectMethod') continue
    // 记录每个属性的原文，供后续安全地重新输出
    props.push({
      start: prop.start,
      end: prop.end,
      raw: scriptCode.slice(prop.start, prop.end),
    })
    const keyName = prop.key?.name ?? prop.key?.value
    if (!keyName) continue
    const valueName = prop.shorthand ? keyName : prop.value?.name
    if (!valueName || !iconLocals.has(valueName)) continue
    // 值引用了图标桶本地名的注册项（例如 `Icon`）
    regs.push({ tag: keyName, local: valueName, start: prop.start, end: prop.end })
  }
  return {
    valueStart: componentsProp.value.start,
    valueEnd: componentsProp.value.end,
    props,
    regs,
  }
}

/**
 * Vue SFC 改写 —— 同时支持 `<script setup>`（Vue 2.7+/Vue 3）和经典
 * `<script>`（Options API，Vue 2 经典 SFC）：
 *
 *   <script setup>
 *   import { Icon } from 'tdesign-icons-vue-next'
 *   </script>
 *   <template>
 *     <Icon name="sneer" size="large" />
 *   </template>
 *
 * 会被改写为
 *
 *   <script setup>
 *   import SneerIcon from 'tdesign-icons-vue-next/esm/components/sneer.js'
 *   </script>
 *   <template>
 *     <SneerIcon size="large" />
 *   </template>
 *
 * 对于经典 `<script>`，绑定关系通过 `components` 选项确认
 *（`components: { Icon }`）；一旦该标签的所有用法都被改写，
 * 注册项会被更新为指向新引入的深层组件。
 *
 * 只改写图标存在的静态 `<Icon name="...">` 标签（不处理动态 `:name`），
 * 其余情况保留原始的 `Icon` 绑定不变。
 */
export async function transformSfc(code: string, id: string, config: FrameworkConfig): Promise<TransformResult> {
  const parseSfc = await getSfcParse()
  if (!parseSfc) return null

  // `@vue/compiler-sfc` 的 `parse` 不会抛异常：错误累积在 `errors` 中
  //（纯 JS 文件会报「至少需要一个 <template> 或 <script>」）。有错误就直接返回，
  // 不做任何改动。
  const { descriptor, errors } = parseSfc(code, { filename: id })
  if (errors.length || !descriptor.template?.ast) return null

  // `<script setup>`（Vue 2.7+/Vue 3）或经典 `<script>`（Options API，
  // Vue 2 经典 SFC）。经典模式需要 `components` 注册项来确认模板 `<Icon>` 绑定。
  const isSetup = Boolean(descriptor.scriptSetup)
  const scriptBlock = descriptor.scriptSetup ?? descriptor.script
  if (!scriptBlock) return null

  const { template } = descriptor
  // `loc` 在 compiler-sfc v2 和 v3 中都是覆盖 *内容*（位于 `<script ...>` 开标签
  // 与 `</script>` 闭标签之间）。
  const setupStart = scriptBlock.loc.start.offset
  const setupEnd = scriptBlock.loc.end.offset
  const { exportMap, nameToStem, stemToIcon } = loadManifest(config.packageName)

  const setupCode = code.slice(setupStart, setupEnd)
  let setupImports: readonly import('es-module-lexer').ImportSpecifier[]
  try {
    ;[setupImports] = parse(setupCode)
  } catch {
    // `<script>` 内容无法解析（少见的 TS/decorator 语法）—— 直接跳过整个文件，
    // 避免冒险破坏它。
    return null
  }

  // 收集 `<script>` 块内的图标桶导入语句。
  const pkgImports: {
    ss: number
    se: number
    statement: string
    specifiers: { original: string; local: string; raw: string }[]
  }[] = []
  for (const imp of setupImports) {
    if (imp.n !== config.packageName) continue
    const statement = setupCode.slice(imp.ss, imp.se)
    // 再导出 / 仅类型导入不会产生可用的本地绑定
    if (/^export\b/.test(statement)) continue
    if (/^import\s+type\b/.test(statement)) continue
    const specifierMatch = statement.match(/\{([\s\S]*)\}/)
    if (!specifierMatch) continue
    const specifiers = specifierMatch[1]!
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .map((raw) => {
        const [original, alias] = raw.split(/\s+as\s+/)
        return { original: original!.trim(), local: (alias ? alias.trim() : original!.trim()), raw }
      })
    pkgImports.push({ ss: imp.ss, se: imp.se, statement, specifiers })
  }

  // 模板改写只会在 `<Icon>` 显式绑定到图标桶时生效
  //（`import { Icon } from 'tdesign-icons-xxx'`）：
  // - `<script setup>`：存在 `{ Icon }`（或其别名）导入说明符；
  // - 经典 `<script>`：图标桶的 `Icon` 本地名还必须注册在
  //   `components: { Icon }` 中（否则 `<Icon>` 很可能是全局/自定义组件 —— 不改写）。
  const iconLocals = new Set(
    pkgImports.flatMap((p) =>
      p.specifiers
        .filter((s) => s.original === 'Icon')
        .map((s) => s.local),
    ),
  )
  let registrations: ComponentRegistrations | null = null
  if (isSetup) {
    if (!iconLocals.size) return null
  } else {
    registrations = await getComponentRegistrations(setupCode, iconLocals)
    if (!registrations || !registrations.regs.length) return null
  }

  // 扫描 `<template>` AST 中的静态 `<Icon name="...">` 标签
  const rewrites: {
    tagStart: number
    tagEnd: number
    newTag: string
    nameStart: number
    nameEnd: number
    stem: string
  }[] = []
  const sfcImports: { local: string; stem: string }[] = []
  let templateChanged = false
  // 统计每个已注册标签可改写 / 不可改写的用法数量。只有当某标签的 *所有*
  // 用法都被改写时，其注册项才会被移除（残留的动态/未知 `<Icon>` 会保留绑定）。
  const rewritableCount = new Map<string, number>()
  const unrewritableCount = new Map<string, number>()
  // 递归遍历模板 AST
  const walk = (node: SFCAstNode) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 1) {
      // 判断该标签是否绑定到图标桶（setup 直接看本地名；经典模式查注册项）
      const tagBound = isSetup
        ? iconLocals.has(node.tag)
        : registrations!.regs.some((r) => r.tag === node.tag)
      if (tagBound) {
        // 静态的 `name` 属性（type === 6）与动态 `:name`（type === 7）
        const staticNames = (node.props || []).filter(
          (p: any) => p.type === 6 && p.name === 'name',
        )
        const dynamicName = (node.props || []).some(
          (p: any) => p.type === 7 && (p.arg?.content === 'name' || !p.arg),
        )
        if (staticNames.length === 1 && !dynamicName) {
          // 恰好一个静态 `name="..."` 且没有动态 name —— 可改写
          const name = staticNames[0].value.content
          const stem = nameToStem.get(name)
          if (stem) {
            // 图标存在：`<Icon name="sneer">` → `<SneerIcon>`
            const iconName = stemToIcon.get(stem) ?? name
            const local = `${iconName}Icon`
            const tagStart = node.loc.start.offset
            const tagEnd = tagStart + 1 + node.tag.length
            const nameProp = staticNames[0]
            let nameStart = nameProp.loc.start.offset
            const nameEnd = nameProp.loc.end.offset
            // 吸收 `name="..."` 前的空白，让重命名
            //（`<Icon name=... />` → `<SneerIcon />`）保持整洁
            if (nameStart > 0 && /\s/.test(code[nameStart - 1])) nameStart -= 1
            rewrites.push({ tagStart, tagEnd, newTag: local, nameStart, nameEnd, stem })
            // 去重：同一 `<Icon name>` 可能多次出现
            if (!sfcImports.some((i) => i.local === local)) {
              sfcImports.push({ local, stem })
            }
            rewritableCount.set(node.tag, (rewritableCount.get(node.tag) ?? 0) + 1)
          } else {
            // 不可改写的 `<Icon>` → 原始 `Icon` 绑定必须保留
            unrewritableCount.set(node.tag, (unrewritableCount.get(node.tag) ?? 0) + 1)
            templateChanged = true
          }
        } else {
          // 不可改写的 `<Icon>` → 原始 `Icon` 绑定必须保留
          unrewritableCount.set(node.tag, (unrewritableCount.get(node.tag) ?? 0) + 1)
          templateChanged = true
        }
      }
      for (const child of node.children || []) walk(child)
    } else if (node.children) {
      for (const child of node.children) walk(child)
    }
  }
  walk(template.ast)

  // 没有可改写的内容
  if (!sfcImports.length) return null

  // 只有某标签的 *所有* 用法都被改写时，才移除它的注册项
  for (const r of registrations?.regs ?? []) {
    const rew = rewritableCount.get(r.tag) ?? 0
    const unrew = unrewritableCount.get(r.tag) ?? 0
    if (rew > 0 && unrew === 0) r.removed = true
  }

  const s = new MagicString(code)
  for (const rw of rewrites) {
    // 只替换标签 *名*（`Icon` → `SneerIcon`），保留 `<`
    s.overwrite(rw.tagStart + 1, rw.tagEnd, rw.newTag)
    s.overwrite(rw.nameStart, rw.nameEnd, '')
  }

  const sfcLocals = new Set(sfcImports.map((i) => i.local))
  // 所有包导入范围（相对 setup 内容），用于「Icon 是否在脚本其它地方被引用」的检查
  const pkgRanges: [number, number][] = pkgImports.map((p) => [p.ss, p.se])
  // 被移除的注册项（其标签已全部改写）不再算作脚本内的引用 ——
  // 否则即使 `components: { Icon }` 已被删除，`Icon` 导入也永远不会被移除。
  const removedRegRanges: [number, number][] = (registrations?.regs ?? [])
    .filter((r) => r.removed)
    .map((r) => [r.start, r.end])
  // 检查某个名字在脚本内容中是否还有包导入 / 已移除注册项之外的引用
  const isReferencedOutside = (name: string) => {
    const re = new RegExp(`\\b${name}\\b`, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(setupCode))) {
      const idx = m.index
      if (pkgRanges.some(([s, e]) => idx >= s && idx < e)) continue
      if (removedRegRanges.some(([s, e]) => idx >= s && idx < e)) continue
      return true
    }
    return false
  }

  // 经典 `<script>`（Options API）：改写后的 `<XxxIcon />` 标签会被 Vue 2 编译成
  // `_c("XxxIcon")`，Vue 在运行时从 `components` 选项中解析。因此这里不是删除注册项，
  // 而是重建 `components` 对象：注册所有新引入的深层图标组件
  //（以及原本就存在的非图标注册项）。
  if (registrations) {
    // 仍然绑定着的注册项（未完全改写）
    const stillBound = registrations.regs.filter((r) => !r.removed)
    // 非图标注册项（例如 `MyButton`）保留原始源码
    const nonIconProps = registrations.props.filter(
      (p) => !registrations.regs.some((r) => r.start === p.start && r.end === p.end),
    )
    const entries: string[] = []
    const pushEntry = (e: string) => {
      if (!entries.includes(e)) entries.push(e)
    }
    for (const imp of sfcImports) pushEntry(imp.local) // 深层图标组件
    for (const r of stillBound) {
      // 重新输出仍绑定注册项的原始源码（例如 `Icon`）
      const prop = registrations.props.find((p) => p.start === r.start && p.end === r.end)
      pushEntry(prop ? prop.raw : r.local)
    }
    for (const p of nonIconProps) pushEntry(p.raw) // 无关组件
    const newValue = `{ ${entries.join(', ')} }`
    s.overwrite(
      setupStart + registrations.valueStart,
      setupStart + registrations.valueEnd,
      newValue,
    )
  }

  const lines: string[] = []
  // 把生成的深层导入挂到携带 `Icon` 说明符的导入语句上
  //（`hasIconBinding` 门控保证了它一定存在）。
  let hostPkg = pkgImports.find((p) => p.specifiers.some((s) => s.local === 'Icon'))
  if (!hostPkg) hostPkg = pkgImports[0]
  for (const pkg of pkgImports) {
    const kept: string[] = []
    const deep: { local: string; stem: string }[] = []
    for (const spec of pkg.specifiers) {
      const { original, local, raw } = spec
      if (sfcLocals.has(local)) continue // 模板改写引入的，跳过
      if (exportMap.has(original)) {
        // 普通图标导入（例如 `CloseIcon`）→ 深层导入
        deep.push({ local, stem: exportMap.get(original)! })
        continue
      }
      if (original === 'Icon') {
        // 动态 `<Icon name>` 组件。仅当模板中 *所有* `<Icon>` 都被改写、
        // 且脚本内容中不再引用它时才丢弃。经典模式额外要求注册项已移除
        //（模板中还有 `components: { Icon }` 且存在未改写的 `<Icon>` 时必须保留绑定）。
        if (!templateChanged && !isReferencedOutside(local) && (!registrations || !registrations.regs.some((r) => r.local === local && !r.removed))) {
          continue
        }
      }
      kept.push(raw)
    }
    const stmtLines: string[] = []
    if (kept.length) stmtLines.push(`import { ${kept.join(', ')} } from '${config.packageName}'`)
    for (const d of deep) {
      stmtLines.push(`import ${d.local} from '${config.packageName}/${config.componentDir}/${d.stem}.js'`)
    }
    if (pkg === hostPkg) {
      // 宿主语句额外追加模板改写产生的深层导入
      for (const imp of sfcImports) {
        stmtLines.push(`import ${imp.local} from '${config.packageName}/${config.componentDir}/${imp.stem}.js'`)
      }
    }
    if (stmtLines.length) {
      s.overwrite(setupStart + pkg.ss, setupStart + pkg.se, stmtLines.join('\n'))
      lines.push(...stmtLines)
    }
  }

  // 没有任何改写则返回 null
  if (!rewrites.length && !lines.length) return null

  return { code: s.toString(), map: s.generateMap({ hires: true }) }
}
