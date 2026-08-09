/**
 * `core/` 各模块间共享的内部类型。
 * 这些属于实现细节 —— 公共 API 类型定义在 `src/types.ts`。
 */

// 懒加载 `@vue/compiler-sfc` 加载器 —— SFC 解析器体积很大（约 1.5MB），
// 因此它永远不会被打包，只在确实需要对 `.vue` 文件做 `<script>`/`<template>`
// 改写时才按需加载。发布后它解析的是使用方 node_modules 中的包
//（与使用方已有的 `vue` 依赖对齐）。
export type SFCParse = typeof import('@vue/compiler-sfc').parse

// 模板 AST 节点 —— 不同 compiler-sfc 版本的节点形状不同，因此保持结构类型
//（type 为 1 表示元素节点，loc/props/children 按下方用法使用）。
export type SFCAstNode = any

/** 经典 `<script>`（Options API）内、相对 script 起始位置的偏移量。 */
export interface ComponentRegistrations {
  /** `components` 值对象 `{ ... }` 的起始偏移（相对 script 内容）。 */
  valueStart: number
  valueEnd: number
  /** `components` 对象内的全部属性（用于安全地重新输出）。 */
  props: { start: number; end: number; raw: string }[]
  /** 值引用了某个图标桶本地名的注册项。 */
  regs: { tag: string; local: string; start: number; end: number; removed?: boolean }[]
}

/** 由 `localIcons` 收集到的一处 `<Icon name="...">` / `<t-icon name="...">` 用法。 */
export interface IconUsage {
  component: string
  stem: string
  attrs: string
  selfClosing: boolean
  openTagStart: number
  openTagEnd: number
  closeTagStart: number
  closeTagEnd: number
}

export interface IconUsageCollection {
  usages: IconUsage[]
  /** 仍存在（不可转换的）`<Icon ...>` 引用的本地名称。 */
  stillUsed: Set<string>
}
