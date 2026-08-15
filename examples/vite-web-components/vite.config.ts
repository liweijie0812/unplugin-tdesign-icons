import { defineConfig } from 'vite'
// 按框架从 `/vite` 子路径具名导入插件工厂，直接 `TDesignIconsWebComponents()` 调用
import { TDesignIconsWebComponents } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  server: {
    // CNB 云原生开发环境端口预览要求服务监听 0.0.0.0，
    // 并放行代理域名（如 *.cnb.run）的 Host 校验，否则 dev server 无法访问。
    host: true,
    allowedHosts: true,
  },
  plugins: [
    // Web Components 的通用 Icon 已内置本地图标 JSON，无需 localIcons sprite。
    TDesignIconsWebComponents(),
  ],
})
