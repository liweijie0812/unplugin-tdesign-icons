import { createUnplugin } from 'unplugin'
import { unpluginFactory } from './core.ts'
import type { Options } from './types.ts'

/**
 * `tdesign-icons-vue-next`（Vue 3）的入口。
 *
 * ```ts
 * import TDesignIconsVueNext from 'unplugin-tdesign-icons/TDesignIconsVueNext'
 * ```
 *
 * 该入口把框架固定为 `vue-next`，因此无需再传 `framework` 选项。
 */
const TDesignIconsVueNext = /* #__PURE__ */ createUnplugin((options: Options = {}) => {
  // 调用统一的工厂函数，并把框架固定为 vue-next
  return unpluginFactory('vue-next', options)
})

export default TDesignIconsVueNext
export { TDesignIconsVueNext as 'module.exports' }
