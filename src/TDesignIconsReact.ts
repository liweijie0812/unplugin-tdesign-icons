import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Options } from './types.ts'

/**
 * `tdesign-icons-react`（React）的入口。
 *
 * ```ts
 * import TDesignIconsReact from 'unplugin-tdesign-icons/TDesignIconsReact'
 * ```
 *
 * 该入口把框架固定为 `react`，因此无需再传 `framework` 选项。
 */
const TDesignIconsReact = /* #__PURE__ */ createUnplugin((options: Options = {}) => {
  // 调用统一的工厂函数，并把框架固定为 react
  return unpluginFactory('react', options)
})

export default TDesignIconsReact
export { TDesignIconsReact as 'module.exports' }
