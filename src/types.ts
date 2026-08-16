/**
 * 要优化的 TDesign 图标包。
 * - `'vue'`            → `tdesign-icons-vue`（Vue 2）
 * - `'vue-next'`       → `tdesign-icons-vue-next`（Vue 3）
 * - `'react'`          → `tdesign-icons-react`（React）
 * - `'web-components'` → `tdesign-icons-web-components`（Web Components）
 */
export type Framework = 'vue' | 'vue-next' | 'react' | 'web-components'

export interface LocalIconsOptions {
  /**
   * 构建时下载的 TDesign svg-sprite 脚本地址。默认从当前图标包的
   * `esm/svg-sprite/svg-sprite.js` 中读取 CDN 常量。
   */
  sourceUrl?: string
  /**
   * sprite 脚本在应用构建产物中的文件名。
   * @default 'assets/tdesign-icons.js'
   */
  fileName?: string
  /**
   * 注入到 `Icon` 的 URL 前缀。非根路径部署时应与应用 public base 一致。
   * @default './'
   */
  publicPath?: string
}

export interface ResolvedLocalIconsOptions {
  sourceUrl: string
  fileName: string
  publicPath: string
  url: string
}

/**
 * 插件选项。各构建工具子路径下的具名工厂已绑定到对应框架，
 * 因此框架本身并不是用户侧可配置的选项。
 */
export interface Options {
  /**
   * 构建时下载 TDesign CDN svg-sprite 到应用产物，并把 `<Icon>` / `<t-icon>`
   * 的 `url` 指向本地文件。静态和动态 `name` 均可使用本地 sprite。
   *
   * @default false
   */
  localIcons?: boolean | LocalIconsOptions
  /**
   * 映射到桶 `Icon` 组件的额外标签名，让 `localIcons` 也能为
   * `<t-icon name="xxx" />` 这类封装标签注入本地 sprite URL。
   *
   * Key = 模板中使用的标签（例如 `'t-icon'`），value = 它包装的桶导出名
   *（通常是 `'Icon'`）。当你的组件库把 TDesign `Icon` 封装成便捷标签时很有用。
   *
   * @default `{ 't-icon': 'Icon' }`（vue / vue-next，TDesign Vue 组件库默认）
   */
  aliases?: Record<string, string>
  /**
   * 用于决定哪些文件会被转换的额外路径片段。
   * 默认情况下插件会在所有出现目标图标包导入的位置进行改写
   *（`exclude` 排除的路径除外）。
   */
  includeSource?: string[]
  /**
   * 需要跳过的路径。支持 RegExp 或字符串片段。
   * @default [/node_modules/]
   */
  exclude?: (string | RegExp)[]
}

export interface ResolvedOptions {
  framework: Framework
  localIcons: false | ResolvedLocalIconsOptions
  aliases: Record<string, string>
  includeSource: string[]
  exclude: (string | RegExp)[]
}

export interface FrameworkConfig {
  framework: Framework
  packageName: string
  componentDir: 'esm/components'
  includeSource: string[]
  localIcons: false | ResolvedLocalIconsOptions
  aliases: Record<string, string>
}

export type TransformResult =
  | { code: string; map?: any }
  | null
  | undefined
  | void
