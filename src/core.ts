import { createUnplugin } from 'unplugin'
import { init, parse } from 'es-module-lexer'
import { MagicString } from 'magic-string'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import type { Options, ResolvedOptions, FrameworkConfig, Framework, TransformResult } from './types.ts'

// Lazy `@vue/compiler-sfc` loader — the SFC parser is huge (~1.5MB), so it is
// never bundled and only loaded on demand for `.vue` files that actually need
// `<script>`/`<template>` re-writing. When published it resolves against the
// consumer's node_modules (aligned with the `vue` dependency they already have).
type SFCParse = typeof import('@vue/compiler-sfc').parse
// Template AST node — the shape differs across compiler-sfc versions, so keep
// it structural (type: 1 for element nodes, loc/props/children as used below).
type SFCAstNode = any

let cachedSfcParse: SFCParse | null = null
async function getSfcParse(): Promise<SFCParse | null> {
  if (cachedSfcParse) return cachedSfcParse
  try {
    cachedSfcParse = (await import(/* @vite-ignore */ '@vue/compiler-sfc')).parse
  } catch {
    cachedSfcParse = null
  }
  return cachedSfcParse
}

// Lazy `@babel/parser` loader — used to locate the `components` option inside a
// classic `<script>` (Options API) block so the template `<Icon>` binding can be
// confirmed and the registration updated once the tag is rewritten.
// `@babel/parser` is a hard dependency of `@vue/compiler-sfc`, so it is resolved
// from that package's location (same lazy, never-bundled strategy as above).
let cachedBabelParse: ((code: string, opts?: Record<string, unknown>) => any) | null = null
async function getBabelParse() {
  if (cachedBabelParse) return cachedBabelParse
  try {
    const sfcEntry = nodeRequire.resolve('@vue/compiler-sfc')
    const sfcRequire = createRequire(sfcEntry)
    const babelEntry = sfcRequire.resolve('@babel/parser')
    const mod: any = await import(pathToFileURL(babelEntry).href)
    cachedBabelParse = mod.parse ?? mod.default?.parse
  } catch {
    cachedBabelParse = null
  }
  return cachedBabelParse
}

interface ComponentRegistrations {
  /** Offsets (script-relative) of the `components` value object `{ ... }`. */
  valueStart: number
  valueEnd: number
  /** All properties inside the `components` object (for safe re-emission). */
  props: { start: number; end: number; raw: string }[]
  /** Registrations whose value references one of the icon-barrel locals. */
  regs: { tag: string; local: string; start: number; end: number; removed?: boolean }[]
}

/**
 * Locate the `components` option inside a classic `<script>` (Options API) and
 * return the entries that map a template tag to an icon-barrel local (`Icon`),
 * plus the offsets needed to update the object once tags are rewritten.
 * Returns `null` when there is no `components` object to speak of.
 */
async function getComponentRegistrations(
  scriptCode: string,
  iconLocals: Set<string>,
): Promise<ComponentRegistrations | null> {
  const parse = await getBabelParse()
  if (!parse) return null
  let ast: any
  try {
    ast = parse(scriptCode, { sourceType: 'module', errorRecovery: true })
  } catch {
    return null
  }
  const defaultExport = ast.program.body.find(
    (n: any) => n.type === 'ExportDefaultDeclaration',
  )
  if (!defaultExport || defaultExport.declaration.type !== 'ObjectExpression') return null
  const componentsProp = defaultExport.declaration.properties.find(
    (p: any) => p.type === 'ObjectProperty' && p.key?.name === 'components',
  )
  if (!componentsProp || componentsProp.value.type !== 'ObjectExpression') return null
  const regs: { tag: string; local: string; start: number; end: number }[] = []
  const props: { start: number; end: number; raw: string }[] = []
  for (const prop of componentsProp.value.properties) {
    if (prop.type !== 'ObjectProperty' && prop.type !== 'ObjectMethod') continue
    props.push({
      start: prop.start,
      end: prop.end,
      raw: scriptCode.slice(prop.start, prop.end),
    })
    const keyName = prop.key?.name ?? prop.key?.value
    if (!keyName) continue
    const valueName = prop.shorthand ? keyName : prop.value?.name
    if (!valueName || !iconLocals.has(valueName)) continue
    regs.push({ tag: keyName, local: valueName, start: prop.start, end: prop.end })
  }
  return {
    valueStart: componentsProp.value.start,
    valueEnd: componentsProp.value.end,
    props,
    regs,
  }
}

/** A `<Icon name="...">` / `<t-icon name="...">` usage collected by `localIcons`. */
interface IconUsage {
  component: string
  stem: string
  attrs: string
  selfClosing: boolean
  openTagStart: number
  openTagEnd: number
  closeTagStart: number
  closeTagEnd: number
}

