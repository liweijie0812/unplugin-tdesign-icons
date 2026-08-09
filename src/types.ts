/**
 * Which TDesign icons package to optimize.
 * - `'vue'`            → `tdesign-icons-vue` (Vue 2)
 * - `'vue-next'`       → `tdesign-icons-vue-next` (Vue 3)
 * - `'react'`          → `tdesign-icons-react` (React)
 * - `'web-components'` → `tdesign-icons-web-components` (Web Components)
 */
export type Framework = 'vue' | 'vue-next' | 'react' | 'web-components'

/**
 * Plugin options. Every public entry is bound to one framework
 * (`TDesignIconsVue` / `TDesignIconsVueNext` / `TDesignIconsReact` /
 * `TDesignIconsWebComponents` and the named factories on the build-tool
 * subpaths), so the framework itself is not a user-facing option here.
 */
export interface Options {
  /**
   * Rewrite `<Icon name="xxx" />` (the svg-sprite `Icon` component that
   * loads the CDN iconfont by default) into the corresponding deep
   * single-icon component (`<XxxIcon />`) at build time.
   *
   * This makes the icons render with the locally-bundled SVG data, so they
   * work in offline / intranet environments where the CDN sprite
   * (`https://tdesign.gtimg.com/...`) is unreachable.
   *
   * @default false
   */
  localIcons?: boolean
  /**
   * Extra tag names that map to the barrel `Icon` component, so `localIcons`
   * can also rewrite `<t-icon name="xxx" />` style wrappers at build time.
   *
   * Key = the tag used in templates (e.g. `'t-icon'`), value = the barrel
   * export it wraps (usually `'Icon'`). This is useful when your component
   * library wraps TDesign `Icon` behind a convenience tag.
   *
   * @default `{ 't-icon': 'Icon' }` for vue / vue-next (TDesign Vue 组件库默认)
   */
  aliases?: Record<string, string>
  /**
   * Extra path fragments used to decide which files get transformed.
   * By default the plugin rewrites imports of the target icon package
   * wherever they appear (except `exclude`d paths).
   */
  includeSource?: string[]
  /**
   * Paths to skip. Accepts RegExp or string fragments.
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
