/**
 * Which TDesign icons package to optimize.
 * - `'vue'`            → `tdesign-icons-vue` (Vue 2)
 * - `'vue-next'`       → `tdesign-icons-vue-next` (Vue 3)
 * - `'react'`          → `tdesign-icons-react` (React)
 * - `'web-components'` → `tdesign-icons-web-components` (Web Components)
 */
export type Framework = 'vue' | 'vue-next' | 'react' | 'web-components'

export interface Options {
  /**
   * Which TDesign icons package to optimize.
   *
   * @default 'vue-next'
   */
  framework?: Framework
  /**
   * Override the icon package name. Useful when you alias the package.
   * @default the package mapped from `framework`
   */
  packageName?: string
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
  packageName?: string
  localIcons: boolean
  includeSource: string[]
  exclude: (string | RegExp)[]
}

export interface FrameworkConfig {
  framework: Framework
  packageName: string
  componentDir: 'esm/components'
  includeSource: string[]
  localIcons: boolean
}

export type TransformResult =
  | { code: string; map?: any }
  | null
  | undefined
  | void
