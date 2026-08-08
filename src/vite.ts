import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core'

/**
 * Vite plugin entry (unplugin-icons style).
 *
 * ```ts
 * import Icons from 'unplugin-tdesign-icons/vite'
 *
 * export default defineConfig({ plugins: [Icons()] })
 * ```
 */
const vite = createUnplugin(unpluginFactory).vite

export default vite
export { vite as 'module.exports' }
