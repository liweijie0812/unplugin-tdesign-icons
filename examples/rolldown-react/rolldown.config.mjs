import { defineConfig } from 'rolldown'
// 按框架从 `/rolldown` 子路径具名导入插件工厂，直接 `TDesignIconsReact()` 调用
import { TDesignIconsReact } from 'unplugin-tdesign-icons/rolldown'

export default defineConfig({
  input: 'src/main.tsx',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    // Rolldown 原生支持 TSX；通用 Icon 使用输出到 dist 的本地 sprite。
    TDesignIconsReact({ localIcons: { publicPath: './dist/' } }),
  ],
})