// Resolve & load the icon package's manifest. In CJS builds `module.require`
// is available; in ESM builds we derive a require from our own module URL
// (which resolves sibling packages inside the consumer's node_modules).
// We deliberately avoid the bare `require` identifier so bundlers (esbuild/
// tsup) don't inject their own runtime `require` shim that breaks in ESM.
const nodeRequire =
  typeof module !== 'undefined' && typeof (module as any).require === 'function'
    ? (module as any).require.bind(module)
    : createRequire(import.meta.url)

export function createTransformer(config: FrameworkConfig) {
  let manifestData: { exportMap: Map<string, string>; nameToStem: Map<string, string>; stemToIcon: Map<string, string> } | null = null

  function loadManifest() {
    if (manifestData) return manifestData

    const manifestModule = requireManifest(config.packageName)
    const items = manifestModule.manifest ?? manifestModule.default?.manifest ?? []
    const exportMap = new Map<string, string>()
    const nameToStem = new Map<string, string>()
    const stemToIcon = new Map<string, string>()
    for (const item of Array.isArray(items) ? items : []) {
      if (item && typeof item.stem === 'string' && typeof item.icon === 'string') {
        // The barrel (`pkg/esm/index.js`) exports each icon as `manifest.icon + 'Icon'`,
        // e.g. `manifest.icon === 'Close'`  →  `export { default as CloseIcon }`.
        // A few icons already end with `Icon` (e.g. `FileIcon`, `Icon`), which yields
        // `FileIconIcon` / `IconIcon` — matching the real barrel export names.
        exportMap.set(`${item.icon}Icon`, item.stem)
        // Reverse index used to resolve `<Icon name="...">` in Vue SFC templates:
        //   `name="sneer"`    → stem `sneer`
        //   `name="Chart3D"`  → stem `chart-3d`
        //   `name="chart-3d"` → stem `chart-3d`
        nameToStem.set(item.icon, item.stem)
        nameToStem.set(item.stem, item.stem)
        stemToIcon.set(item.stem, item.icon)
      }
    }
    manifestData = { exportMap, nameToStem, stemToIcon }
    return manifestData
  }

  /**
   * `<Icon name="...">` → deep single-icon component name lookup, used by the
   * `localIcons` string scanner. Accepts the lowercase stem (`sneer`), the
   * PascalCase icon (`Chart3D`) and the kebab-case stem (`chart-3d`), resolving
   * them all to the barrel export name (`SneerIcon` / `Chart3DIcon`).
   */
  function loadManifestByName(): Map<string, string> {
    const { nameToStem, stemToIcon } = loadManifest()
    const byName = new Map<string, string>()
    for (const [name, stem] of nameToStem) {
      const iconName = stemToIcon.get(stem) ?? name
      byName.set(name, `${iconName}Icon`)
    }
    return byName
  }

  /**
   * Vue SFC re-writing — supports both `<script setup>` (Vue 2.7+/Vue 3) and
   * classic `<script>` (Options API, Vue 2 classic SFC):
   *
   *   <script setup>
   *   import { Icon } from 'tdesign-icons-vue-next'
   *   </script>
   *   <template>
   *     <Icon name="sneer" size="large" />
   *   </template>
   *
   * becomes
   *
   *   <script setup>
   *   import SneerIcon from 'tdesign-icons-vue-next/esm/components/sneer.js'
   *   </script>
   *   <template>
   *     <SneerIcon size="large" />
   *   </template>
   *
   * For a classic `<script>` the binding is confirmed via the `components`
   * option (`components: { Icon }`) and the registration is updated to point at
   * the introduced deep component once every usage of that tag is rewritten.
   *
   * Only static `<Icon name="...">` tags (no dynamic `:name`) whose icon exists
   * are rewritten; anything else keeps the original `Icon` binding intact.
   */
  async function transformSfc(code: string, id: string): Promise<TransformResult> {
    const parseSfc = await getSfcParse()
    if (!parseSfc) return null

    // `@vue/compiler-sfc`'s `parse` is non-throwing: errors accumulate in
    // `errors` (a plain JS file yields "At least one <template> or <script> is
    // required"). Bail out without touching the code.
    const { descriptor, errors } = parseSfc(code, { filename: id })
    if (errors.length || !descriptor.template?.ast) return null

    // `<script setup>` (Vue 2.7+/Vue 3) or classic `<script>` (Options API,
    // Vue 2 classic SFC). Classic mode needs the `components` registration to
    // confirm the template `<Icon>` binding.
    const isSetup = Boolean(descriptor.scriptSetup)
    const scriptBlock = descriptor.scriptSetup ?? descriptor.script
    if (!scriptBlock) return null

    const { template } = descriptor
    // `loc` spans the *content* (between the `<script ...>` opening and the
    // `</script>` closing tags) in both compiler-sfc v2 and v3.
    const setupStart = scriptBlock.loc.start.offset
    const setupEnd = scriptBlock.loc.end.offset
    const { exportMap, nameToStem, stemToIcon } = loadManifest()

    const setupCode = code.slice(setupStart, setupEnd)
    let setupImports: readonly import('es-module-lexer').ImportSpecifier[]
    try {
      ;[setupImports] = parse(setupCode)
    } catch {
      // Unparseable <script> body (unusual TS/decorator syntax) — leave
      // the whole file untouched rather than risk corrupting it.
      return null
    }

    // Collect the icon-barrel import statements inside the <script> block.
    const pkgImports: {
      ss: number
      se: number
      statement: string
      specifiers: { original: string; local: string; raw: string }[]
    }[] = []
    for (const imp of setupImports) {
      if (imp.n !== config.packageName) continue
      const statement = setupCode.slice(imp.ss, imp.se)
      // Re-exports / type-only imports don't introduce a usable local binding.
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

    // The template re-write only applies when `<Icon>` is explicitly bound to
    // the icon barrel (`import { Icon } from 'tdesign-icons-xxx'`):
    // - `<script setup>`: an import specifier `{ Icon }` (or an alias) exists;
    // - classic `<script>`: the icon-barrel `Icon` local must also be
    //   registered in `components: { Icon }` (otherwise `<Icon>` is likely a
    //   global/custom component — leave untouched).
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

    // Scan the <template> AST for static `<Icon name="...">` tags.
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
    // Per registered tag: how many usages were rewritable vs not. A
    // registration is only dropped when *every* usage of that tag was
    // rewritten (a remaining dynamic/unknown `<Icon>` keeps the binding).
    const rewritableCount = new Map<string, number>()
    const unrewritableCount = new Map<string, number>()
    const walk = (node: SFCAstNode) => {
      if (!node || typeof node !== 'object') return
      if (node.type === 1) {
        const tagBound = isSetup
          ? iconLocals.has(node.tag)
          : registrations!.regs.some((r) => r.tag === node.tag)
        if (tagBound) {
          const staticNames = (node.props || []).filter(
            (p: any) => p.type === 6 && p.name === 'name',
          )
          const dynamicName = (node.props || []).some(
            (p: any) => p.type === 7 && (p.arg?.content === 'name' || !p.arg),
          )
          if (staticNames.length === 1 && !dynamicName) {
            const name = staticNames[0].value.content
            const stem = nameToStem.get(name)
            if (stem) {
              const iconName = stemToIcon.get(stem) ?? name
              const local = `${iconName}Icon`
              const tagStart = node.loc.start.offset
              const tagEnd = tagStart + 1 + node.tag.length
              const nameProp = staticNames[0]
              let nameStart = nameProp.loc.start.offset
              const nameEnd = nameProp.loc.end.offset
              // Absorb the whitespace before `name="..."` so the rename
              // (`<Icon name=... />` → `<SneerIcon />`) stays clean.
              if (nameStart > 0 && /\s/.test(code[nameStart - 1])) nameStart -= 1
              rewrites.push({ tagStart, tagEnd, newTag: local, nameStart, nameEnd, stem })
              // Dedup: the same `<Icon name>` may appear multiple times.
              if (!sfcImports.some((i) => i.local === local)) {
                sfcImports.push({ local, stem })
              }
              rewritableCount.set(node.tag, (rewritableCount.get(node.tag) ?? 0) + 1)
            } else {
              // Un-rewritable `<Icon>` → the original `Icon` binding must stay.
              unrewritableCount.set(node.tag, (unrewritableCount.get(node.tag) ?? 0) + 1)
              templateChanged = true
            }
          } else {
            // Un-rewritable `<Icon>` → the original `Icon` binding must stay.
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

    // Nothing to rewrite.
    if (!sfcImports.length) return null

    // A registration is dropped only when every usage of its tag was rewritten.
    for (const r of registrations?.regs ?? []) {
      const rew = rewritableCount.get(r.tag) ?? 0
      const unrew = unrewritableCount.get(r.tag) ?? 0
      if (rew > 0 && unrew === 0) r.removed = true
    }

    const s = new MagicString(code)
    for (const rw of rewrites) {
      // Replace only the tag *name* (`Icon` → `SneerIcon`), keeping the `<`.
      s.overwrite(rw.tagStart + 1, rw.tagEnd, rw.newTag)
      s.overwrite(rw.nameStart, rw.nameEnd, '')
    }

    const sfcLocals = new Set(sfcImports.map((i) => i.local))
    // All package import ranges (setup-relative), used for the "Icon used
    // elsewhere in the script body?" reference check.
    const pkgRanges: [number, number][] = pkgImports.map((p) => [p.ss, p.se])
    // Registrations that were dropped (their tag fully rewritten) must not
    // count as a script-body reference — otherwise the `Icon` import would
    // never be removed even though `components: { Icon }` is gone.
    const removedRegRanges: [number, number][] = (registrations?.regs ?? [])
      .filter((r) => r.removed)
      .map((r) => [r.start, r.end])
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

    // Classic `<script>` (Options API): the rewritten `<XxxIcon />` tags are
    // compiled by Vue 2 into `_c("XxxIcon")`, which Vue resolves at runtime from
    // the `components` option. So instead of dropping the registration we rebuild
    // the `components` object to register every introduced deep icon component
    // (plus any non-icon registrations that were already there).
    if (registrations) {
      const stillBound = registrations.regs.filter((r) => !r.removed)
      // Non-icon registrations (e.g. `MyButton`) keep their raw source.
      const nonIconProps = registrations.props.filter(
        (p) => !registrations.regs.some((r) => r.start === p.start && r.end === p.end),
      )
      const entries: string[] = []
      const pushEntry = (e: string) => {
        if (!entries.includes(e)) entries.push(e)
      }
      for (const imp of sfcImports) pushEntry(imp.local) // deep icon components
      for (const r of stillBound) {
        // Re-emit the raw source of a still-bound registration (e.g. `Icon`).
        const prop = registrations.props.find((p) => p.start === r.start && p.end === r.end)
        pushEntry(prop ? prop.raw : r.local)
      }
      for (const p of nonIconProps) pushEntry(p.raw) // unrelated components
      const newValue = `{ ${entries.join(', ')} }`
      s.overwrite(
        setupStart + registrations.valueStart,
        setupStart + registrations.valueEnd,
        newValue,
      )
    }

    const lines: string[] = []
    // Host the generated deep imports in the import statement that carries the
    // `Icon` specifier (guaranteed to exist by the `hasIconBinding` gate).
    let hostPkg = pkgImports.find((p) => p.specifiers.some((s) => s.local === 'Icon'))
    if (!hostPkg) hostPkg = pkgImports[0]
    for (const pkg of pkgImports) {
      const kept: string[] = []
      const deep: { local: string; stem: string }[] = []
      for (const spec of pkg.specifiers) {
        const { original, local, raw } = spec
        if (sfcLocals.has(local)) continue // introduced by the template rewrite
        if (exportMap.has(original)) {
          // Regular icon import (e.g. `CloseIcon`) → deep import.
          deep.push({ local, stem: exportMap.get(original)! })
          continue
        }
        if (original === 'Icon') {
          // The dynamic `<Icon name>` component. Drop it only when every
          // `<Icon>` in the template was rewritten AND it isn't referenced in
          // the script body. Classic mode additionally needs the registration
          // to be gone (a template `components: { Icon }` with an un-rewritten
          // `<Icon>` must keep the binding).
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
        for (const imp of sfcImports) {
          stmtLines.push(`import ${imp.local} from '${config.packageName}/${config.componentDir}/${imp.stem}.js'`)
        }
      }
      if (stmtLines.length) {
        s.overwrite(setupStart + pkg.ss, setupStart + pkg.se, stmtLines.join('\n'))
        lines.push(...stmtLines)
      }
    }

    if (!rewrites.length && !lines.length) return null

    return { code: s.toString(), map: s.generateMap({ hires: true }) }
  }

  async function transform(code: string, id?: string): Promise<TransformResult> {
    const { exportMap } = loadManifest()
    const s = new MagicString(code)
    let changed = false

    let imports: readonly import('es-module-lexer').ImportSpecifier[] = []
    try {
      ;[imports] = parse(code)
    } catch {
      // Non-JS content (e.g. raw .vue SFC) can make the lexer throw.
      // Fall back to a permissive regex that only matches plain import statements.
    }

    // --- Vue 3 SFC `<Icon name="...">` template re-writing ---------------
    // Two complementary, mutually-exclusive paths:
    //
    // 1. `localIcons` OFF (default): `.vue` files try the SFC pipeline first —
    //    `@vue/compiler-sfc` parses `<script setup>` + `<template>` and rewrites
    //    static `<Icon name="..." />` into single-icon components. If nothing
    //    qualifies it falls through to the plain import rewriting below.
    //    The cheap pre-filter avoids loading the (large) SFC parser for
    //    icon-free files.
    //
    // 2. `localIcons` ON: the whole file (any extension, including `.vue`) is
    //    handled by the string-masked tag scanner below, which also recognises
    //    `<t-icon>` wrapper tags (`aliases`) and globally-registered icons.
    //    The SFC pipeline is skipped so the two paths never double-rewrite the
    //    same file.
    if (!config.localIcons && /\.vue$/.test(id ?? '') && (code.includes(config.packageName) || /<Icon\b/.test(code))) {
      const sfcResult = await transformSfc(code, id!)
      if (sfcResult) return sfcResult
    }

    const stmts =
      imports.length > 0
        ? imports.map((imp) => ({ start: imp.ss, end: imp.se, n: imp.n }))
        : [...code.matchAll(/import\s*\{[^}]*\}\s*from\s*['"]([^'"]+)['"]/g)].map(
            (m) => ({ start: m.index!, end: m.index! + m[0].length, n: m[1]! }),
          )

    // When `localIcons` is enabled we also rewrite `<Icon name="xxx" />`
    // (the svg-sprite `Icon` that would otherwise load the CDN sprite) into
    // the deep single-icon component `<XxxIcon />` so it renders offline.
    // Collect the local names under which the barrel `Icon` is imported first.
    let iconLocalNames: string[] = []
    if (config.localIcons) {
      for (const stmt of stmts) {
        if (stmt.n !== config.packageName) continue
        const statement = code.slice(stmt.start, stmt.end)
        const specifierMatch = statement.match(/\{([\s\S]*)\}/)
        if (!specifierMatch) continue
        for (const spec of specifierMatch[1]!.split(',').map((n) => n.trim()).filter(Boolean)) {
          const [original, alias] = spec.split(/\s+as\s+/)
          // The tag rewrite targets the barrel `Icon` export (always) plus any
          // extra barrel exports referenced by `aliases` (e.g. a component
          // library wrapper re-export mapped to `<t-icon>`).
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

    // Collect `<Icon name="xxx" />` usages so they can be rewritten to deep
    // single-icon components when `localIcons` is enabled. This runs when a
    // barrel `Icon` binding exists OR when alias tags (e.g. `t-icon`) are
    // configured — a component library may register `t-icon` globally without
    // an explicit `import { Icon }` in the same file.
    const iconUsages: IconUsage[] = []
    const iconStillUsed = new Set<string>()
    const hasAliasTags = config.aliases ? Object.keys(config.aliases).length > 0 : false
    if (config.localIcons && (iconLocalNames.length || hasAliasTags)) {
      const collected = collectIconUsages(code, iconLocalNames, config.aliases, loadManifestByName())
      iconUsages.push(...collected.usages)
      for (const name of collected.stillUsed) iconStillUsed.add(name)
    }

    const usedIconKeys = new Set<string>()
    for (const stmt of stmts) {
      if (stmt.n !== config.packageName) continue

      const statement = code.slice(stmt.start, stmt.end)
      // `export { X } from 'pkg'` is a re-export (also reported by the lexer as
      // an import); it must keep the `export` keyword, otherwise the module
      // silently stops re-exporting the icon.
      const isReExport = /^export\b/.test(statement)
      // Collect `{ ... }` named specifiers from the import statement
      const specifierMatch = statement.match(/\{([\s\S]*)\}/)
      if (!specifierMatch) continue

      const specifiers = specifierMatch[1]!
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)

      // Type-only specifiers (`import type { X }`, `import { type X }`,
      // `export type { X }`) must be kept as-is — the deep module is a JS
      // value module, rewriting it into a value import/export would change TS
      // semantics and can break under `isolatedModules`.
      if (/^import\s+type\b|^export\s+type\b|\btype\s+[A-Za-z_$]/.test(statement)) continue

      const iconSpecs: { original: string; local: string; stem: string }[] = []
      const barrelSpecifiers: string[] = []
      const inStatement = new Set<string>()
      const aliasBarrel = config.aliases ? Object.values(config.aliases) : []
      // Barrel exports whose tags can be rewritten by `localIcons`: always
      // `Icon`, plus anything referenced by `aliases`.
      const rewritableBarrel = ['Icon', ...aliasBarrel]
      for (const name of specifiers) {
        const [original, alias] = name.split(/\s+as\s+/)
        const local = alias ? alias.trim() : original
        // If `localIcons` fully rewrote every `<Icon ...>` reference, drop the
        // now-unused barrel `Icon` import so the CDN-sprite module is tree-shaken.
        if (config.localIcons && rewritableBarrel.includes(original) && !iconStillUsed.has(local)) {
          continue
        }
        if (!original || !exportMap.has(original)) {
          barrelSpecifiers.push(name)
          continue
        }
        const stem = exportMap.get(original)!
        const key = `${local}@${stem}`
        // Deduplicate repeated specifiers inside one statement and record the
        // deep import key so the `localIcons` inject pass can reuse it.
        if (inStatement.has(key)) continue
        inStatement.add(key)
        usedIconKeys.add(key)
        iconSpecs.push({ original, local, stem })
      }

      if (!iconSpecs.length && !barrelSpecifiers.length) {
        // Whole statement became empty (e.g. only `Icon` was imported and it
        // was dropped because `localIcons` rewrote every usage) — remove it.
        s.remove(stmt.start, stmt.end)
        changed = true
        continue
      }
      if (!iconSpecs.length) continue

      const lines: string[] = []
      if (isReExport) {
        // Keep the remaining barrel specifiers as a re-export, then rewrite
        // each icon into a deep re-export (`export { default as X } from ...`)
        // so the module keeps exporting the icon under the same name.
        if (barrelSpecifiers.length) {
          lines.push(`export { ${barrelSpecifiers.join(', ')} } from '${config.packageName}'`)
        }
        for (const { local, stem } of iconSpecs) {
          lines.push(
            `export { default as ${local} } from '${config.packageName}/${config.componentDir}/${stem}.js'`,
          )
        }
      } else {
        if (barrelSpecifiers.length) {
          lines.push(`import { ${barrelSpecifiers.join(', ')} } from '${config.packageName}'`)
        }
        for (const { local, stem } of iconSpecs) {
          lines.push(
            `import ${local} from '${config.packageName}/${config.componentDir}/${stem}.js'`,
          )
        }
      }
      s.overwrite(stmt.start, stmt.end, lines.join('\n'))
      changed = true
    }

    // Rewrite `<Icon name="xxx" />` into `<XxxIcon />` and inject the deep
    // imports for the referenced icons (keeps the app fully offline).
    // New imports are appended after the last existing import statement (or
    // inside the `<script>` block for `.vue` SFCs) so the output stays valid.
    const injectPos = findInjectPosition(code, stmts)
    const injectBuffer: string[] = []
    for (const usage of iconUsages) {
      const component = usage.component
      const key = `${component}@${usage.stem}`
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

    if (injectBuffer.length) {
      const sep = /\n$/.test(code.slice(0, injectPos)) ? '' : '\n'
      s.appendLeft(injectPos, `${sep}${injectBuffer.join('\n')}\n`)
      changed = true
    }

    if (!changed) return null
    return {
      code: s.toString(),
      map: s.generateMap({ hires: true }),
    }
  }

  return { transform, loadManifest }
}

/**
 * Match a `name="..."` / `name='...'` attribute value inside a tag's
 * attribute string. Returns the raw quoted value (e.g. `sneer`).
 */
const NAME_ATTR_RE = /(?:^|\s)name\s*=\s*['"]([^'"]+)['"]/

/** Lowercase the first letter: `Icon` → `icon`, `TIcon` → `tIcon`. */
function lowerFirst(s: string) {
  return s ? s[0]!.toLowerCase() + s.slice(1) : s
}

/**
 * Return a copy of `code` (same length) where the contents of string literals,
 * template literals, line/block comments and HTML comments are replaced with
 * spaces. This lets the tag scanner skip `<Icon ...>` that appears inside a
 * string or comment instead of being a real component usage.
 *
 * Quotes inside a `<tag ...>` are treated as attribute delimiters (kept as-is)
 * so `name="sneer"` survives — the caller re-extracts the real attribute
 * text from the original `code` via the matched indices.
 */
function maskStringsAndComments(code: string): string {
  const chars = code.split('')
  const n = chars.length
  let i = 0
  let inTag = false
  let inString: string | null = null
  let inLineComment = false
  let inBlockComment = false
  let inHtmlComment = false

  const maskRange = (start: number, end: number) => {
    for (let j = Math.max(0, start); j < Math.min(n, end); j++) {
      if (chars[j] !== '\n') chars[j] = ' '
    }
  }

  while (i < n) {
    const c = chars[i]
    const next = i + 1 < n ? chars[i + 1] : ''
    const after2 = i + 2 < n ? chars[i + 2] : ''
    const after3 = i + 3 < n ? chars[i + 3] : ''

    if (!inString) {
      // Line comment `// ...`
      if (inLineComment) {
        if (c === '\n') inLineComment = false
        else chars[i] = ' '
        i++
        continue
      }
      // Block comment `/* ... */`
      if (inBlockComment) {
        if (c === '*' && next === '/') {
          chars[i] = ' '
          chars[i + 1] = ' '
          inBlockComment = false
          i += 2
        } else {
          chars[i] = ' '
          i++
        }
        continue
      }
      // HTML comment `<!-- ... -->` (Vue SFC templates)
      if (inHtmlComment) {
        if (c === '-' && next === '-' && after2 === '>') {
          maskRange(i, i + 3)
          inHtmlComment = false
          i += 3
        } else {
          chars[i] = ' '
          i++
        }
        continue
      }
      if (c === '/' && next === '/') {
        chars[i] = ' '
        chars[i + 1] = ' '
        inLineComment = true
        i += 2
        continue
      }
      if (c === '/' && next === '*') {
        chars[i] = ' '
        chars[i + 1] = ' '
        inBlockComment = true
        i += 2
        continue
      }
      if (c === '<' && next === '!' && after2 === '-' && after3 === '-') {
        inHtmlComment = true
        i += 4
        continue
      }
    }

    // String / template literal (outside of a tag's attribute area)
    if (!inString && !inTag && (c === '"' || c === "'" || c === '`')) {
      inString = c
      chars[i] = ' '
      i++
      continue
    }
    if (inString) {
      chars[i] = ' '
      if (c === '\\' && i + 1 < n) {
        chars[i + 1] = ' '
        i += 2
        continue
      }
      if (c === inString) inString = null
      i++
      continue
    }

    // Track `<tag ...>` regions so quotes inside are treated as attributes.
    if (c === '<' && /[A-Za-z!/]/.test(next || ' ')) {
      inTag = true
      i++
      continue
    }
    if (c === '>' && inTag) {
      inTag = false
      i++
      continue
    }
    i++
  }

  return chars.join('')
}

/**
 * Decide where to inject new `import` lines:
 * - inside the `<script>` block of a `.vue` SFC (after its opening tag);
 * - otherwise after the last existing import statement;
 * - else at the very start of the file.
 */
function findInjectPosition(code: string, stmts: { start: number; end: number }[]): number {
  const scriptMatch = /<script[^>]*>/g.exec(code)
  if (scriptMatch) {
    return scriptMatch.index + scriptMatch[0].length
  }
  if (stmts.length) {
    let end = -1
    for (const stmt of stmts) {
      if (stmt.end > end) end = stmt.end
    }
    return end
  }
  return 0
}

interface IconUsageCollection {
  usages: IconUsage[]
  /** Local names that still have (non-convertible) `<Icon ...>` references. */
  stillUsed: Set<string>
}

function collectIconUsages(
  code: string,
  localNames: string[],
  aliases: Record<string, string>,
  byName: Map<string, string>,
): IconUsageCollection {
  const usages: IconUsage[] = []
  // A local name starts out "used" and is only cleared when a concrete
  // `<Xxx name="...">` usage of it is rewritten to a deep component.
  const stillUsed = new Set<string>(localNames)

  // In Vue templates an imported PascalCase component can be used as
  // `<Icon>`, `<icon>` or `<t-icon>` — accept those variants for each local
  // name so the tag gets rewritten regardless of casing.
  const accepted = new Set<string>()
  const canonicalOf = new Map<string, string>()
  for (const name of localNames) {
    accepted.add(name)
    accepted.add(lowerFirst(name))
    // PascalCase → kebab-case (`Icon` → `icon`, `MyIcon` → `my-icon`)
    accepted.add(
      name
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase(),
    )
    for (const variant of accepted) canonicalOf.set(variant, name)
  }

  // Extra convenience tags that wrap the barrel `Icon` component — e.g.
  // `<t-icon name="sneer" />` from a component library that re-exports
  // TDesign `Icon` under a short alias. The tag maps to the barrel local
  // name (usually `Icon`).
  //
  // A tag is NOT overridden if a local binding already produces it as a
  // kebab-case variant (e.g. `import { Icon as TIcon }` → `<t-icon>`), so the
  // still-used tracking stays attached to the real local binding.
  for (const [tag, barrelLocal] of Object.entries(aliases ?? {})) {
    if (!canonicalOf.has(tag)) {
      accepted.add(tag)
      canonicalOf.set(tag, barrelLocal)
    }
  }

  // Match any `<Icon ...>` / `<icon ...>` / `<Icon ... />` opening tag.
  // Group 1 = tag name, group 2 = attribute string (excluding the final `>`).
  // We scan a "masked" copy of the code where string literals, template
  // literals and comments are blanked out, so `<Icon name="..." />` inside a
  // string/comment is never mistaken for a real component usage.
  const tagRe = /<([A-Za-z][\w-]*)\b([^>]*)>/g
  const masked = maskStringsAndComments(code)
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(masked))) {
    const tagName = m[1]
    if (!accepted.has(tagName)) continue
    const canonical = canonicalOf.get(tagName)!

    // Re-extract the real attribute text from the original code (the masked
    // copy blanked out the string contents, but the indices are unchanged).
    const attrStart = m.index + (m[0].length - m[2].length)
    const attrsRaw = code.slice(attrStart, m.index + m[0].length - 1)
    const nameMatch = NAME_ATTR_RE.exec(attrsRaw)
    if (!nameMatch) {
      // No static `name="..."` — e.g. `<Icon />` or `:name`/`name={expr}`.
      stillUsed.add(canonical)
      continue
    }
    const iconName = nameMatch[1]
    const component = byName.get(iconName)
    if (!component) {
      stillUsed.add(canonical)
      continue
    }
    // This usage is convertible — the local name may become unused.
    stillUsed.delete(canonical)
    const selfClosing = /\/>\s*$/.test(m[0]) || /\/\s*>$/.test(m[0])
    const openTagStart = m.index
    const openTagEnd = m.index + m[0].length

    // Strip the `name="..."` attribute from the tag so the component keeps
    // its remaining props (e.g. `size`, `onClick`). For self-closing tags the
    // trailing ` /` is removed too (the transform re-appends it).
    let attrs = attrsRaw.replace(NAME_ATTR_RE, '').replace(/\s*\/\s*$/, '')
    // Normalize leftover whitespace (e.g. `  size="x"` → ` size="x"`).
    attrs = attrs.replace(/^\s+/, ' ').replace(/\s+$/, '')

    let closeTagStart = -1
    let closeTagEnd = -1
    if (!selfClosing) {
      // Find the matching closing tag `</Icon>` (or `</icon>`) — search the
      // masked copy so a `</Icon>` inside a string/comment is not matched.
      const closeRe = new RegExp(`</${tagName}\s*>`, 'g')
      closeRe.lastIndex = openTagEnd
      const closeMatch = closeRe.exec(masked)
      if (closeMatch) {
        closeTagStart = closeMatch.index
        closeTagEnd = closeMatch.index + closeMatch[0].length
      }
    }

    usages.push({
      component,
      stem: iconName,
      attrs,
      selfClosing,
      openTagStart,
      openTagEnd,
      closeTagStart,
      closeTagEnd,
    })
  }

  return { usages, stillUsed }
}

function requireManifest(packageName: string) {
  const candidates = [
    packageName,
    `${packageName}/esm/manifest.js`,
    `${packageName}/lib/manifest.js`,
  ]
  for (const candidate of candidates) {
    try {
      return nodeRequire(candidate)
    } catch {
      // try next
    }
  }
  throw new Error(
    `[unplugin-tdesign-icons] Failed to load manifest from "${packageName}". ` +
      `Please make sure "${packageName}" is installed in your project.`,
  )
}

const frameworkConfigs: Record<
  Framework,
  Omit<FrameworkConfig, 'includeSource' | 'localIcons' | 'aliases'>
> = {
  vue: {
    framework: 'vue',
    packageName: 'tdesign-icons-vue',
    componentDir: 'esm/components',
  },
  'vue-next': {
    framework: 'vue-next',
    packageName: 'tdesign-icons-vue-next',
    componentDir: 'esm/components',
  },
  react: {
    framework: 'react',
    packageName: 'tdesign-icons-react',
    componentDir: 'esm/components',
  },
  'web-components': {
    framework: 'web-components',
    packageName: 'tdesign-icons-web-components',
    componentDir: 'esm/components',
  },
}

export const unpluginFactory = (options: Options = {}) => {
  const resolved: ResolvedOptions = {
    framework: options.framework ?? 'vue-next',
    packageName: options.packageName,
    localIcons: options.localIcons ?? false,
    // TDesign Vue 组件库把 `Icon` 封装为 `<t-icon>`（全局注册），默认识别它；
    // 用户可传入 `aliases` 自定义其它封装标签。React/Web Components 无此约定。
    aliases:
      options.aliases ??
      (options.framework === 'vue' || options.framework === 'vue-next'
        ? { 't-icon': 'Icon' }
        : {}),
    includeSource: options.includeSource ?? [],
    exclude: options.exclude ?? [/node_modules/],
  }

  const frameworks: Framework[] = [resolved.framework]

  const transformers = frameworks.map((framework) => {
    const base = frameworkConfigs[framework]
    const config: FrameworkConfig = {
      ...base,
      packageName: resolved.packageName ?? base.packageName,
      includeSource: resolved.includeSource,
      localIcons: resolved.localIcons,
      aliases: resolved.aliases,
    }
    return createTransformer(config)
  })

  const fileExtensionRe = /\.(j|t)sx?$|\.vue$|\.mjs$/

  return {
    name: 'unplugin-tdesign-icons',
    enforce: 'pre' as const,
    transformInclude(id: string) {
      if (!fileExtensionRe.test(id)) return false
      if (resolved.exclude.some((re) => (re instanceof RegExp ? re.test(id) : id.includes(re)))) {
        return false
      }
      if (
        resolved.includeSource.length &&
        !resolved.includeSource.some((s) => id.includes(s))
      ) {
        return false
      }
      return true
    },
    async transform(code: string, id: string) {
      await init
      for (const transformer of transformers) {
        const result = await transformer.transform(code, id)
        if (result) return result
      }
      return null
    },
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
