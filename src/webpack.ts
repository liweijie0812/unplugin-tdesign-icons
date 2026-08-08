import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core'
import type { Framework, Options } from './types'

/**
 * Build a Webpack plugin factory pre-bound to a framework.
 */
function frameworkWebpack(framework: Framework) {
  return /* #__PURE__ */ createUnplugin((options: Options | undefined = {}) =>
    unpluginFactory({ ...options, framework: options?.framework ?? framework }),
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

const webpack = createUnplugin(unpluginFactory).webpack

Object.assign(webpack, {
  TDesignIconsVue,
  TDesignIconsVueNext,
  TDesignIconsReact,
  TDesignIconsWebComponents,
})

export default webpack
export { webpack as 'module.exports' }
