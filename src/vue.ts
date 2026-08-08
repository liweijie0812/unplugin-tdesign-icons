import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core'

/**
 * Vite / Rollup / Webpack / esbuild plugin that rewrites
 * `import { CloseIcon } from 'tdesign-icons-vue-next'` into a deep import of
 * the single icon module (`tdesign-icons-vue-next/esm/components/close.js`).
 */
export default /* #__PURE__ */ createUnplugin(unpluginFactory)
