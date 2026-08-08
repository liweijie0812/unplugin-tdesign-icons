import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Options } from './types.ts'

/**
 * Entry for `tdesign-icons-react` (React).
 *
 * ```ts
 * import TDesignIconsReact from 'unplugin-tdesign-icons/TDesignIconsReact'
 * ```
 */
const TDesignIconsReact = /* #__PURE__ */ createUnplugin((options: Options = {}) => {
  return unpluginFactory({ ...options, framework: options.framework ?? 'react' })
})

export default TDesignIconsReact
export { TDesignIconsReact as 'module.exports' }
