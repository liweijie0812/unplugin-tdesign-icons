import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Options } from './types.ts'

/**
 * Entry for `tdesign-icons-vue-next` (Vue 3).
 *
 * ```ts
 * import TDesignIconsVueNext from 'unplugin-tdesign-icons/TDesignIconsVueNext'
 * ```
 *
 * The framework is fixed to `vue-next` by this entry, so there is no
 * `framework` option.
 */
const TDesignIconsVueNext = /* #__PURE__ */ createUnplugin((options: Options = {}) => {
  return unpluginFactory('vue-next', options)
})

export default TDesignIconsVueNext
export { TDesignIconsVueNext as 'module.exports' }
