import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core'

/**
 * esbuild plugin entry.
 *
 * ```ts
 * import TdesignIcons from 'unplugin-tdesign-icons/esbuild'
 * ```
 */
const esbuild = createUnplugin(unpluginFactory).esbuild

export default esbuild
export { esbuild as 'module.exports' }
