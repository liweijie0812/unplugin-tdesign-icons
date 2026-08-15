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
# 根目录统一安装并构建插件
cd ../.. && pnpm install && pnpm run build && cd -

# 进入任一示例
cd vite-vue3
pnpm run dev     # 开发模式（仅 Vite 系列示例支持）
pnpm run build   # 生产构建
```

> 示例的 `package.json` 通过 `"unplugin-tdesign-icons": "workspace:*"` 引用仓库根目录。
> 包导出统一指向 `dist`，修改插件源码后需在根目录重新执行 `pnpm run build`。
> 包管理器统一使用 pnpm（corepack 管理版本）。

> 💡 **CNB 云原生开发环境**：`vite-*` 示例的 `vite.config.ts` 已内置
> `server: { host: true, allowedHosts: true }`，使 dev server 监听 `0.0.0.0`
> 并放行代理域名 Host 校验，可直接在 CNB 开发环境中启动并预览端口。

## 每个示例展示什么

除 Web Components 外，所有示例都开启 `localIcons`，同时展示两条互补链路：

- `CloseIcon` 等具名组件继续改写为 `esm/components/*.js` 深层导入。
- `<Icon name="...">` 的静态和动态名称保留，运行时加载构建产物中的 `assets/tdesign-icons.js`。

- **`vite-vue3`**：Vue 3 + Vite，并通过 `tdesign-vue-next` 真实注册全局 `<t-icon>`。
- **`vite-vue2`**：Vue 2.7 + Vite，使用 `tdesign-icons-vue` 的静态与动态 `Icon`。
- **`vite-react`**：React + Vite，点击计数按钮时动态切换通用图标名称。
- **`webpack-vue3`**：Webpack 5 + Vue 3，并通过 `tdesign-vue-next` 真实注册全局 `<t-icon>`。
- **`rollup-react`**：插件在 `rollup-plugin-esbuild` 之前处理 TSX，sprite URL 指向 `./dist/assets`。
- **`rolldown-react`**：Rolldown 原生处理 TSX，sprite URL 指向 `./dist/assets`。
- **`rspack-react`**：Rspack 使用内置 SWC，sprite URL 指向 `./dist/assets`。
- **`esbuild-react`**：esbuild 原生处理 TSX，sprite URL 指向 `./dist/assets`。
- **`vite-web-components`**：Web Components 的通用 `<t-icon>` 使用包内置 JSON，不需要额外 sprite 资产。
