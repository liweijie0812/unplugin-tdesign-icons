import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Framework, Options } from './types.ts'

/**
 * Build a Vite plugin factory pre-bound to a framework.
 */
function frameworkVite(framework: Framework) {
  return /* #__PURE__ */ createUnplugin((options: Options | undefined = {}) =>
    unpluginFactory({ ...options, framework: options?.framework ?? framework }),
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

const vite = createUnplugin(unpluginFactory).vite

// Attach the framework factories onto the default factory so CJS consumers can
// use both `const Icons = require('unplugin-tdesign-icons/vite')` (callable)
// and `const { TDesignIconsVueNext } = require('unplugin-tdesign-icons/vite')`.
Object.assign(vite, {
  TDesignIconsVue,
  TDesignIconsVueNext,
  TDesignIconsReact,
  TDesignIconsWebComponents,
})

export default vite
export { vite as 'module.exports' }
