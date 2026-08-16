## 🌈 0.2.0 `2026-08-16`

### 🚀 Features

- `localIcons.icons`: 支持按图标名称裁剪本地 SVG Sprite，减少构建产物体积 @liweijie0812

## 🌈 0.1.0 `2026-08-16`

### 🚀 Features

- `localIcons`: 新增本地图标模式，支持构建期下载 SVG Sprite 并注入本地 URL，让静态和动态图标在离线环境下正常渲染，同时支持组件库的 `<t-icon>` 封装标签 @liweijie0812

## 🌈 0.0.4 `2026-08-11`

### 🐞 Bug Fixes

- `exports`: 修复发布产物导出路径错误，解决外部无法找到 `/vite` 等子路径模块 @liweijie0812

### ⚡ Performance

- `transform`: 增加快速短路并优化开发、编译热路径，减少不相关文件的解析开销 @liweijie0812

## 🌈 0.0.3 `2026-08-10`

### 📦 Improvements

- `package`: 优化 `package.json` 导出配置与 tsdown 构建配置，支持类型声明导出和构建工具子路径调用 @liweijie0812

## 🌈 0.0.2 `2026-08-10`

### 🚀 Features

- `unplugin-tdesign-icons`: 实现 Vue 3 与 React 图标按需引入 @liweijie0812
- `TDesignIconsVue/VueNext/React/WebComponents`: 新增四套框架分包入口，覆盖 Vue 2、Vue 3、React 和 Web Components @liweijie0812
- `vite` / `rollup` / `webpack` / `esbuild` / `rolldown` / `rspack`: 支持多构建工具的子路径入口和示例工程 @liweijie0812
- `localIcons`: 支持 `<Icon name>` 离线渲染，并支持 TDesign Vue `<t-icon>` 封装改写 @liweijie0812
- `SFC`: 支持 Vue 2 经典 `<script>` 和 Vue 3 模板中的 `<Icon name>` 改写为单图标组件 @liweijie0812
- `API`: 子路径支持直接调用 `Icons(options)`，并支持具名框架工厂调用 @liweijie0812

### 🐞 Bug Fixes

- `imports`: 修复 `type` 导入和 `export` 再导出被误改写后丢失语义的问题 @liweijie0812
