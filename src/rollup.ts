import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * Build a Rollup plugin factory pre-bound to a framework.
 */
function frameworkRollup(framework: Framework) {
  return /* #__PURE__ */ createUnplugin((options: Options | undefined = {}) =>
    unpluginFactory({ ...options, framework: options?.framework ?? framework }),
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

const rollup = createUnplugin(unpluginFactory).rollup

Object.assign(rollup, {
  TDesignIconsVue,
  TDesignIconsVueNext,
  TDesignIconsReact,
  TDesignIconsWebComponents,
})

export default rollup
export { rollup as 'module.exports' }
