import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * 构建一个已绑定到指定框架的 Rollup 插件工厂。
 * 框架由入口固定，因此 `framework` 选项会被忽略。
 */
function frameworkRollup(framework: Framework) {
  return /* #__PURE__ */ createUnplugin((options: Options | undefined = {}) =>
    unpluginFactory(framework, options),
  ).rollup
}

/**
 * 各框架对应的 Rollup 插件工厂。
 *
 * ```ts
 * import { TDesignIconsReact } from 'unplugin-tdesign-icons/rollup'
 *
 * export default { plugins: [TDesignIconsReact()] }
 * ```
 */
export const TDesignIconsVue = frameworkRollup('vue')
export const TDesignIconsVueNext = frameworkRollup('vue-next')
export const TDesignIconsReact = frameworkRollup('react')
export const TDesignIconsWebComponents = frameworkRollup('web-components')
