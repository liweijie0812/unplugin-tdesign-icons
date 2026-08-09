import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * 构建一个已绑定到指定框架的 esbuild 插件工厂。
 * 框架由入口固定，因此 `framework` 选项会被忽略。
 */
function frameworkEsbuild(framework: Framework) {
  return /* #__PURE__ */ createUnplugin((options: Options | undefined = {}) =>
    unpluginFactory(framework, options),
  ).esbuild
}

/**
 * 各框架对应的 esbuild 插件工厂。
 *
 * ```ts
 * import { TDesignIconsReact } from 'unplugin-tdesign-icons/esbuild'
 *
 * build({ plugins: [TDesignIconsReact()] })
 * ```
 */
export const TDesignIconsVue = frameworkEsbuild('vue')
export const TDesignIconsVueNext = frameworkEsbuild('vue-next')
export const TDesignIconsReact = frameworkEsbuild('react')
export const TDesignIconsWebComponents = frameworkEsbuild('web-components')
