import { requireManifest } from './module-require.ts'

export interface ManifestData {
  exportMap: Map<string, string>
  nameToStem: Map<string, string>
  stemToIcon: Map<string, string>
}

/**
 * 加载并解析图标包的 manifest，构建三个索引：
 * - `exportMap`：桶导出名（如 `CloseIcon`）→ 深层模块名 stem（如 `close`）
 * - `nameToStem`：图标名（PascalCase / kebab-case / 小写 stem）→ stem
 * - `stemToIcon`：stem → 图标名（PascalCase）
 */
export function loadManifest(packageName: string): ManifestData {
  const manifestModule = requireManifest(packageName)
  // manifest 可能挂在模块的 `manifest` 字段，也可能是 default 导出下的字段
  const items = manifestModule.manifest ?? manifestModule.default?.manifest ?? []
  const exportMap = new Map<string, string>()
  const nameToStem = new Map<string, string>()
  const stemToIcon = new Map<string, string>()
  for (const item of Array.isArray(items) ? items : []) {
    if (item && typeof item.stem === 'string' && typeof item.icon === 'string') {
      // 桶（`pkg/esm/index.js`）会把每个图标导出为 `manifest.icon + 'Icon'`，
      // 例如 `manifest.icon === 'Close'`  →  `export { default as CloseIcon }`。
      // 少数图标名本身已以 `Icon` 结尾（如 `FileIcon`、`Icon`），会得到
      // `FileIconIcon` / `IconIcon` —— 与桶的真实导出名保持一致。
      exportMap.set(`${item.icon}Icon`, item.stem)
      // 反向索引：用于在 Vue SFC 模板中解析 `<Icon name="...">`：
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
 * `<Icon name="...">` → 深层单图标组件名查找表，供 `localIcons` 字符串扫描器使用。
 * 同时接受小写 stem（`sneer`）、PascalCase 图标名（`Chart3D`）以及
 * kebab-case stem（`chart-3d`），并把它们全部解析为桶导出名
 *（`SneerIcon` / `Chart3DIcon`）。
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
