import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Options } from './types.ts'

/**
 * `tdesign-icons-web-components`（Web Components）的入口。
 *
 * ```ts
 * import TDesignIconsWebComponents from 'unplugin-tdesign-icons/TDesignIconsWebComponents'
 * ```
 *
 * 该入口把框架固定为 `web-components`，因此无需再传 `framework` 选项。
 */
const TDesignIconsWebComponents = /* #__PURE__ */ createUnplugin((options: Options = {}) => {
  // 调用统一的工厂函数，并把框架固定为 web-components
  return unpluginFactory('web-components', options)
})

export default TDesignIconsWebComponents
export { TDesignIconsWebComponents as 'module.exports' }
