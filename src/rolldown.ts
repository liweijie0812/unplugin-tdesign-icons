import { createRolldownPlugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * Build a Rolldown plugin factory pre-bound to a framework.
 * The framework is fixed by the entry, so the `framework` option is ignored.
 */
function frameworkRolldown(framework: Framework) {
  return /* #__PURE__ */ createRolldownPlugin((options: Options | undefined = {}) =>
    unpluginFactory(framework, options),
  )
}

/**
 * Framework-specific Rolldown plugin factories.
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
