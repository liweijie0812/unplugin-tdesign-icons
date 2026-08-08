import vue2 from '@vitejs/plugin-vue2'
import { defineConfig } from 'vite'
import TDesignIconsVue from 'unplugin-tdesign-icons/TDesignIconsVue'

export default defineConfig({
  server: {
    // CNB 云原生开发环境端口预览要求服务监听 0.0.0.0，
    // 并放行代理域名（如 *.cnb.run）的 Host 校验，否则 dev server 无法访问。
    host: true,
    allowedHosts: true,
  },
  plugins: [
    vue2(),
    // Rewrite `import { CloseIcon } from 'tdesign-icons-vue'` into the
    // deep import of the single icon module at build time.
    TDesignIconsVue.vite(),
  ],
})
