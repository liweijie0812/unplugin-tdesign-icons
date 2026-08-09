import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * Build an esbuild plugin factory pre-bound to a framework.
 * The framework is fixed by the entry, so the `framework` option is ignored.
 */
function frameworkEsbuild(framework: Framework) {
  return /* #__PURE__ */ createUnplugin((options: Options | undefined = {}) =>
    unpluginFactory(framework, options),
  ).esbuild
}

/**
 * Framework-specific esbuild plugin factories.
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
