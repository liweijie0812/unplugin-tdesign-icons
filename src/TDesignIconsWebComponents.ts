import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Options } from './types.ts'

/**
 * Entry for `tdesign-icons-web-components` (Web Components).
 *
 * ```ts
 * import TDesignIconsWebComponents from 'unplugin-tdesign-icons/TDesignIconsWebComponents'
 * ```
 */
const TDesignIconsWebComponents = /* #__PURE__ */ createUnplugin((options: Options = {}) => {
  return unpluginFactory({
    ...options,
    framework: options.framework ?? 'web-components',
  })
})

export default TDesignIconsWebComponents
export { TDesignIconsWebComponents as 'module.exports' }
