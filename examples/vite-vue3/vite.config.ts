import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
// 按框架从 `/vite` 子路径具名导入插件工厂，直接 `TDesignIconsVueNext()` 调用
import { TDesignIconsVueNext } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  server: {
    // CNB 云原生开发环境端口预览要求服务监听 0.0.0.0，
    // 并放行代理域名（如 *.cnb.run）的 Host 校验，否则 dev server 无法访问。
    host: true,
    allowedHosts: true,
  },
  plugins: [
    vue(),
    // Rewrite `import { CloseIcon } from 'tdesign-icons-vue-next'` into the
    // deep import of the single icon module at build time.
    // localIcons: 额外把 `<Icon name="sneer" />` / `<t-icon name="xxx" />`
    // 改写为 `<SneerIcon />` 等单图标组件，离线渲染、无需 CDN svg-sprite
    //（见 App.vue 底部）。
    TDesignIconsVueNext({ localIcons: true }),
  ],
})
