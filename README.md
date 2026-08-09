# unplugin-tdesign-icons

[![NPM version](https://img.shields.io/npm/v/unplugin-tdesign-icons?color=a1b858&label=)](https://www.npmjs.com/package/unplugin-tdesign-icons)

> On-demand import of [TDesign Icons](https://github.com/Tencent/tdesign-icons) for **Vue 2** (`tdesign-icons-vue`), **Vue 3** (`tdesign-icons-vue-next`), **React** (`tdesign-icons-react`) and **Web Components** (`tdesign-icons-web-components`).
>
> 在任意构建工具中**按需引入** TDesign 图标，只为实际用到的图标打包。

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
- 🎯 **SFC 模板改写**：`<script setup>`（Vue 2.7+/Vue 3）与 Vue 2 经典 `<script>` 中的静态 `<Icon name="..." />` 自动改写为单图标组件 `<SneerIcon />`；
- ✂️ **智能混用**：同一行里图标 + 非图标（如 `IconBase`）导入会拆成多条，非图标保留桶导入。

## 安装

> 本仓库使用 [pnpm](https://pnpm.io) 作为包管理器（根目录 `package.json` 声明了 `packageManager`），本地开发请先启用对应版本：
>
> ```bash
> corepack enable
> pnpm install
> ```
>
> 仓库根目录是 pnpm workspace（`pnpm-workspace.yaml`），`examples/*` 通过 `workspace:*` 引用本包。
> 配合 tsdown 的 `exports.devExports`，**开发期无需先 `pnpm run build`**：`package.json` 的 `exports` 直接指向 `src/*.ts` 源码，
> 各示例的构建配置（Vite/Rollup/Webpack 等）在 Node 侧加载插件时即可直接用源码（Node 22+ 的 type-stripping 会剥离类型），
> 改完 `src` 保存即生效；发布时 tsdown 自动把 `exports` 写入 `publishConfig`（指向 `dist` 产物），互不影响。

```bash
pnpm add -D unplugin-tdesign-icons
# 按需安装对应图标包
pnpm add tdesign-icons-vue-next   # Vue 3
pnpm add tdesign-icons-vue        # Vue 2
pnpm add tdesign-icons-react      # React
pnpm add tdesign-icons-web-components  # Web Components
```

## 快速上手（Quick Start）

在构建工具配置里启用插件后，源码里 `import { XxxIcon } from 'tdesign-icons-xxx'` 的写法**完全不变**，构建时会被自动改写为单图标深层导入，只打包用到的图标：

```vue
<script setup>
import { CloseIcon } from 'tdesign-icons-vue-next'
</script>

<template>
  <CloseIcon />
</template>
```

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { TDesignIconsVueNext } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  plugins: [
    vue(),
    TDesignIconsVueNext(),
  ],
})
```

## 使用

按构建工具从对应子路径导入**框架对应的插件工厂**，然后直接调用即可（无需 `.vite()` 等后缀）：

```ts
// vite.config.ts
import { TDesignIconsVueNext } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  plugins: [
    TDesignIconsVueNext({ /* options */ }),
  ],
})
```

```js
// rollup.config.js
import { TDesignIconsReact } from 'unplugin-tdesign-icons/rollup'

export default {
  plugins: [
    TDesignIconsReact({ /* options */ }),
  ],
}
```

每个构建工具子路径都导出四个框架工厂：`TDesignIconsVue` / `TDesignIconsVueNext` / `TDesignIconsReact` / `TDesignIconsWebComponents`，已固定对应框架，无需（也不能）再传 `framework`。

> 只需在构建工具配置里启用一次插件，源码里的 `import { XxxIcon } from 'tdesign-icons-xxx'` 会在编译期被自动改写为单图标深层导入。

### Vue SFC 模板改写（`<Icon name="..." />`）

对 Vue 3 `<script setup>` 或 Vue 2 经典 `<script>`（Options API）单文件组件，插件会把模板里的**静态** `<Icon name="..." />` 改写为单图标组件，并自动注入对应的深层导入：

```vue
<script setup>
import { Icon } from 'tdesign-icons-vue-next'
</script>
<template>
  <Icon name="sneer" size="large" />
</template>
```

会被编译为：

```vue
<script setup>
import SneerIcon from 'tdesign-icons-vue-next/esm/components/sneer.js'
</script>
<template>
  <SneerIcon size="large" />
</template>
```

Vue 2 经典 `<script>`（Options API）写法同样支持，改写后会**自动更新 `components` 注册**（Vue 2 运行时通过 `components` 选项解析模板里的组件名）：

```vue
<script>
import { Icon } from 'tdesign-icons-vue'
export default {
  name: 'App',
  components: { Icon }
}
</script>
<template>
  <Icon name="sneer" size="large" />
