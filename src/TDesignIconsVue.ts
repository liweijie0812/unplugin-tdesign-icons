import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Options } from './types.ts'

/**
 * Entry for `tdesign-icons-vue` (Vue 2).
 *
 * ```ts
 * import TDesignIconsVue from 'unplugin-tdesign-icons/TDesignIconsVue'
 * ```
 *
 * The framework is fixed to `vue` by this entry, so there is no
 * `framework` option.
 */
const TDesignIconsVue = /* #__PURE__ */ createUnplugin((options: Options = {}) => {
  return unpluginFactory('vue', options)
})

export default TDesignIconsVue
export { TDesignIconsVue as 'module.exports' }
