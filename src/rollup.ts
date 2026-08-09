import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * Build a Rollup plugin factory pre-bound to a framework.
 * The framework is fixed by the entry, so the `framework` option is ignored.
 */
function frameworkRollup(framework: Framework) {
  return /* #__PURE__ */ createUnplugin((options: Options | undefined = {}) =>
    unpluginFactory(framework, options),
  ).rollup
}

/**
 * Framework-specific Rollup plugin factories.
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
