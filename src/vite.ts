import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * 构建一个已绑定到指定框架的 Vite 插件工厂。
 * 框架由入口固定，因此 `framework` 选项会被忽略。
 */
function frameworkVite(framework: Framework) {
  return /* #__PURE__ */ createUnplugin((options: Options | undefined = {}) =>
    unpluginFactory(framework, options),
  ).vite
}

/**
 * 各框架对应的 Vite 插件工厂。
 *
 * ```ts
 * import { TDesignIconsVueNext } from 'unplugin-tdesign-icons/vite'
 *
 * export default defineConfig({ plugins: [TDesignIconsVueNext()] })
 * ```
 */
export const TDesignIconsVue = frameworkVite('vue')
export const TDesignIconsVueNext = frameworkVite('vue-next')
export const TDesignIconsReact = frameworkVite('react')
export const TDesignIconsWebComponents = frameworkVite('web-components')
