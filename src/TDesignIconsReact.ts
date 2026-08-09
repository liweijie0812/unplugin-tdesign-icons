import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Options } from './types.ts'

/**
 * Entry for `tdesign-icons-react` (React).
 *
 * ```ts
 * import TDesignIconsReact from 'unplugin-tdesign-icons/TDesignIconsReact'
 * ```
 *
 * The framework is fixed to `react` by this entry, so there is no
 * `framework` option.
 */
const TDesignIconsReact = /* #__PURE__ */ createUnplugin((options: Options = {}) => {
  return unpluginFactory('react', options)
})

export default TDesignIconsReact
export { TDesignIconsReact as 'module.exports' }
