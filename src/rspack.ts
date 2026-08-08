import { createRspackPlugin } from 'unplugin'
import { unpluginFactory } from './core.ts'

/**
 * Rspack plugin entry.
 *
 * ```js
 * const TdesignIcons = require('unplugin-tdesign-icons/rspack')
 * ```
 */
const rspack = createRspackPlugin(unpluginFactory)

export default rspack
export { rspack as 'module.exports' }
