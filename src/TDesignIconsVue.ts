import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Options } from './types.ts'

/**
 * Entry for `tdesign-icons-vue` (Vue 2).
 *
 * ```ts
 * import TDesignIconsVue from 'unplugin-tdesign-icons/TDesignIconsVue'
 * ```
 */
const TDesignIconsVue = /* #__PURE__ */ createUnplugin((options: Options = {}) => {
  return unpluginFactory({ ...options, framework: options.framework ?? 'vue' })
})

export default TDesignIconsVue
export { TDesignIconsVue as 'module.exports' }
