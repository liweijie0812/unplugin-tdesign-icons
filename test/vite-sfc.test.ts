import { describe, it, expect, afterAll } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { build } from 'vite'
import vue from '@vitejs/plugin-vue'
import { TDesignIconsVueNext } from '../src/vite'

const fixtureDir = path.resolve(__dirname, 'fixtures/sfc')

describe('vite + vue SFC <Icon name> integration', () => {
  afterAll(() => {
    // Generated at runtime — keep the working tree clean so typecheck in CI
    // (which runs after tests) doesn't see them.
    fs.rmSync(fixtureDir, { recursive: true, force: true })
  })

  it('rewrites <Icon name> in a real .vue file and only bundles used icons', async () => {
    // write fixture files
    const main = path.join(fixtureDir, 'main.ts')
    const app = path.join(fixtureDir, 'App.vue')
    fs.mkdirSync(fixtureDir, { recursive: true })
    fs.writeFileSync(
      main,
      `import { createApp } from 'vue'\nimport App from './App.vue'\ncreateApp(App).mount('#app')`,
    )
    fs.writeFileSync(
      app,
      `<script setup lang="ts">
import { Icon, CloseIcon } from 'tdesign-icons-vue-next'
</script>
<template>
  <Icon name="sneer" size="large" />
  <Icon name="add" />
  <CloseIcon />
</template>`,
    )

    const result = await build({
      root: fixtureDir,
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        rollupOptions: { input: main },
      },
      plugins: [vue(), TDesignIconsVueNext()],
    })

    const output = Array.isArray(result) ? result[0] : result
    const chunks = (output as any).output.filter((o: { type: string }) => o.type === 'chunk')
    const code = chunks.map((c: { code: string }) => c.code).join('\n')
    // No barrel import left behind
    expect(code).not.toMatch(/from ['"]tdesign-icons-vue-next['"]/)
    // Only a small number of modules (not all 2354 icons)
    expect(chunks.length).toBeLessThan(5)
  })
})

describe('vite + Vue 2 classic <script> SFC <Icon name> integration', () => {
  // `@vitejs/plugin-vue2` + the Vue 2 runtime + the Vue 2 icon package live in
  // the `examples/vite-vue2` workspace, so the real-build check runs against it.
  const exampleRoot = path.resolve(__dirname, '../examples/vite-vue2')
  const req = createRequire(path.join(exampleRoot, 'package.json'))

  it('rewrites classic <script> <Icon name> and registers the deep components (real Vue 2 build)', async () => {
    const vue2 = req('@vitejs/plugin-vue2')
    const { TDesignIconsVue } = await import('../src/vite')

    const result = await build({
      root: exampleRoot,
      configFile: false,
      logLevel: 'silent',
      build: { write: false, minify: false },
      plugins: [TDesignIconsVue(), vue2()],
    })
    const output = Array.isArray(result) ? result[0] : result
    const chunks = (output as any).output.filter((o: { type: string }) => o.type === 'chunk')
    const code = chunks.map((c: { code: string }) => c.code).join('\n')
    // The barrel import is fully gone (only deep single-icon modules remain).
    expect(code).not.toMatch(/from ['"]tdesign-icons-vue['"]/)
    // The rewritten icon components are actually bundled.
    expect(code).toMatch(/AddIcon|add\.js/)
    expect(code).toMatch(/CloseIcon|close\.js/)
    // And the template components were renamed away from `<Icon name>`.
    expect(code).not.toMatch(/name="(add|close)"/)
  }, 120_000)
})
