import { describe, it, expect } from 'vitest'
import { unpluginFactory } from '../src/core'
import type { TransformResult } from '../src/types'

type Framework = 'vue' | 'vue-next' | 'react' | 'web-components'

const PACKAGE: Record<Framework, string> = {
  vue: 'tdesign-icons-vue',
  'vue-next': 'tdesign-icons-vue-next',
  react: 'tdesign-icons-react',
  'web-components': 'tdesign-icons-web-components',
}

async function runTransform(code: string, framework: Framework = 'react', id = '/project/src/App.tsx') {
  const plugin = unpluginFactory(framework)
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
    const plugin = unpluginFactory('react')
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
  const plugin = unpluginFactory(framework, { localIcons: true })
  const result = (await plugin.transform.call({}, code, id)) as TransformResult
  return result ? result.code : null
}

describe('localIcons (local svg-sprite URL injection)', () => {
  it('keeps a static Icon and points it at the emitted sprite', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = () => <Icon name="sneer" />`
    const out = await runLocalIcons(code)
    expect(out).toContain(`import { Icon } from 'tdesign-icons-react'`)
    expect(out).toContain(`<Icon name="sneer" url="./assets/tdesign-icons.js" loadDefaultIcons={false} />`)
    expect(out).not.toContain('SneerIcon')
  })

  it('supports dynamic names and keeps other props', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = ({ n }) => <Icon name={n} size="large" onClick={fn} />`
    const out = await runLocalIcons(code)
    expect(out).toContain(
      `<Icon name={n} size="large" onClick={fn} url="./assets/tdesign-icons.js" loadDefaultIcons={false} />`,
    )
  })

  it('handles arrows and greater-than operators inside JSX attributes', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = ({ n }) => <Icon name={n > 1 ? 'add' : 'close'} onClick={() => select(n)} />`
    const out = await runLocalIcons(code)
    expect(out).toContain(
      `<Icon name={n > 1 ? 'add' : 'close'} onClick={() => select(n)} url="./assets/tdesign-icons.js" loadDefaultIcons={false} />`,
    )
  })

  it('overrides existing remote sprite props', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = () => <Icon name="sneer" url={remoteUrl} loadDefaultIcons />`
    const out = await runLocalIcons(code)
    expect(out).toContain(`<Icon name="sneer" url="./assets/tdesign-icons.js" loadDefaultIcons={false} />`)
    expect(out).not.toContain('remoteUrl')
  })

  it('keeps paired tags and their children', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = () => <Icon name="sneer">child</Icon>`
    const out = await runLocalIcons(code)
    expect(out).toContain(`<Icon name="sneer" url="./assets/tdesign-icons.js" loadDefaultIcons={false}>child</Icon>`)
  })

  it('keeps named icon imports optimized as deep imports', async () => {
    const code = `import { Icon, CloseIcon } from 'tdesign-icons-react'
export const A = () => <><Icon name="sneer" /><CloseIcon /></>`
    const out = await runLocalIcons(code)
    expect(out).toContain(`import { Icon } from 'tdesign-icons-react'`)
    expect(out).toContain(`import CloseIcon from 'tdesign-icons-react/esm/components/close.js'`)
    expect(out).not.toContain('SneerIcon')
  })

  it('supports aliased and lowercase Icon tags in Vue SFCs', async () => {
    const code = `<template><t-icon :name="name" /><icon name="close" /></template>
<script setup>import { Icon } from 'tdesign-icons-vue-next'</script>`
    const out = await runLocalIcons(code, 'vue-next', '/project/src/App.vue')
    expect(out).toContain(`<t-icon :name="name" url="./assets/tdesign-icons.js" :load-default-icons="false" />`)
    expect(out).toContain(`<icon name="close" url="./assets/tdesign-icons.js" :load-default-icons="false" />`)
    expect(out).toContain(`import { Icon } from 'tdesign-icons-vue-next'`)
  })

  it('supports an aliased Icon import', async () => {
    const code = `<template><TIcon name="sneer" /></template>
<script setup>import { Icon as TIcon } from 'tdesign-icons-vue-next'</script>`
    const out = await runLocalIcons(code, 'vue-next', '/project/src/App.vue')
    expect(out).toContain(`<TIcon name="sneer" url="./assets/tdesign-icons.js" :load-default-icons="false" />`)
  })

  it('uses custom publicPath and fileName values', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = () => <Icon name="sneer" />`
    const plugin = unpluginFactory('react', {
      localIcons: { fileName: 'static/icons.js', publicPath: '/console/' },
    })
    const result = (await plugin.transform.call({}, code, '/project/src/App.tsx')) as TransformResult
    expect(result && result.code).toContain(`url="/console/static/icons.js"`)
  })

  it('does not touch Icon when localIcons is disabled', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
export const A = () => <Icon name="sneer" />`
    const plugin = unpluginFactory('react')
    const result = (await plugin.transform.call({}, code, '/project/src/App.tsx')) as TransformResult
    expect(result).toBeNull()
  })

  it('leaves Web Components on its built-in local JSON implementation', async () => {
    const code = `import { Icon } from 'tdesign-icons-web-components'
export const A = () => <Icon name="sneer" />`
    const out = await runLocalIcons(code, 'web-components')
    expect(out).toBeNull()
  })
})

describe('localIcons aliases and source safety', () => {
  it('injects the default global t-icon alias without an Icon import', async () => {
    const code = `<template><t-icon :name="dynamic" /></template>`
    const out = await runLocalIcons(code, 'vue-next', '/project/src/App.vue')
    expect(out).toContain(`<t-icon :name="dynamic" url="./assets/tdesign-icons.js" :load-default-icons="false" />`)
  })

  it('supports custom aliases and ignores unconfigured aliases', async () => {
    const code = `export const A = () => <my-icon name="sneer" />`
    const defaultOut = await runLocalIcons(code)
    expect(defaultOut).toBeNull()

    const plugin = unpluginFactory('react', { localIcons: true, aliases: { 'my-icon': 'Icon' } })
    const result = (await plugin.transform.call({}, code, '/project/src/App.tsx')) as TransformResult
    expect(result && result.code).toContain(
      `<my-icon name="sneer" url="./assets/tdesign-icons.js" loadDefaultIcons={false} />`,
    )
  })

  it('does not alter tags inside strings or comments', async () => {
    const code = `import { Icon } from 'tdesign-icons-react'
const text = '<Icon name="sneer" />'
// <Icon name="close" />
export const A = () => <Icon name="add" />`
    const out = await runLocalIcons(code)
    expect(out).toContain(`const text = '<Icon name="sneer" />'`)
    expect(out).toContain(`// <Icon name="close" />`)
    expect(out).toContain(`<Icon name="add" url="./assets/tdesign-icons.js" loadDefaultIcons={false} />`)
  })

  it('does not alter t-icon tags inside Vue comments', async () => {
    const code = `<template><!-- <t-icon name="sneer" /> --><t-icon name="close" /></template>`
    const out = await runLocalIcons(code, 'vue-next', '/project/src/App.vue')
    expect(out).toContain(`<!-- <t-icon name="sneer" /> -->`)
    expect(out).toContain(`<t-icon name="close" url="./assets/tdesign-icons.js" :load-default-icons="false" />`)
  })
})
