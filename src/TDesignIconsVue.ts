import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Options } from './types.ts'

/**
 * `tdesign-icons-vue`（Vue 2）的入口。
 *
 * ```ts
 * import TDesignIconsVue from 'unplugin-tdesign-icons/TDesignIconsVue'
 * ```
 *
 * 该入口把框架固定为 `vue`，因此无需再传 `framework` 选项。
 */
const TDesignIconsVue = /* #__PURE__ */ createUnplugin((options: Options = {}) => {
  // 调用统一的工厂函数，并把框架固定为 vue
  return unpluginFactory('vue', options)
})

export default TDesignIconsVue
export { TDesignIconsVue as 'module.exports' }
