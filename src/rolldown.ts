import { createRolldownPlugin } from 'unplugin'
import { unpluginFactory } from './core.ts'

/**
 * Rolldown plugin entry.
 *
 * ```ts
 * import TdesignIcons from 'unplugin-tdesign-icons/rolldown'
 * ```
 */
const rolldown = createRolldownPlugin(unpluginFactory)

export default rolldown
export { rolldown as 'module.exports' }
