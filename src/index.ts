// 包的主入口：对外导出公共类型与四个框架对应的 unplugin 插件。
// 使用方可直接 `import TDesignIconsVue from 'unplugin-tdesign-icons'`。

// 导出公共类型（Options / Framework / ResolvedOptions 等）
export * from './types.ts'
// 导出 Vue 2（tdesign-icons-vue）插件入口
export { default as TDesignIconsVue } from './TDesignIconsVue.ts'
// 导出 Vue 3（tdesign-icons-vue-next）插件入口
export { default as TDesignIconsVueNext } from './TDesignIconsVueNext.ts'
// 导出 React（tdesign-icons-react）插件入口
export { default as TDesignIconsReact } from './TDesignIconsReact.ts'
// 导出 Web Components（tdesign-icons-web-components）插件入口
export { default as TDesignIconsWebComponents } from './TDesignIconsWebComponents.ts'
