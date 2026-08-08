import { createUnplugin } from 'unplugin'
import { init, parse } from 'es-module-lexer'
import { MagicString } from 'magic-string'
import { createRequire } from 'node:module'
import type { Options, ResolvedOptions, FrameworkConfig, Framework, TransformResult } from './types.ts'

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
  let manifest: Map<string, string> | null = null

  function loadManifest(): Map<string, string> {
    if (manifest) return manifest

    const manifestModule = requireManifest(config.packageName)
    const items = manifestModule.manifest ?? manifestModule.default?.manifest ?? []
    const map = new Map<string, string>()
    for (const item of Array.isArray(items) ? items : []) {
      if (item && typeof item.stem === 'string' && typeof item.icon === 'string') {
        // The barrel (`pkg/esm/index.js`) exports each icon as `manifest.icon + 'Icon'`,
        // e.g. `manifest.icon === 'Close'`  →  `export { default as CloseIcon }`.
        // A few icons already end with `Icon` (e.g. `FileIcon`, `Icon`), which yields
        // `FileIconIcon` / `IconIcon` — matching the real barrel export names.
        map.set(`${item.icon}Icon`, item.stem)
      }
    }
    manifest = map
    return map
  }

  function transform(code: string): TransformResult {
    const map = loadManifest()
    const s = new MagicString(code)
    let changed = false

    let imports: readonly import('es-module-lexer').ImportSpecifier[] = []
    try {
      ;[imports] = parse(code)
    } catch {
      // Non-JS content (e.g. raw .vue SFC) can make the lexer throw.
      // Fall back to a permissive regex that only matches plain import statements.
    }

    const stmts =
      imports.length > 0
        ? imports.map((imp) => ({ start: imp.ss, end: imp.se, n: imp.n }))
        : [...code.matchAll(/import\s*\{[^}]*\}\s*from\s*['"]([^'"]+)['"]/g)].map(
            (m) => ({ start: m.index!, end: m.index! + m[0].length, n: m[1]! }),
          )

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
      for (const name of specifiers) {
        const [original, alias] = name.split(/\s+as\s+/)
        const local = alias ? alias.trim() : original
        if (!original || !map.has(original)) {
          barrelSpecifiers.push(name)
          continue
        }
        iconSpecs.push({ original, local, stem: map.get(original)! })
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

    if (!changed) return null
    return {
      code: s.toString(),
      map: s.generateMap({ hires: true }),
    }
  }

  return { transform, loadManifest }
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

const frameworkConfigs: Record<Framework, Omit<FrameworkConfig, 'includeSource'>> = {
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
    async transform(code: string) {
      await init
      for (const transformer of transformers) {
        const result = transformer.transform(code)
        if (result) return result
      }
      return null
    },
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
