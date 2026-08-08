# Examples

每个示例都是一个独立、可直接运行的工程，用法与 unplugin-icons 的 examples 保持一致：进入目录安装依赖后即可 `dev` / `build`。

| 示例 | 技术栈 | 入口 |
| --- | --- | --- |
| [`vite-vue3`](./vite-vue3) | Vite + Vue 3 | `unplugin-tdesign-icons/TDesignIconsVueNext` |
| [`vite-vue2`](./vite-vue2) | Vite + Vue 2 | `unplugin-tdesign-icons/TDesignIconsVue` |
| [`vite-react`](./vite-react) | Vite + React | `unplugin-tdesign-icons/TDesignIconsReact` |
| [`vite-web-components`](./vite-web-components) | Vite + Web Components | `unplugin-tdesign-icons/TDesignIconsWebComponents` |
| [`webpack-vue3`](./webpack-vue3) | Webpack 5 + Vue 3（CJS） | `unplugin-tdesign-icons/TDesignIconsVueNext` |

## 运行方式

```bash
# 先构建一次插件本体（examples 通过 file: ../.. 引用根包）
cd ../.. && npm install && npm run build && cd -

# 进入任一示例
cd vite-vue3
npm install
npm run dev     # 开发模式
npm run build   # 生产构建
```

> 示例的 `package.json` 通过 `"unplugin-tdesign-icons": "file:../.."` 直接引用仓库根目录，
> 因此修改插件源码后需先在根目录重新 `npm run build` 生成 `dist/`。

## 每个示例展示什么

- **`vite-vue3`**：源码用桶导入 `import { CloseIcon, ... } from 'tdesign-icons-vue-next'`，构建时由 `unplugin-tdesign-icons/TDesignIconsVueNext` 改写为单图标深层导入。
- **`vite-vue2`**：同上，面向 `tdesign-icons-vue`，由 `unplugin-tdesign-icons/TDesignIconsVue` 处理。
- **`vite-react`**：同上，面向 `tdesign-icons-react`，由 `unplugin-tdesign-icons/TDesignIconsReact` 处理。
- **`vite-web-components`**：面向 `tdesign-icons-web-components`，由 `unplugin-tdesign-icons/TDesignIconsWebComponents` 处理。
- **`webpack-vue3`**：Webpack 5 + Vue 3，通过 CJS `require('unplugin-tdesign-icons/TDesignIconsVueNext')` 使用。
