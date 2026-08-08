import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core'
import type { Framework, Options } from './types'

/**
 * Build a Rolldown plugin factory pre-bound to a framework.
 */
function frameworkRolldown(framework: Framework) {
  return /* #__PURE__ */ createUnplugin((options: Options | undefined = {}) =>
    unpluginFactory({ ...options, framework: options?.framework ?? framework }),
  ).rolldown
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

const rolldown = createUnplugin(unpluginFactory).rolldown

Object.assign(rolldown, {
  TDesignIconsVue,
  TDesignIconsVueNext,
  TDesignIconsReact,
  TDesignIconsWebComponents,
})

export default rolldown
export { rolldown as 'module.exports' }
