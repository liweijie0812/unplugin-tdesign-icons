import { createRolldownPlugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * Build a Rolldown plugin factory pre-bound to a framework.
 */
function frameworkRolldown(framework: Framework) {
  return /* #__PURE__ */ createRolldownPlugin((options: Options | undefined = {}) =>
    unpluginFactory({ ...options, framework: options?.framework ?? framework }),
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

const rolldown = createRolldownPlugin(unpluginFactory)

Object.assign(rolldown, {
  TDesignIconsVue,
  TDesignIconsVueNext,
  TDesignIconsReact,
  TDesignIconsWebComponents,
})

export default rolldown
export { rolldown as 'module.exports' }
