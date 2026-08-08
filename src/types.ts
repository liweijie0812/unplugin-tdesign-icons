export type Framework = 'vue' | 'react' | 'both'

export interface Options {
  /**
   * Which TDesign icons package(s) to optimize.
   * - `'vue'`   → `tdesign-icons-vue-next`
   * - `'react'` → `tdesign-icons-react`
   * - `'both'`  → rewrite imports from both packages (monorepo / mixed projects)
   *
   * @default 'vue'
   */
  framework?: Framework
  /**
   * Override the icon package name. Useful when you alias the package.
   * @default 'tdesign-icons-vue-next' (or 'tdesign-icons-react' for react)
   */
  packageName?: string
  /**
   * Extra path fragments used to decide which files get transformed.
   * By default the plugin rewrites imports of the target icon package(s)
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
  includeSource: string[]
  exclude: (string | RegExp)[]
}

export interface FrameworkConfig {
  framework: 'vue' | 'react'
  packageName: string
  componentDir: 'esm/components'
  includeSource: string[]
}

export type TransformResult =
  | { code: string; map?: any }
  | null
  | undefined
  | void
