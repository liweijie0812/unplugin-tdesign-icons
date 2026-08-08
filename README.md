# unplugin-tdesign-icons

> On-demand import of [TDesign Icons](https://github.com/Tencent/tdesign-icons) for **Vue 2** (`tdesign-icons-vue`), **Vue 3** (`tdesign-icons-vue-next`), **React** (`tdesign-icons-react`) and **Web Components** (`tdesign-icons-web-components`).

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
- 🧩 **四套框架入口**：Vue 2 / Vue 3 / React / Web Components 各一个分包入口，互不干扰；
- 🔌 **多构建工具**：基于 [unplugin](https://github.com/unjs/unplugin)，一套代码支持 Vite / Rollup / Webpack / esbuild / Rspack / Farm 等；
- 🗺️ **零配置映射**：直接从图标包内置的 `esm/manifest.js` 读取 `图标名 ↔ 文件名` 映射，无需手动维护；
- 🛡️ **安全解析**：基于 `es-module-lexer` 精确解析 import 语句，字符串/注释中的伪导入不会被误伤；
- ✂️ **智能混用**：同一行里图标 + 非图标（如 `IconBase`）导入会拆成多条，非图标保留桶导入。

## 安装

> 本仓库使用 [pnpm](https://pnpm.io) 作为包管理器（根目录 `package.json` 声明了 `packageManager`），本地开发请先启用对应版本：
>
> ```bash
> corepack enable
> pnpm install
> ```

```bash
pnpm add -D unplugin-tdesign-icons
# 按需安装对应图标包
pnpm add tdesign-icons-vue-next   # Vue 3
pnpm add tdesign-icons-vue        # Vue 2
pnpm add tdesign-icons-react      # React
pnpm add tdesign-icons-web-components  # Web Components
```

## 使用

每个图标包有独立的分包入口，命名与图标包一一对应（`TDesignIconsVue` / `TDesignIconsVueNext` / `TDesignIconsReact` / `TDesignIconsWebComponents`）。

### Vue 3 + Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import TDesignIconsVueNext from 'unplugin-tdesign-icons/TDesignIconsVueNext'

export default defineConfig({
  plugins: [
    vue(),
    TDesignIconsVueNext.vite(),
  ],
})
```

### Vue 2 + Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import TDesignIconsVue from 'unplugin-tdesign-icons/TDesignIconsVue'

export default defineConfig({
  plugins: [
    vue2(),
    TDesignIconsVue.vite(),
  ],
})
```

### React + Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import TDesignIconsReact from 'unplugin-tdesign-icons/TDesignIconsReact'

export default defineConfig({
  plugins: [
    react(),
    TDesignIconsReact.vite(),
  ],
})
```

### Web Components + Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import TDesignIconsWebComponents from 'unplugin-tdesign-icons/TDesignIconsWebComponents'

export default defineConfig({
  plugins: [
    TDesignIconsWebComponents.vite(),
  ],
})
```

### 其他构建工具

分包入口同样支持所有 unplugin 目标：

```ts
// rollup.config.js
import TDesignIconsVueNext from 'unplugin-tdesign-icons/TDesignIconsVueNext'
export default { plugins: [TDesignIconsVueNext.rollup()] }

// rolldown.config.js
import TDesignIconsVueNext from 'unplugin-tdesign-icons/TDesignIconsVueNext'
export default { plugins: [TDesignIconsVueNext.rolldown()] }

// webpack.config.js
// 分包入口是 ESM（与 unplugin-icons 一致），CJS 通过 require(esm) 互操作拿到插件函数
const TDesignIconsVueNext = require('unplugin-tdesign-icons/TDesignIconsVueNext')
module.exports = { plugins: [TDesignIconsVueNext.webpack()] }

// rspack.config.js
const TDesignIconsVueNext = require('unplugin-tdesign-icons/TDesignIconsVueNext')
module.exports = { plugins: [TDesignIconsVueNext.rspack()] }

// esbuild.config.js
import { build } from 'esbuild'
import TDesignIconsVueNext from 'unplugin-tdesign-icons/TDesignIconsVueNext'
build({ plugins: [TDesignIconsVueNext.esbuild()] })
```

## 示例（Examples）

参考 unplugin-icons，本仓库在 [`examples/`](./examples) 提供了可直接运行的示例工程，覆盖 Vue 2 / Vue 3 / React / Web Components 与 Vite / Webpack 等主流组合：

| 示例 | 说明 |
| --- | --- |
| [`examples/vite-vue3`](./examples/vite-vue3) | Vite + Vue 3，`unplugin-tdesign-icons/TDesignIconsVueNext` |
| [`examples/vite-vue2`](./examples/vite-vue2) | Vite + Vue 2，`unplugin-tdesign-icons/TDesignIconsVue` |
| [`examples/vite-react`](./examples/vite-react) | Vite + React，`unplugin-tdesign-icons/TDesignIconsReact` |
| [`examples/vite-web-components`](./examples/vite-web-components) | Vite + Web Components，`unplugin-tdesign-icons/TDesignIconsWebComponents` |
| [`examples/webpack-vue3`](./examples/webpack-vue3) | Webpack 5 + Vue 3，`unplugin-tdesign-icons/TDesignIconsVueNext`（CJS） |

每个示例都可以 `pnpm install && pnpm run dev` / `pnpm run build` 直接跑起来，详见 [`examples/README.md`](./examples/README.md)。

## 验证

以下构建工具均已通过集成测试，确认按需导入生效（只打包用到的图标、不再含桶入口）：

| 构建工具 | 结果 |
| --- | --- |
| Vite | ✅ |
| Rollup | ✅（配合 `@rollup/plugin-node-resolve`） |
| Rolldown | ✅ |
| Webpack | ✅ |
| Rspack | ✅ |
| esbuild | ✅ |

## 选项

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `framework` | `'vue' \| 'vue-next' \| 'react' \| 'web-components'` | `'vue-next'` | 要优化的图标包 |
| `packageName` | `string` | 按 framework | 覆盖图标包名（如使用别名时） |
| `includeSource` | `string[]` | `[]` | 只处理路径包含这些片段的文件 |
| `exclude` | `(string \| RegExp)[]` | `[/node_modules/]` | 跳过的路径 |

> 分包入口已经固定了 framework，一般无需传 `framework`。直接使用主入口 `unplugin-tdesign-icons` 时可以用 `framework` 选项指定目标包。

## 工作原理

1. 用 `es-module-lexer` 精确解析出代码中所有 `import { ... } from 'tdesign-icons-xxx'` 语句；
2. 从图标包内置的 `esm/manifest.js` 构建 `导出名 → 文件名(stem)` 映射（`导出名 = manifest.icon + 'Icon'`）；
3. 把命中的具名导入改写为 `import XxxIcon from 'tdesign-icons-xxx/esm/components/xxx.js'`；
4. 同一语句中的非图标导入（如 `IconBase`、`IconFont`）保留原桶导入。

> ⚠️ 改写后的深层导入带 `.js` 后缀，Node/SSR/严格 ESM 环境下也能正常解析。

## License

MIT