</template>
```

会被编译为：

```vue
<script>
import SneerIcon from 'tdesign-icons-vue/esm/components/sneer.js'
export default {
  name: 'App',
  components: { SneerIcon }
}
</script>
<template>
  <SneerIcon size="large" />
</template>
```

规则与说明：

- **只处理静态 `name`**：动态名称（`:name="iconName"`）和不存在的图标名称保持原样，`Icon` 导入/注册会继续保留；
- **`name` 支持多种写法**：`sneer`、`Chart3D`、`chart-3d` 均可正确解析到对应图标；
- **图标名以 `Icon` 结尾**的（如 `file-icon` → `FileIconIcon`）也能正确处理；
- 模板里同时有**可改写与不可改写**的 `<Icon>` 时，`Icon` 桶导入保留给不可改写的那部分；
- **经典 `<script>` 需 `components: { Icon }` 注册**：没有注册时 `<Icon>` 被视为全局/自定义组件，模板不做改写（普通 import 改写仍生效）；
- 需要 `@vue/compiler-sfc`：优先使用项目自身已安装的版本（与 `vue` 依赖对齐），未安装时该功能自动降级，仅保留普通的 import 改写。

### 构建工具子路径

| 构建工具 | 导入 | 示例 |
| --- | --- | --- |
| Vite | `unplugin-tdesign-icons/vite` | `TDesignIconsVueNext()` |
| Rollup | `unplugin-tdesign-icons/rollup` | `TDesignIconsReact()` |
| Rolldown | `unplugin-tdesign-icons/rolldown` | `TDesignIconsReact()` |
| Webpack | `unplugin-tdesign-icons/webpack` | `TDesignIconsVueNext()` |
| Rspack | `unplugin-tdesign-icons/rspack` | `TDesignIconsReact()` |
| esbuild | `unplugin-tdesign-icons/esbuild` | `TDesignIconsReact()` |

> 每个子路径**不再提供默认导出**：所有入口都已固定对应框架，`framework` 不是对外选项。

### Vue 3 + Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { TDesignIconsVueNext } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  plugins: [
    vue(),
    TDesignIconsVueNext(),
  ],
})
```

### Vue 2 + Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import { TDesignIconsVue } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  plugins: [
    vue2(),
    TDesignIconsVue(),
  ],
})
```

### React + Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TDesignIconsReact } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  plugins: [
    react(),
    TDesignIconsReact(),
  ],
})
```

### Web Components + Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { TDesignIconsWebComponents } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  plugins: [
    TDesignIconsWebComponents(),
  ],
})
```

### CNB 云原生开发环境（端口预览）

在 CNB 云原生开发环境中启动 Vite dev server 并通过 WebIDE 的 PORTS 面板 / 预览访问时，
需要让服务监听 `0.0.0.0` 并放行代理域名（如 `*.cnb.run`）的 Host 校验，否则页面无法打开：

```ts
// vite.config.ts
export default defineConfig({
  server: {
    host: true,          // 监听 0.0.0.0，供端口预览访问
    allowedHosts: true,  // 放行代理域名（*.cnb.run）的 Host 校验
  },
  // ...
})
```

> 仓库内 `examples/vite-*` 四个示例的 `vite.config.ts` 均已带上该配置，可直接在 CNB 云原生环境中 `pnpm run dev` 后预览。

### 其他构建工具

```ts
// rollup.config.js
import { TDesignIconsReact } from 'unplugin-tdesign-icons/rollup'
export default { plugins: [TDesignIconsReact()] }

// rolldown.config.js
import { TDesignIconsReact } from 'unplugin-tdesign-icons/rolldown'
export default { plugins: [TDesignIconsReact()] }

// webpack.config.js（CJS 通过 require(esm) 互操作拿到插件工厂）
const { TDesignIconsVueNext } = require('unplugin-tdesign-icons/webpack')
module.exports = { plugins: [TDesignIconsVueNext()] }

// rspack.config.js
const { TDesignIconsReact } = require('unplugin-tdesign-icons/rspack')
module.exports = { plugins: [TDesignIconsReact()] }

