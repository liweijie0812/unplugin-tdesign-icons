import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Options } from './types.ts'

/**
 * Entry for `tdesign-icons-web-components` (Web Components).
 *
 * ```ts
 * import TDesignIconsWebComponents from 'unplugin-tdesign-icons/TDesignIconsWebComponents'
 * ```
 *
 * The framework is fixed to `web-components` by this entry, so there is no
 * `framework` option.
 */
const TDesignIconsWebComponents = /* #__PURE__ */ createUnplugin((options: Options = {}) => {
  return unpluginFactory('web-components', options)
})

export default TDesignIconsWebComponents
export { TDesignIconsWebComponents as 'module.exports' }
