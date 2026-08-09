/**
 * 桶（Barrel）入口 —— 对外保持公共 API 稳定（`unplugin` / `unpluginFactory`），
 * 而真正的实现逻辑都放在 `core/` 目录中。
 *
 *   src/core/
 *     module-require.ts  —— node require 与 manifest 模块加载
 *     lazy-loaders.ts    —— 懒加载 `@vue/compiler-sfc` / `@babel/parser` 加载器
 *     manifest.ts        —— 图标 manifest 解析与名称查找
 *     vue-sfc.ts         —— Vue SFC `<Icon name>` 模板改写
 *     local-icons.ts     —— 字符串掩码版 `<Icon>` / `<t-icon>` 扫描辅助函数
 *     transformer.ts     —— 按框架区分的转换流水线
 *     plugin.ts          —— 框架配置与 unplugin 工厂函数
 *     types.ts           —— 内部共享类型
 */
export { unpluginFactory } from './core/plugin.ts'
