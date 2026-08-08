import { describe, it, expect } from 'vitest'
import unplugin from '../src/core'
import type { TransformResult } from '../src/types'

type Framework = 'vue' | 'vue-next' | 'react' | 'web-components'

const PACKAGE: Record<Framework, string> = {
  vue: 'tdesign-icons-vue',
  'vue-next': 'tdesign-icons-vue-next',
  react: 'tdesign-icons-react',
  'web-components': 'tdesign-icons-web-components',
}

async function runTransform(code: string, framework: Framework = 'react', id = '/project/src/App.tsx') {
  const plugin = (unplugin.raw as any)({ framework }, { framework: 'rollup' } as any)
  const result = (await plugin.transform.call({}, code, id)) as TransformResult
  return result ? result.code : null
}

describe('unplugin-tdesign-icons core transform', () => {
  it('rewrites a single icon import to the deep module', async () => {
    const code = `import { CloseIcon } from 'tdesign-icons-react'`
    const out = await runTransform(code, 'react')
    expect(out).toContain(`import CloseIcon from 'tdesign-icons-react/esm/components/close.js'`)
  })

  it('rewrites multiple icons from the same package', async () => {
    const code = `import { CloseIcon, TimeIcon, AddIcon } from 'tdesign-icons-react'`
    const out = await runTransform(code, 'react')
    expect(out).toContain(`import CloseIcon from 'tdesign-icons-react/esm/components/close.js'`)
    expect(out).toContain(`import TimeIcon from 'tdesign-icons-react/esm/components/time.js'`)
    expect(out).toContain(`import AddIcon from 'tdesign-icons-react/esm/components/add.js'`)
  })

  it('does not touch non-icon named exports (IconBase / manifest)', async () => {
    const code = `import { IconBase, manifest } from 'tdesign-icons-react'`
    expect(await runTransform(code, 'react')).toBeNull()
  })

  it('leaves imports from other packages untouched', async () => {
    const code = `import { CloseIcon } from 'tdesign-icons-vue-next'`
    // react framework should not rewrite vue package
    expect(await runTransform(code, 'react')).toBeNull()
  })

  it('rewrites aliased imports keeping the alias', async () => {
    const code = `import { CloseIcon as X } from 'tdesign-icons-react'`
    const out = await runTransform(code, 'react')
    expect(out).toContain(`import X from 'tdesign-icons-react/esm/components/close.js'`)
  })

  it('handles icons whose name already ends with Icon (FileIconIcon)', async () => {
    const code = `import { FileIconIcon } from 'tdesign-icons-react'`
    const out = await runTransform(code, 'react')
    expect(out).toContain(`import FileIconIcon from 'tdesign-icons-react/esm/components/file-icon.js'`)
  })

  it('rewrites multiple icons into separate deep imports', async () => {
    const code = `import { CloseIcon, TimeIcon } from 'tdesign-icons-react'`
    const out = await runTransform(code, 'react')
    expect(out).toContain(`import CloseIcon from 'tdesign-icons-react/esm/components/close.js'`)
    expect(out).toContain(`import TimeIcon from 'tdesign-icons-react/esm/components/time.js'`)
  })

  it('does not touch local relative imports', async () => {
    const code = `import { CloseIcon } from './icons'`
    expect(await runTransform(code, 'react')).toBeNull()
  })

  it('returns null (not a string) when nothing changed', async () => {
    const code = `import { CloseIcon } from './icons'`
    expect(await runTransform(code, 'react')).toBeNull()
  })

  it('skips node_modules by default', async () => {
    const plugin = (unplugin.raw as any)(
      { framework: 'react' },
      { framework: 'rollup' } as any,
    )
    const id = '/project/node_modules/pkg/index.js'
    expect(plugin.transformInclude(id)).toBe(false)
  })

  it('vue-next framework rewrites tdesign-icons-vue-next', async () => {
    const code = `import { CloseIcon } from 'tdesign-icons-vue-next'`
    const out = await runTransform(code, 'vue-next', '/project/src/App.vue')
    expect(out).toContain(`import CloseIcon from 'tdesign-icons-vue-next/esm/components/close.js'`)
  })

  it('vue framework rewrites tdesign-icons-vue (Vue 2)', async () => {
    const code = `import { CloseIcon } from 'tdesign-icons-vue'`
    const out = await runTransform(code, 'vue', '/project/src/App.vue')
    expect(out).toContain(`import CloseIcon from 'tdesign-icons-vue/esm/components/close.js'`)
  })

  it('web-components framework rewrites tdesign-icons-web-components', async () => {
    const code = `import { CloseIcon } from 'tdesign-icons-web-components'`
    const out = await runTransform(code, 'web-components', '/project/src/app.js')
    expect(out).toContain(
      `import CloseIcon from 'tdesign-icons-web-components/esm/components/close.js'`,
    )
  })

  it('all four frameworks share the same deep-import shape', async () => {
    for (const framework of ['vue', 'vue-next', 'react', 'web-components'] as Framework[]) {
      const pkg = PACKAGE[framework]
      const code = `import { TimeIcon } from '${pkg}'`
      const out = await runTransform(code, framework)
      expect(out).toContain(`import TimeIcon from '${pkg}/esm/components/time.js'`)
    }
  })

  it('rewrites imports inside a raw .vue SFC (lexer fallback)', async () => {
    const code = `<template><div/></template>
<script setup>
import { CloseIcon } from 'tdesign-icons-vue-next'
</script>`
    const out = await runTransform(code, 'vue-next', '/project/src/App.vue')
    expect(out).toContain(`import CloseIcon from 'tdesign-icons-vue-next/esm/components/close.js'`)
  })

  it('ignores import-like strings (lexer protection)', async () => {
    const code = `const s = 'import { CloseIcon } from \\'tdesign-icons-react\\''`
    expect(await runTransform(code, 'react')).toBeNull()
  })

  it('keeps non-icon named exports and rewrites icons in the same statement', async () => {
    const code = `import { CloseIcon, IconBase } from 'tdesign-icons-react'`
    const out = await runTransform(code, 'react')
    expect(out).toContain(`import { IconBase } from 'tdesign-icons-react'`)
    expect(out).toContain(`import CloseIcon from 'tdesign-icons-react/esm/components/close.js'`)
  })
})
