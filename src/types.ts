/**
 * 要优化的 TDesign 图标包。
 * - `'vue'`            → `tdesign-icons-vue`（Vue 2）
 * - `'vue-next'`       → `tdesign-icons-vue-next`（Vue 3）
 * - `'react'`          → `tdesign-icons-react`（React）
 * - `'web-components'` → `tdesign-icons-web-components`（Web Components）
 */
export type Framework = 'vue' | 'vue-next' | 'react' | 'web-components'

/**
 * 插件选项。各构建工具子路径下的具名工厂已绑定到对应框架，
 * 因此框架本身并不是用户侧可配置的选项。
 */
export interface Options {
  /**
   * 在构建期把 `<Icon name="xxx" />`（默认会从 CDN 加载 iconfont 的
   * svg-sprite `Icon` 组件）改写成对应的深层单图标组件 `<XxxIcon />`。
   *
   * 这样图标会使用本地打包的 SVG 数据渲染，在无法访问 CDN sprite
   *（`https://tdesign.gtimg.com/...`）的离线 / 内网环境中也能正常工作。
   *
   * @default false
   */
  localIcons?: boolean
  /**
   * 映射到桶 `Icon` 组件的额外标签名，让 `localIcons` 在构建期也能改写
   * `<t-icon name="xxx" />` 这类封装标签。
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
  localIcons: boolean
  aliases: Record<string, string>
  includeSource: string[]
  exclude: (string | RegExp)[]
}

export interface FrameworkConfig {
  framework: Framework
  packageName: string
  componentDir: 'esm/components'
  includeSource: string[]
  localIcons: boolean
  aliases: Record<string, string>
}

export type TransformResult =
  | { code: string; map?: any }
  | null
  | undefined
  | void
