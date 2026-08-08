import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core'

/**
 * Rollup plugin entry (unplugin-icons style).
 *
 * ```ts
 * import Icons from 'unplugin-tdesign-icons/rollup'
 *
 * export default { plugins: [Icons()] }
 * ```
 */
const rollup = createUnplugin(unpluginFactory).rollup

export default rollup
export { rollup as 'module.exports' }
