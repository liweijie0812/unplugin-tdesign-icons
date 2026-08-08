import { defineConfig } from 'vite'
import TDesignIconsWebComponents from 'unplugin-tdesign-icons/TDesignIconsWebComponents'

export default defineConfig({
  plugins: [
    // Rewrite `import { CloseIcon } from 'tdesign-icons-web-components'` into the
    // deep import of the single icon module at build time.
    TDesignIconsWebComponents.vite(),
  ],
})
