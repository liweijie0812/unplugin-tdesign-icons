import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core'
import type { Options } from './types'

/**
 * Vite / Rollup / Webpack / esbuild plugin that rewrites
 * `import { CloseIcon } from 'tdesign-icons-react'` into a deep import of
 * the single icon module (`tdesign-icons-react/esm/components/close.js`).
 */
export default /* #__PURE__ */ createUnplugin((options: Options = {}) => {
  return unpluginFactory({
    ...options,
    framework: options.framework ?? 'react',
  })
})
