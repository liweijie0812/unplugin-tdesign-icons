/**
 * Barrel entry — keeps the public API stable (`unplugin` / `unpluginFactory`)
 * while the actual implementation lives in the `core/` directory.
 *
 *   src/core/
 *     module-require.ts  — node require + manifest module loading
 *     lazy-loaders.ts    — lazy `@vue/compiler-sfc` / `@babel/parser` loaders
 *     manifest.ts        — icon manifest parsing & name lookup
 *     vue-sfc.ts         — Vue SFC `<Icon name>` template re-writing
 *     local-icons.ts     — string-masked `<Icon>` / `<t-icon>` scanner helpers
 *     transformer.ts     — the per-framework transform pipeline
 *     plugin.ts          — framework configs + unplugin factory
 *     types.ts           — internal shared types
 */
export { unpluginFactory } from './core/plugin.ts'
