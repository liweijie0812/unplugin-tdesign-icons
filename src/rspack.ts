import { createRspackPlugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * 构建一个已绑定到指定框架的 Rspack 插件工厂。
 * 框架由入口固定，因此 `framework` 选项会被忽略。
 */
function frameworkRspack(framework: Framework) {
  return /* #__PURE__ */ createRspackPlugin((options: Options | undefined = {}) =>
    unpluginFactory(framework, options),
  )
}

/**
 * 各框架对应的 Rspack 插件工厂。
 *
 * ```js
 * const { TDesignIconsReact } = require('unplugin-tdesign-icons/rspack')
 * ```
 */
export const TDesignIconsVue = frameworkRspack('vue')
export const TDesignIconsVueNext = frameworkRspack('vue-next')
export const TDesignIconsReact = frameworkRspack('react')
export const TDesignIconsWebComponents = frameworkRspack('web-components')
