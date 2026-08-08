import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * Build an esbuild plugin factory pre-bound to a framework.
 */
function frameworkEsbuild(framework: Framework) {
  return /* #__PURE__ */ createUnplugin((options: Options | undefined = {}) =>
    unpluginFactory({ ...options, framework: options?.framework ?? framework }),
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

const esbuild = createUnplugin(unpluginFactory).esbuild

Object.assign(esbuild, {
  TDesignIconsVue,
  TDesignIconsVueNext,
  TDesignIconsReact,
  TDesignIconsWebComponents,
})

export default esbuild
export { esbuild as 'module.exports' }
