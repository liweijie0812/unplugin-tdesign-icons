import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core'

/**
 * Rollup plugin entry.
 *
 * ```ts
 * import TdesignIcons from 'unplugin-tdesign-icons/rollup'
 * ```
 */
const rollup = createUnplugin(unpluginFactory).rollup

export default rollup
export { rollup as 'module.exports' }
