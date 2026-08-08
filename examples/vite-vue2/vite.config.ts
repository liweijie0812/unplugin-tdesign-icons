import vue2 from '@vitejs/plugin-vue2'
import { defineConfig } from 'vite'
import TDesignIconsVue from 'unplugin-tdesign-icons/TDesignIconsVue'

export default defineConfig({
  plugins: [
    vue2(),
    // Rewrite `import { CloseIcon } from 'tdesign-icons-vue'` into the
    // deep import of the single icon module at build time.
    TDesignIconsVue.vite(),
  ],
})
