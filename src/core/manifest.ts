import { requireManifest } from './module-require.ts'

export interface ManifestData {
  exportMap: Map<string, string>
  nameToStem: Map<string, string>
  stemToIcon: Map<string, string>
}

export function loadManifest(packageName: string): ManifestData {
  const manifestModule = requireManifest(packageName)
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
  return { exportMap, nameToStem, stemToIcon }
}

/**
 * `<Icon name="...">` → deep single-icon component name lookup, used by the
 * `localIcons` string scanner. Accepts the lowercase stem (`sneer`), the
 * PascalCase icon (`Chart3D`) and the kebab-case stem (`chart-3d`), resolving
 * them all to the barrel export name (`SneerIcon` / `Chart3DIcon`).
 */
export function loadManifestByName(data: ManifestData): Map<string, string> {
  const { nameToStem, stemToIcon } = data
  const byName = new Map<string, string>()
  for (const [name, stem] of nameToStem) {
    const iconName = stemToIcon.get(stem) ?? name
    byName.set(name, `${iconName}Icon`)
  }
  return byName
}
