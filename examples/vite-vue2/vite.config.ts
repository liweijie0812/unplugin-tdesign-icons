import vue2 from '@vitejs/plugin-vue2'
import { defineConfig } from 'vite'
// unplugin-icons 风格：`/vite` 子路径的默认导出就是插件工厂，直接 `Icons()` 调用
import Icons from 'unplugin-tdesign-icons/vite'

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
    Icons({ framework: 'vue' }),
  ],
})
