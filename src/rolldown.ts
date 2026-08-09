import { createRolldownPlugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * 构建一个已绑定到指定框架的 Rolldown 插件工厂。
 * 框架由入口固定，因此 `framework` 选项会被忽略。
 */
function frameworkRolldown(framework: Framework) {
  return /* #__PURE__ */ createRolldownPlugin((options: Options | undefined = {}) =>
    unpluginFactory(framework, options),
  )
}

/**
 * 各框架对应的 Rolldown 插件工厂。
 *
 * ```ts
 * import { TDesignIconsReact } from 'unplugin-tdesign-icons/rolldown'
 *
 * export default { plugins: [TDesignIconsReact()] }
 * ```
 */
export const TDesignIconsVue = frameworkRolldown('vue')
export const TDesignIconsVueNext = frameworkRolldown('vue-next')
export const TDesignIconsReact = frameworkRolldown('react')
export const TDesignIconsWebComponents = frameworkRolldown('web-components')
