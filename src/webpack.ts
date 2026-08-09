import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * 构建一个已绑定到指定框架的 Webpack 插件工厂。
 * 框架由入口固定，因此 `framework` 选项会被忽略。
 */
function frameworkWebpack(framework: Framework) {
  return /* #__PURE__ */ createUnplugin((options: Options | undefined = {}) =>
    unpluginFactory(framework, options),
  ).webpack
}

/**
 * 各框架对应的 Webpack 插件工厂。
 *
 * ```js
 * const { TDesignIconsVueNext } = require('unplugin-tdesign-icons/webpack')
 * ```
 */
export const TDesignIconsVue = frameworkWebpack('vue')
export const TDesignIconsVueNext = frameworkWebpack('vue-next')
export const TDesignIconsReact = frameworkWebpack('react')
export const TDesignIconsWebComponents = frameworkWebpack('web-components')
