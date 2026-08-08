# Examples

每个示例都是一个独立、可直接运行的工程，用法与 unplugin-icons 的 examples 保持一致：进入目录安装依赖后即可 `dev` / `build`。

| 示例 | 技术栈 | 入口 |
| --- | --- | --- |
| [`vite-vue3`](./vite-vue3) | Vite + Vue 3 | `unplugin-tdesign-icons/vite` + `{ framework: 'vue-next' }` |
| [`vite-vue2`](./vite-vue2) | Vite + Vue 2 | `unplugin-tdesign-icons/vite` + `{ framework: 'vue' }` |
| [`vite-react`](./vite-react) | Vite + React | `unplugin-tdesign-icons/vite` + `{ framework: 'react' }` |
| [`vite-web-components`](./vite-web-components) | Vite + Web Components | `unplugin-tdesign-icons/vite` + `{ framework: 'web-components' }` |
| [`webpack-vue3`](./webpack-vue3) | Webpack 5 + Vue 3（CJS） | `unplugin-tdesign-icons/webpack` + `{ framework: 'vue-next' }` |
| [`rollup-react`](./rollup-react) | Rollup + React | `unplugin-tdesign-icons/rollup` + `{ framework: 'react' }` |
| [`rolldown-react`](./rolldown-react) | Rolldown + React | `unplugin-tdesign-icons/rolldown` + `{ framework: 'react' }` |
| [`rspack-react`](./rspack-react) | Rspack + React | `unplugin-tdesign-icons/rspack` + `{ framework: 'react' }` |
| [`esbuild-react`](./esbuild-react) | esbuild + React | `unplugin-tdesign-icons/esbuild` + `{ framework: 'react' }` |

## 运行方式

```bash
# 先构建一次插件本体（examples 通过 file: ../.. 引用根包）
cd ../.. && pnpm install && pnpm run build && cd -

# 进入任一示例
cd vite-vue3
pnpm install
pnpm run dev     # 开发模式（仅 Vite 系列示例支持）
pnpm run build   # 生产构建
```

> 示例的 `package.json` 通过 `"unplugin-tdesign-icons": "file:../.."` 直接引用仓库根目录，
> 因此修改插件源码后需先在根目录重新 `pnpm run build` 生成 `dist/`。
> 包管理器统一使用 pnpm（corepack 管理版本）。

> 💡 **CNB 云原生开发环境**：`vite-*` 示例的 `vite.config.ts` 已内置
> `server: { host: true, allowedHosts: true }`，使 dev server 监听 `0.0.0.0`
> 并放行代理域名 Host 校验，可直接在 CNB 开发环境中启动并预览端口。

## 每个示例展示什么

- **`vite-vue3`**：源码用桶导入 `import { CloseIcon, ... } from 'tdesign-icons-vue-next'`，构建时由 `unplugin-tdesign-icons/vite`（`Icons({ framework: 'vue-next' })`）改写为单图标深层导入。
- **`vite-vue2`**：同上，面向 `tdesign-icons-vue`，由 `unplugin-tdesign-icons/vite`（`framework: 'vue'`）处理。
- **`vite-react`**：同上，面向 `tdesign-icons-react`，由 `unplugin-tdesign-icons/vite`（`framework: 'react'`）处理。
- **`vite-web-components`**：面向 `tdesign-icons-web-components`，由 `unplugin-tdesign-icons/vite`（`framework: 'web-components'`）处理。
- **`webpack-vue3`**：Webpack 5 + Vue 3，通过 CJS `require('unplugin-tdesign-icons/webpack')`（`Icons({ framework: 'vue-next' })`）使用。
- **`rollup-react`**：Rollup + React，`.tsx` 经 `rollup-plugin-esbuild` 编译，桶导入由 `Icons({ framework: 'react' })` 改写。
- **`rolldown-react`**：Rolldown + React，Rolldown 原生支持 TSX，桶导入由 `Icons({ framework: 'react' })` 改写。
- **`rspack-react`**：Rspack + React，`.tsx` 经内置 `builtin:swc-loader` 编译，桶导入由 `Icons({ framework: 'react' })` 改写。
- **`esbuild-react`**：esbuild + React，`.tsx` 原生支持，桶导入由 `Icons({ framework: 'react' })` 改写。
