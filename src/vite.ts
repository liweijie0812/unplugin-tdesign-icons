import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * Build a Vite plugin factory pre-bound to a framework.
 * The framework is fixed by the entry, so the `framework` option is ignored.
 */
function frameworkVite(framework: Framework) {
  return /* #__PURE__ */ createUnplugin((options: Options | undefined = {}) =>
    unpluginFactory(framework, options),
  ).vite
}

/**
 * Framework-specific Vite plugin factories.
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
