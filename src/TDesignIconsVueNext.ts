import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core'

/**
 * Entry for `tdesign-icons-vue-next` (Vue 3).
 *
 * ```ts
 * import TDesignIconsVueNext from 'unplugin-tdesign-icons/TDesignIconsVueNext'
 * ```
 */
const TDesignIconsVueNext = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default TDesignIconsVueNext
export { TDesignIconsVueNext as 'module.exports' }
