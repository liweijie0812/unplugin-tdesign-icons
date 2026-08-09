import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * Build a Webpack plugin factory pre-bound to a framework.
 * The framework is fixed by the entry, so the `framework` option is ignored.
 */
function frameworkWebpack(framework: Framework) {
  return /* #__PURE__ */ createUnplugin((options: Options | undefined = {}) =>
    unpluginFactory(framework, options),
  ).webpack
}

/**
 * Framework-specific Webpack plugin factories.
 *
 * ```js
 * const { TDesignIconsVueNext } = require('unplugin-tdesign-icons/webpack')
 * ```
 */
export const TDesignIconsVue = frameworkWebpack('vue')
export const TDesignIconsVueNext = frameworkWebpack('vue-next')
export const TDesignIconsReact = frameworkWebpack('react')
export const TDesignIconsWebComponents = frameworkWebpack('web-components')
