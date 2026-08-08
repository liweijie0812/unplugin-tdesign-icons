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

  it('keeps `import type` statements untouched (type imports must not become value imports)', async () => {
    const code = `import type { CloseIcon } from 'tdesign-icons-react'`
    expect(await runTransform(code, 'react')).toBeNull()
  })

  it('keeps `import { type X }` inline type specifiers untouched', async () => {
    const code = `import { type CloseIcon } from 'tdesign-icons-react'`
    expect(await runTransform(code, 'react')).toBeNull()
  })

  it('keeps `export type { X } from` re-exports untouched', async () => {
    const code = `export type { CloseIcon } from 'tdesign-icons-react'`
    expect(await runTransform(code, 'react')).toBeNull()
  })

  it('preserves re-export semantics for `export { X } from`', async () => {
    const code = `export { CloseIcon } from 'tdesign-icons-react'`
    const out = await runTransform(code, 'react')
    expect(out).toBe(`export { default as CloseIcon } from 'tdesign-icons-react/esm/components/close.js'`)
  })

  it('preserves alias in `export { X as Y } from` re-exports', async () => {
    const code = `export { CloseIcon as Close } from 'tdesign-icons-react'`
    const out = await runTransform(code, 'react')
    expect(out).toBe(`export { default as Close } from 'tdesign-icons-react/esm/components/close.js'`)
  })

  it('keeps non-icon specifiers in `export { } from` re-exports', async () => {
    const code = `export { CloseIcon, IconBase } from 'tdesign-icons-react'`
    const out = await runTransform(code, 'react')
    expect(out).toContain(`export { IconBase } from 'tdesign-icons-react'`)
    expect(out).toContain(`export { default as CloseIcon } from 'tdesign-icons-react/esm/components/close.js'`)
  })
})

async function runLocalIcons(code: string, framework: Framework = 'react', id = '/project/src/App.tsx') {
  const plugin = (unplugin.raw as any)(
    { framework, localIcons: true },
    { framework: 'rollup' } as any,
  )
  const result = (await plugin.transform.call({}, code, id)) as TransformResult
  return result ? result.code : null
}

describe('localIcons (offline <Icon name> rewrite)', () => {
  it('rewrites <Icon name="sneer" /> to <SneerIcon /> and injects the deep import', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = () => <Icon name="sneer" />`
    const out = await runLocalIcons(code, 'react')
    expect(out).toContain(`import SneerIcon from 'tdesign-icons-react/esm/components/sneer.js'`)
    expect(out).toContain(`<SneerIcon />`)
    // Barrel Icon import removed (no longer used)
    expect(out).not.toContain(`import { Icon } from 'tdesign-icons-react'`)
  })

  it('keeps other props when rewriting', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = () => <Icon name="add-circle-filled" size="large" onClick={fn} />`
    const out = await runLocalIcons(code, 'react')
    expect(out).toContain(`<AddCircleFilledIcon size="large" onClick={fn} />`)
  })

  it('rewrites lowercase <icon> tags in vue SFC templates', async () => {
    const code = `<template>
  <icon name="unhappy" />
</template>
<script setup>
import { Icon } from 'tdesign-icons-vue-next'
</script>`
    const out = await runLocalIcons(code, 'vue-next', '/project/src/App.vue')
    expect(out).toContain(`<UnhappyIcon />`)
    expect(out).toContain(`import UnhappyIcon from 'tdesign-icons-vue-next/esm/components/unhappy.js'`)
    // Injected inside the <script> block
    expect(out!.indexOf('import UnhappyIcon')).toBeGreaterThan(out!.indexOf('<script'))
  })

  it('rewrites paired (non-self-closing) tags and their closing tag', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = () => <Icon name="sneer">child</Icon>`
    const out = await runLocalIcons(code, 'react')
    expect(out).toContain(`<SneerIcon>child</SneerIcon>`)
  })

  it('leaves dynamic :name / name={expr} usages untouched and keeps Icon import', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = ({ n }) => <Icon name={n} />`
    const out = await runLocalIcons(code, 'react')
    expect(out).toBeNull()
  })

  it('leaves unknown icon names untouched', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = () => <Icon name="not-an-icon" />`
    const out = await runLocalIcons(code, 'react')
    expect(out).toBeNull()
  })

  it('supports aliased Icon imports (Icon as TIcon)', async () => {
    const code = `import { Icon as TIcon } from 'tdesign-icons-vue-next'
<template><TIcon name="sneer" /></template>`
    const out = await runLocalIcons(code, 'vue-next', '/project/src/App.vue')
    expect(out).toContain(`<SneerIcon />`)
    expect(out).toContain(`import SneerIcon from 'tdesign-icons-vue-next/esm/components/sneer.js'`)
  })

  it('keeps Icon import when mixed with non-convertible usage', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = ({ n }) => <div><Icon name="sneer" /><Icon name={n} /></div>`
    const out = await runLocalIcons(code, 'react')
    expect(out).toContain(`<SneerIcon />`)
    expect(out).toContain(`import { Icon } from 'tdesign-icons-react'`)
  })

  it('does not touch Icon when localIcons is disabled', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = () => <Icon name="sneer" />`
    const plugin = (unplugin.raw as any)({ framework: 'react' }, { framework: 'rollup' } as any)
    const result = (await plugin.transform.call({}, code, '/project/src/App.tsx')) as TransformResult
    expect(result).toBeNull()
  })

  it('web-components <t-icon> is already offline and untouched', async () => {
    const code = `import { Icon } from 'tdesign-icons-web-components'
const el = document.createElement('t-icon')
el.setAttribute('name', 'sneer')`
    const out = await runLocalIcons(code, 'web-components', '/project/src/app.js')
    expect(out).toBeNull()
  })

  it('merges with existing icon imports and dedupes', async () => {
    const code = `import { Icon, CloseIcon } from 'tdesign-icons-react'
export const A = () => <div><Icon name="sneer" /><CloseIcon /></div>`
    const out = await runLocalIcons(code, 'react')
    expect(out).toContain(`import CloseIcon from 'tdesign-icons-react/esm/components/close.js'`)
    expect(out).toContain(`import SneerIcon from 'tdesign-icons-react/esm/components/sneer.js'`)
    expect(out).toContain(`<SneerIcon />`)
    expect(out).not.toContain(`import { Icon } from 'tdesign-icons-react'`)
  })
})

describe('localIcons string/comment safety', () => {
  it('does not rewrite <Icon> inside a JS string literal', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
const s = '<Icon name="sneer" />'
export const A = () => <div>{s}</div>`
    const out = await runLocalIcons(code, 'react')
    expect(out).toBeNull()
  })

  it('does not rewrite <Icon> inside a comment', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
// <Icon name="sneer" />
/* <Icon name="sneer" /> */
export const A = () => <Icon name="sneer" />`
    const out = await runLocalIcons(code, 'react')
    expect(out).toContain(`<SneerIcon />`)
    expect(out).toContain(`// <Icon name="sneer" />`)
    expect(out).toContain(`/* <Icon name="sneer" /> */`)
  })

  it('does not rewrite <icon> inside vue template interpolation string', async () => {
    const code = `<template>
  <Icon name="sneer" />
  <p>{{ '<Icon name="sneer" />' }}</p>
</template>
<script setup>
import { Icon } from 'tdesign-icons-vue-next'
</script>`
    const out = await runLocalIcons(code, 'vue-next', '/project/src/App.vue')
    expect(out).toContain(`<SneerIcon />`)
    expect(out).toContain(`{{ '<Icon name="sneer" />' }}`)
  })
})
