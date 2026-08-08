import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core'

/**
 * Webpack plugin entry.
 *
 * ```js
 * const TdesignIcons = require('unplugin-tdesign-icons/webpack')
 * ```
 */
const webpack = createUnplugin(unpluginFactory).webpack

export default webpack
export { webpack as 'module.exports' }
