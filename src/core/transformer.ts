import { parse } from 'es-module-lexer'
import { MagicString } from 'magic-string'
import type { FrameworkConfig, TransformResult } from '../types.ts'
import { collectIconUsages, findInjectPosition } from './local-icons.ts'
import { loadManifest, loadManifestByName } from './manifest.ts'
import { transformSfc } from './vue-sfc.ts'

export function createTransformer(config: FrameworkConfig) {
  let manifestData: ReturnType<typeof loadManifest> | null = null

  function cachedLoadManifest() {
    if (manifestData) return manifestData
    manifestData = loadManifest(config.packageName)
    return manifestData
  }

  async function transform(code: string, id?: string): Promise<TransformResult> {
    const { exportMap } = cachedLoadManifest()
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
      const sfcResult = await transformSfc(code, id!, config)
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
    const iconUsages: ReturnType<typeof collectIconUsages>['usages'] = []
    const iconStillUsed = new Set<string>()
    const hasAliasTags = config.aliases ? Object.keys(config.aliases).length > 0 : false
    if (config.localIcons && (iconLocalNames.length || hasAliasTags)) {
      const collected = collectIconUsages(code, iconLocalNames, config.aliases, loadManifestByName(cachedLoadManifest()))
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

  return { transform, loadManifest: cachedLoadManifest }
}
