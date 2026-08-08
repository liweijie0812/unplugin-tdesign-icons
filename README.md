# unplugin-tdesign-icons

> On-demand import of [TDesign Icons](https://github.com/Tencent/tdesign-icons) for **Vue 3** (`tdesign-icons-vue-next`) and **React** (`tdesign-icons-react`).

TDesign 图标库包含 **2354 个图标**，直接从桶入口 `import { CloseIcon } from 'tdesign-icons-vue-next'` 会一次性引入全部图标，导致：

- **开发期**：Vite 预打包生成 **~13.5MB** 的依赖文件（包含全部 2354 个图标），浏览器每次刷新都要拉取/解析，冷启动慢、请求多；
- **构建期**：需要 transform 全部 2354 个模块（实测约 5.6s）。

本插件在**编译期**把具名图标导入自动改写为**单图标深层导入**，只打包实际用到的图标（实测约 16 个模块、0.5s）：

```ts
// 源码（写法不变）
import { CloseIcon } from 'tdesign-icons-vue-next'

// 插件自动改写为
import CloseIcon from 'tdesign-icons-vue-next/esm/components/close.js'
```

## 特性

- 🚀 **按需引入**：只转换显式导入的图标，绝不全量引入；
- 🧩 **双框架**：Vue 3（`tdesign-icons-vue-next`）与 React（`tdesign-icons-react`）；
- 🔌 **多构建工具**：基于 [unplugin](https://github.com/unjs/unplugin)，一套代码支持 Vite / Rollup / Webpack / esbuild / Rspack / Farm 等；
- 🗺️ **零配置映射**：直接从图标包内置的 `esm/manifest.js` 读取 `图标名 ↔ 文件名` 映射，无需手动维护；
- 🛡️ **安全解析**：基于 `es-module-lexer` 精确解析 import 语句，字符串/注释中的伪导入不会被误伤；
- ✂️ **智能混用**：同一行里图标 + 非图标（如 `IconBase`）导入会拆成多条，非图标保留桶导入。

## 安装

```bash
npm i -D unplugin-tdesign-icons
# 按需安装对应图标包
npm i tdesign-icons-vue-next   # Vue 3
npm i tdesign-icons-react      # React
```

## 使用

### Vue 3 + Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import TdesignIcons from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  plugins: [
    vue(),
    TdesignIcons({ framework: 'vue' }), // 默认就是 'vue'，可省略
  ],
})
```

### React + Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import TdesignIcons from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  plugins: [
    react(),
    TdesignIcons({ framework: 'react' }),
  ],
})
```

### 其他构建工具

```ts
// rollup.config.js
import TdesignIcons from 'unplugin-tdesign-icons/rollup'
export default { plugins: [TdesignIcons({ framework: 'vue' })] }

// webpack.config.js
// 子路径入口是 ESM（与 unplugin-icons 一致），CJS 通过 require(esm) 互操作拿到插件函数
const TdesignIcons = require('unplugin-tdesign-icons/webpack')
module.exports = { plugins: [TdesignIcons({ framework: 'vue' })] }

// esbuild.config.js
import { build } from 'esbuild'
import TdesignIcons from 'unplugin-tdesign-icons/esbuild'
build({ plugins: [TdesignIcons({ framework: 'vue' })] })
```

## 示例（Examples）

参考 unplugin-icons，本仓库在 [`examples/`](./examples) 提供了可直接运行的示例工程，覆盖 Vue 3 / React 与 Vite / Webpack 等主流组合：

| 示例 | 说明 |
| --- | --- |
| [`examples/vite-vue3`](./examples/vite-vue3) | Vite + Vue 3，`unplugin-tdesign-icons/vite` |
| [`examples/vite-react`](./examples/vite-react) | Vite + React，`unplugin-tdesign-icons/vite` |
| [`examples/webpack-vue3`](./examples/webpack-vue3) | Webpack 5 + Vue 3，`unplugin-tdesign-icons/webpack`（CJS） |

每个示例都可以 `npm install && npm run dev` / `npm run build` 直接跑起来，详见 [`examples/README.md`](./examples/README.md)。

## 选项

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `framework` | `'vue' \| 'react' \| 'both'` | `'vue'` | 要优化的图标包。`'both'` 用于混合 Vue/React 的 monorepo |
| `packageName` | `string` | 按 framework | 覆盖图标包名（如使用别名时） |
| `includeSource` | `string[]` | `[]` | 只处理路径包含这些片段的文件 |
| `exclude` | `(string \| RegExp)[]` | `[/node_modules/]` | 跳过的路径 |

## 工作原理

1. 用 `es-module-lexer` 精确解析出代码中所有 `import { ... } from 'tdesign-icons-xxx'` 语句；
2. 从图标包内置的 `esm/manifest.js` 构建 `导出名 → 文件名(stem)` 映射（`导出名 = manifest.icon + 'Icon'`）；
3. 把命中的具名导入改写为 `import XxxIcon from 'tdesign-icons-xxx/esm/components/xxx.js'`；
4. 同一语句中的非图标导入（如 `IconBase`、`IconFont`）保留原桶导入。

> ⚠️ 改写后的深层导入带 `.js` 后缀，Node/SSR/严格 ESM 环境下也能正常解析。

## License

MIT