// esbuild.config.js
import { build } from 'esbuild'
import { TDesignIconsReact } from 'unplugin-tdesign-icons/esbuild'
build({ plugins: [TDesignIconsReact()] })
```

### 框架分包入口（可选）

每个图标包也提供独立的**框架分包入口**，命名与图标包一一对应（`TDesignIconsVue` / `TDesignIconsVueNext` / `TDesignIconsReact` / `TDesignIconsWebComponents`），也提供 `vue` / `vue-next` / `react` / `web-components` 四个短别名。它们已固定 `framework`（`framework` 不是对外选项），但需要手动调用对应构建工具的工厂方法（`.vite()` / `.rollup()` / `.webpack()` / `.esbuild()` 等）：

```ts
// vite.config.ts
import TDesignIconsVueNext from 'unplugin-tdesign-icons/TDesignIconsVueNext'
import TDesignIconsVue from 'unplugin-tdesign-icons/TDesignIconsVue'
import TDesignIconsReact from 'unplugin-tdesign-icons/TDesignIconsReact'
import TDesignIconsWebComponents from 'unplugin-tdesign-icons/TDesignIconsWebComponents'

export default defineConfig({
  plugins: [
    TDesignIconsVueNext.vite(),          // Vue 3
    TDesignIconsVue.vite(),              // Vue 2
    TDesignIconsReact.vite(),            // React
    TDesignIconsWebComponents.vite(),    // Web Components
  ],
})
```

> 框架分包入口主要为兼容旧用法而保留。新项目推荐直接使用上面的构建工具子路径 + 具名框架工厂（`import { TDesignIconsVueNext } from 'unplugin-tdesign-icons/vite'`）。

## 示例（Examples）

参考 unplugin-icons，本仓库在 [`examples/`](./examples) 提供了可直接运行的示例工程，覆盖 Vue 2 / Vue 3 / React / Web Components 与 Vite / Webpack / Rollup / Rolldown / Rspack / esbuild 等主流组合：

| 示例 | 说明 |
| --- | --- |
| [`examples/vite-vue3`](./examples/vite-vue3) | Vite + Vue 3，`import { TDesignIconsVueNext } from 'unplugin-tdesign-icons/vite'` |
| [`examples/vite-vue2`](./examples/vite-vue2) | Vite + Vue 2，`import { TDesignIconsVue } from 'unplugin-tdesign-icons/vite'` |
| [`examples/vite-react`](./examples/vite-react) | Vite + React，`import { TDesignIconsReact } from 'unplugin-tdesign-icons/vite'` |
| [`examples/vite-web-components`](./examples/vite-web-components) | Vite + Web Components，`import { TDesignIconsWebComponents } from 'unplugin-tdesign-icons/vite'` |
| [`examples/webpack-vue3`](./examples/webpack-vue3) | Webpack 5 + Vue 3，`const { TDesignIconsVueNext } = require('unplugin-tdesign-icons/webpack')`（CJS） |
| [`examples/rollup-react`](./examples/rollup-react) | Rollup + React，`import { TDesignIconsReact } from 'unplugin-tdesign-icons/rollup'` |
| [`examples/rolldown-react`](./examples/rolldown-react) | Rolldown + React，`import { TDesignIconsReact } from 'unplugin-tdesign-icons/rolldown'` |
| [`examples/rspack-react`](./examples/rspack-react) | Rspack + React，`import { TDesignIconsReact } from 'unplugin-tdesign-icons/rspack'` |
| [`examples/esbuild-react`](./examples/esbuild-react) | esbuild + React，`import { TDesignIconsReact } from 'unplugin-tdesign-icons/esbuild'` |

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

以注释形式展示全部可配置项（用法与 unplugin-icons 一致，直接传入插件工厂）：

```ts
TDesignIconsVueNext({
  // 把 `<Icon name="xxx" />` 在编译期改写为单图标组件，离线渲染、不再请求 CDN
  localIcons: true,
  // 组件库封装标签 → 桶导出的映射（vue/vue-next 默认识别 `<t-icon>`）
  // aliases: { 'my-t-icon': 'Icon' },
  // 只处理路径包含这些片段的文件
  // includeSource: ['src'],
  // 跳过的路径
  // exclude: [/node_modules/],
})
```

> 框架分包入口（`TDesignIconsVue` / `TDesignIconsVueNext` / `TDesignIconsReact` / `TDesignIconsWebComponents`）和各构建工具子路径的具名框架工厂**已固定框架，`framework` 不是对外选项**，无需（也不能）再传。

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `localIcons` | `boolean` | `false` | 把 `<Icon name="xxx" />` 在编译期改写为对应单图标组件 `<XxxIcon />`，离线渲染、不再请求 CDN svg-sprite |
| `aliases` | `Record<string, string>` | vue/vue-next 默认 `{ 't-icon': 'Icon' }`，其余 `{}` | 组件库封装标签 → 桶导出的映射，`localIcons` 据此改写 `<t-icon name="xxx" />` 等自定义标签 |
| `includeSource` | `string[]` | `[]` | 只处理路径包含这些片段的文件 |
| `exclude` | `(string \| RegExp)[]` | `[/node_modules/]` | 跳过的路径 |


## 无网络环境：`localIcons` 开关

默认情况下，TDesign 的 `<Icon name="xxx" />` 组件（svg-sprite 版）会在运行时从 CDN
（`https://tdesign.gtimg.com/...`）拉取全量图标 sprite。在内网 / 离线 / 构建机无外网等场景下，图标会渲染不出来。

