import { createRspackPlugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * Build a Rspack plugin factory pre-bound to a framework.
 * The framework is fixed by the entry, so the `framework` option is ignored.
 */
function frameworkRspack(framework: Framework) {
  return /* #__PURE__ */ createRspackPlugin((options: Options | undefined = {}) =>
    unpluginFactory(framework, options),
  )
}

/**
 * Framework-specific Rspack plugin factories.
 *
 * ```js
 * const { TDesignIconsReact } = require('unplugin-tdesign-icons/rspack')
 * ```
 */
export const TDesignIconsVue = frameworkRspack('vue')
export const TDesignIconsVueNext = frameworkRspack('vue-next')
export const TDesignIconsReact = frameworkRspack('react')
export const TDesignIconsWebComponents = frameworkRspack('web-components')
