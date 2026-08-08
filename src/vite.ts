import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'

/**
 * Vite plugin entry.
 *
 * ```ts
 * import TdesignIcons from 'unplugin-tdesign-icons/vite'
 * ```
 */
const vite = createUnplugin(unpluginFactory).vite

export default vite
export { vite as 'module.exports' }
