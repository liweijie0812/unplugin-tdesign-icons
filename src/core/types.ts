/**
 * Internal shared types used across the `core/` modules.
 * These are implementation details — the public API types live in `src/types.ts`.
 */

// Lazy `@vue/compiler-sfc` loader — the SFC parser is huge (~1.5MB), so it is
// never bundled and only loaded on demand for `.vue` files that actually need
// `<script>`/`<template>` re-writing. When published it resolves against the
// consumer's node_modules (aligned with the `vue` dependency they already have).
export type SFCParse = typeof import('@vue/compiler-sfc').parse

// Template AST node — the shape differs across compiler-sfc versions, so keep
// it structural (type: 1 for element nodes, loc/props/children as used below).
export type SFCAstNode = any

/** Offsets (script-relative) inside a classic `<script>` (Options API). */
export interface ComponentRegistrations {
  /** Offsets (script-relative) of the `components` value object `{ ... }`. */
  valueStart: number
  valueEnd: number
  /** All properties inside the `components` object (for safe re-emission). */
  props: { start: number; end: number; raw: string }[]
  /** Registrations whose value references one of the icon-barrel locals. */
  regs: { tag: string; local: string; start: number; end: number; removed?: boolean }[]
}

/** A `<Icon name="...">` / `<t-icon name="...">` usage collected by `localIcons`. */
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
  /** Local names that still have (non-convertible) `<Icon ...>` references. */
  stillUsed: Set<string>
}