开启 `localIcons: true` 后，插件会在**编译期**把 `<Icon name="xxx" />` 改写为对应的单图标深层组件 `<XxxIcon />`，
同时自动注入 `import XxxIcon from 'tdesign-icons-xxx/esm/components/xxx.js'`。这样图标数据直接打进产物，**完全离线渲染**，不再请求任何 CDN：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { TDesignIconsVueNext } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  plugins: [
    TDesignIconsVueNext({ localIcons: true }),
  ],
})
```

```vue
<!-- 源码写法不变，构建时被改写为 <SneerIcon /> -->
<template>
  <Icon name="sneer" />
  <Icon name="unhappy" />
</template>
<script setup>
import { Icon } from 'tdesign-icons-vue-next'
</script>
```

构建后等价于：

```vue
<template>
  <SneerIcon />
  <UnhappyIcon />
</template>
<script setup>
import SneerIcon from 'tdesign-icons-vue-next/esm/components/sneer.js'
import UnhappyIcon from 'tdesign-icons-vue-next/esm/components/unhappy.js'
</script>
```

### TDesign Vue 组件库的 `<t-icon>` 封装

TDesign Vue 组件库为了方便用户习惯，把 `Icon` 封装成了 `<t-icon>`（全局注册）。
vue / vue-next 框架开启 `localIcons` 后默认也会识别这种写法，构建时同样改写为单图标组件：

```vue
<!-- 源码：TDesign Vue 组件库的 <t-icon> 封装 -->
<template>
  <t-icon name="sneer" />
</template>
```

构建后等价于：

```vue
<template>
  <SneerIcon />
</template>
<script setup>
import SneerIcon from 'tdesign-icons-vue-next/esm/components/sneer.js'
</script>
```

如果你的组件库把 `Icon` 封装成了其它标签（例如 React 的 `<MyTIcon>`），可以用 `aliases` 选项自定义：

```ts
// vite.config.ts
import { TDesignIconsReact } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  plugins: [
    // 把 <MyTIcon name="xxx" /> 也改写为单图标组件
    TDesignIconsReact({ localIcons: true, aliases: { 'my-t-icon': 'Icon' } }),
  ],
})
```

> - 支持 Vue 2 / Vue 3 / React 的 `<Icon name="xxx" />` 写法（含 `<icon>`、kebab-case 别名如 `import { Icon as MyIcon }` → `<my-icon>` 等）。
> - **TDesign Vue 组件库**把 `Icon` 封装为 `<t-icon>`（全局注册），vue / vue-next 框架默认也会识别并改写 `<t-icon name="xxx" />`；其它框架可用 `aliases` 选项配置自定义封装标签。
> - 仅改写**静态字符串** `name`；`name={动态变量}` / `:name="动态变量"` 无法静态确定图标，会保留原 `<Icon>` 与 CDN 加载逻辑。
> - 字符串 / 注释中的 `<Icon ...>` / `<t-icon ...>` 文本不会被误改（基于字符串掩码扫描）。
> - Web Components 的 `<t-icon name="xxx" />` 本身就使用本地 JSON 渲染、不依赖 CDN，无需开启。

## 工作原理

1. 用 `es-module-lexer` 精确解析出代码中所有 `import { ... } from 'tdesign-icons-xxx'` 语句；
2. 从图标包内置的 `esm/manifest.js` 构建 `导出名 → 文件名(stem)` 映射（`导出名 = manifest.icon + 'Icon'`）；
3. 对 `.vue` 文件先尝试 SFC 管道：用 `@vue/compiler-sfc` 解析 `<script setup>` + `<template>`，把静态 `<Icon name="..." />` 改写为单图标组件（见上文），并注入对应的深层导入；
4. 开启 `localIcons` 时，额外用字符串掩码扫描把 `<Icon name="xxx" />` / `<t-icon name="xxx" />` 改写为对应的深层单图标组件 `<XxxIcon />`（vue/vue-next 默认识别 TDesign Vue 组件库的 `<t-icon>` 封装，可通过 `aliases` 自定义）；
5. 把命中的具名导入改写为 `import XxxIcon from 'tdesign-icons-xxx/esm/components/xxx.js'`；
6. 同一语句中的非图标导入（如 `IconBase`、`IconFont`）保留原桶导入。

> ⚠️ 改写后的深层导入带 `.js` 后缀，Node/SSR/严格 ESM 环境下也能正常解析。

## License

MIT
