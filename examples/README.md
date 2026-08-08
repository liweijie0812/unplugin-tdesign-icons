# Examples

每个示例都是一个独立、可直接运行的工程，用法与 unplugin-icons 的 examples 保持一致：进入目录安装依赖后即可 `dev` / `build`。

| 示例 | 技术栈 | 入口 |
| --- | --- | --- |
| [`vite-vue3`](./vite-vue3) | Vite + Vue 3 | `import { TDesignIconsVueNext } from 'unplugin-tdesign-icons/vite'` → `TDesignIconsVueNext()` |
| [`vite-vue2`](./vite-vue2) | Vite + Vue 2 | `import { TDesignIconsVue } from 'unplugin-tdesign-icons/vite'` → `TDesignIconsVue()` |
| [`vite-react`](./vite-react) | Vite + React | `import { TDesignIconsReact } from 'unplugin-tdesign-icons/vite'` → `TDesignIconsReact()` |
| [`vite-web-components`](./vite-web-components) | Vite + Web Components | `import { TDesignIconsWebComponents } from 'unplugin-tdesign-icons/vite'` → `TDesignIconsWebComponents()` |
| [`webpack-vue3`](./webpack-vue3) | Webpack 5 + Vue 3（CJS） | `const { TDesignIconsVueNext } = require('unplugin-tdesign-icons/webpack')` → `TDesignIconsVueNext()` |
| [`rollup-react`](./rollup-react) | Rollup + React | `import { TDesignIconsReact } from 'unplugin-tdesign-icons/rollup'` → `TDesignIconsReact()` |
| [`rolldown-react`](./rolldown-react) | Rolldown + React | `import { TDesignIconsReact } from 'unplugin-tdesign-icons/rolldown'` → `TDesignIconsReact()` |
| [`rspack-react`](./rspack-react) | Rspack + React | `import { TDesignIconsReact } from 'unplugin-tdesign-icons/rspack'` → `TDesignIconsReact()` |
| [`esbuild-react`](./esbuild-react) | esbuild + React | `import { TDesignIconsReact } from 'unplugin-tdesign-icons/esbuild'` → `TDesignIconsReact()` |

## 运行方式

仓库根目录是 pnpm workspace，`examples/*` 通过 `workspace:*` 引用根包。

```bash
# 根目录统一安装（一次装好所有 workspace 包）
cd ../.. && pnpm install && cd -

# 进入任一示例
cd vite-vue3
pnpm run dev     # 开发模式（仅 Vite 系列示例支持）
pnpm run build   # 生产构建
```

> 示例的 `package.json` 通过 `"unplugin-tdesign-icons": "workspace:*"` 引用仓库根目录。
> 配合 tsdown 的 `exports.devExports`，**开发期无需先在根目录 `pnpm run build`**：
> `exports` 直接指向 `src/*.ts` 源码，各示例的构建配置（Vite/Rollup/Webpack 等）在 Node 侧
> 通过 pnpm workspace symlink 加载插件（Node 22+ type-stripping 剥离类型），改完 `src` 保存即生效。
> 发布时 `publishConfig.exports` 指向 `dist` 产物，两者互不影响。
> 包管理器统一使用 pnpm（corepack 管理版本）。

> 💡 **CNB 云原生开发环境**：`vite-*` 示例的 `vite.config.ts` 已内置
> `server: { host: true, allowedHosts: true }`，使 dev server 监听 `0.0.0.0`
> 并放行代理域名 Host 校验，可直接在 CNB 开发环境中启动并预览端口。

## 每个示例展示什么

- **`vite-vue3`**：源码用桶导入 `import { CloseIcon, ... } from 'tdesign-icons-vue-next'`，构建时由 `unplugin-tdesign-icons/vite` 的 `TDesignIconsVueNext()` 改写为单图标深层导入。
- **`vite-vue2`**：同上，面向 `tdesign-icons-vue`，由 `unplugin-tdesign-icons/vite` 的 `TDesignIconsVue()` 处理。
- **`vite-react`**：同上，面向 `tdesign-icons-react`，由 `unplugin-tdesign-icons/vite` 的 `TDesignIconsReact()` 处理。
- **`vite-web-components`**：面向 `tdesign-icons-web-components`，由 `unplugin-tdesign-icons/vite` 的 `TDesignIconsWebComponents()` 处理。
- **`webpack-vue3`**：Webpack 5 + Vue 3，通过 CJS `require('unplugin-tdesign-icons/webpack')` 拿到 `TDesignIconsVueNext` 后直接 `TDesignIconsVueNext()` 使用。
- **`rollup-react`**：Rollup + React，`.tsx` 经 `rollup-plugin-esbuild` 编译，桶导入由 `TDesignIconsReact()` 改写。
- **`rolldown-react`**：Rolldown + React，Rolldown 原生支持 TSX，桶导入由 `TDesignIconsReact()` 改写。
- **`rspack-react`**：Rspack + React，`.tsx` 经内置 `builtin:swc-loader` 编译，桶导入由 `TDesignIconsReact()` 改写。
- **`esbuild-react`**：esbuild + React，`.tsx` 原生支持，桶导入由 `TDesignIconsReact()` 改写。
