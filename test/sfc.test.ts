import { describe, it, expect } from 'vitest'
import { unpluginFactory } from '../src/core'
import type { TransformResult } from '../src/types'

async function runTransform(code: string, framework: 'vue' | 'vue-next' = 'vue-next', id = '/project/src/App.vue') {
  const plugin = unpluginFactory(framework)
  const result = (await plugin.transform.call({}, code, id)) as TransformResult
  return result ? result.code : null
}

async function runTransformVue2(code: string, id = '/project/src/App.vue') {
  return runTransform(code, 'vue', id)
}

const P2 = 'tdesign-icons-vue'
const P = 'tdesign-icons-vue-next'

describe('unplugin-tdesign-icons SFC `<Icon name>` template rewrite', () => {
  it('rewrites a static <Icon name> to the deep single-icon component', async () => {
    const code = `<script setup lang="ts">
import { Icon } from '${P}'
</script>
<template>
  <Icon name="sneer" size="large" />
</template>`
    const out = await runTransform(code)
    expect(out).toContain(`import SneerIcon from '${P}/esm/components/sneer.js'`)
    expect(out).toContain(`<SneerIcon size="large" />`)
    expect(out).not.toContain(`name="sneer"`)
    expect(out).not.toContain(`import { Icon } from '${P}'`)
  })

  it('removes the Icon import when every <Icon> in the template is rewritable', async () => {
    const code = `<script setup lang="ts">
import { Icon, CloseIcon } from '${P}'
const count = ref(0)
</script>
<template>
  <Icon name="sneer" />
  <Icon name="chart-3d" />
  <CloseIcon />
</template>`
    const out = await runTransform(code)
    // introduced deep imports for both template names
    expect(out).toContain(`import SneerIcon from '${P}/esm/components/sneer.js'`)
    expect(out).toContain(`import Chart3DIcon from '${P}/esm/components/chart-3d.js'`)
    // existing icon import rewritten too
    expect(out).toContain(`import CloseIcon from '${P}/esm/components/close.js'`)
    // the leftover `Icon` import is dropped (no longer used)
    expect(out).not.toContain(`import { Icon } from '${P}'`)
    // template tags renamed, `name` attribute removed
    expect(out).toContain(`<SneerIcon />`)
    expect(out).toContain(`<Chart3DIcon />`)
  })

  it('keeps the Icon import when the template still has a dynamic <Icon :name>', async () => {
    const code = `<script setup lang="ts">
import { Icon } from '${P}'
</script>
<template>
  <Icon name="sneer" />
  <Icon :name="dynamic" />
</template>`
    const out = await runTransform(code)
    expect(out).toContain(`import { Icon } from '${P}'`)
    expect(out).toContain(`import SneerIcon from '${P}/esm/components/sneer.js'`)
    expect(out).toContain(`<SneerIcon />`)
    expect(out).toContain(`<Icon :name="dynamic" />`)
  })

  it('keeps the Icon import when the template uses a non-existent icon name', async () => {
    const code = `<script setup lang="ts">
import { Icon } from '${P}'
</script>
<template>
  <Icon name="sneer" />
  <Icon name="definitely-not-an-icon" />
</template>`
    const out = await runTransform(code)
    expect(out).toContain(`import { Icon } from '${P}'`)
    expect(out).toContain(`<SneerIcon />`)
    expect(out).toContain(`name="definitely-not-an-icon"`)
  })

  it('keeps the Icon import when it is referenced in the script body', async () => {
    const code = `<script setup lang="ts">
import { Icon } from '${P}'
const MyIcon = markRaw(Icon)
</script>
<template>
  <Icon name="sneer" />
  <component :is="MyIcon" name="add" />
</template>`
    const out = await runTransform(code)
    expect(out).toContain(`import { Icon } from '${P}'`)
    expect(out).toContain(`import SneerIcon from '${P}/esm/components/sneer.js'`)
    expect(out).toContain(`<SneerIcon />`)
  })

  it('handles kebab-case names (chart-3d) and Icon-suffixed icons (file-icon)', async () => {
    const code = `<script setup lang="ts">
import { Icon } from '${P}'
</script>
<template>
  <Icon name="chart-3d" />
  <Icon name="file-icon" />
  <Icon name="Chart3D" />
</template>`
    const out = await runTransform(code)
    expect(out).toContain(`import Chart3DIcon from '${P}/esm/components/chart-3d.js'`)
    expect(out).toContain(`import FileIconIcon from '${P}/esm/components/file-icon.js'`)
    expect(out).toContain(`<Chart3DIcon />`)
    expect(out).toContain(`<FileIconIcon />`)
  })

  it('leaves <Icon name> untouched when the barrel Icon is not imported (global/custom component)', async () => {
    const code = `<script setup lang="ts">
import { ref } from 'vue'
</script>
<template>
  <Icon name="sneer" />
</template>`
    const out = await runTransform(code)
    // no `import { Icon } from 'tdesign-icons-vue-next'` → template not rewritten
    expect(out).toBeNull()
  })

  it('leaves the Icon import untouched when template has no static name (global icon fallback)', async () => {
    const code = `<script setup lang="ts">
import { Icon, CloseIcon } from '${P}'
</script>
<template>
  <Icon :name="x" />
  <CloseIcon />
</template>`
    const out = await runTransform(code)
    // no static `<Icon name>` → SFC pipeline bails; the plain import rewriting
    // still converts CloseIcon while `Icon` (dynamic name) stays.
    expect(out).toContain(`import { Icon } from '${P}'`)
    expect(out).toContain(`import CloseIcon from '${P}/esm/components/close.js'`)
  })

  it('does not touch .vue files without an Icon template usage', async () => {
    const code = `<script setup lang="ts">
import { CloseIcon } from '${P}'
</script>
<template>
  <CloseIcon />
  <div>hi</div>
</template>`
    const out = await runTransform(code)
    expect(out).toContain(`import CloseIcon from '${P}/esm/components/close.js'`)
    expect(out).not.toContain(`SneerIcon`)
  })

  it('rewrites nested <Icon> elements inside other components', async () => {
    const code = `<script setup lang="ts">
import { Icon } from '${P}'
</script>
<template>
  <Card><template #icon><Icon name="add" /></template></Card>
</template>`
    const out = await runTransform(code)
    expect(out).toContain(`import AddIcon from '${P}/esm/components/add.js'`)
    expect(out).toContain(`<AddIcon />`)
    expect(out).not.toContain(`name="add"`)
  })

  it('handles icon named "icon" (IconIcon → keeps clean template rename)', async () => {
    const code = `<script setup lang="ts">
import { Icon } from '${P}'
</script>
<template>
  <Icon name="icon" />
</template>`
    const out = await runTransform(code)
    expect(out).toContain(`import IconIcon from '${P}/esm/components/icon.js'`)
    expect(out).toContain(`<IconIcon />`)
  })

  it('works with the Vue 2 framework (tdesign-icons-vue)', async () => {
    const code = `<script setup>
import { Icon } from 'tdesign-icons-vue'
</script>
<template>
  <Icon name="sneer" />
</template>`
    const out = await runTransform(code, 'vue')
    expect(out).toContain(`import SneerIcon from 'tdesign-icons-vue/esm/components/sneer.js'`)
    expect(out).toContain(`<SneerIcon />`)
  })

  it('leaves plain .ts/.tsx files to the classic import rewriting (no SFC pipeline)', async () => {
    const code = `import { CloseIcon } from '${P}'\nexport default CloseIcon`
    const out = await runTransform(code, 'vue-next', '/project/src/icons.ts')
    expect(out).toContain(`import CloseIcon from '${P}/esm/components/close.js'`)
  })
})

describe('unplugin-tdesign-icons classic <script> (Vue 2 Options API) SFC template rewrite', () => {
  it('rewrites <Icon name> when Icon is registered in components and registers the deep components', async () => {
    const code = `<script>
import { Icon } from '${P2}'
export default {
  name: 'App',
  components: { Icon }
}
</script>
<template>
  <Icon name="sneer" size="large" />
</template>`
    const out = await runTransformVue2(code)
    expect(out).toContain(`import SneerIcon from '${P2}/esm/components/sneer.js'`)
    expect(out).toContain(`<SneerIcon size="large" />`)
    expect(out).not.toContain(`import { Icon } from '${P2}'`)
    // Vue 2 resolves `_c("SneerIcon")` at runtime → the deep component must
    // stay registered in `components`.
    expect(out).toContain(`components: { SneerIcon }`)
  })

  it('keeps the components registration when a dynamic <Icon :name> remains', async () => {
    const code = `<script>
import { Icon } from '${P2}'
export default {
  components: { Icon },
  data() { return { n: 'sneer' } }
}
</script>
<template>
  <Icon name="sneer" />
  <Icon :name="n" />
</template>`
    const out = await runTransformVue2(code)
    expect(out).toContain(`import { Icon } from '${P2}'`)
    expect(out).toContain(`import SneerIcon from '${P2}/esm/components/sneer.js'`)
    expect(out).toContain(`<SneerIcon />`)
    // dynamic `<Icon :name>` stays bound → both the deep component and the
    // original `Icon` registration are kept.
    expect(out).toContain(`components: { SneerIcon, Icon }`)
    expect(out).toContain(`<Icon :name="n" />`)
  })

  it('rewrites an aliased registration (import { Icon as TIcon }) and drops the barrel import', async () => {
    const code = `<script>
import { Icon as TIcon } from '${P2}'
export default {
  components: { TIcon }
}
</script>
<template>
  <TIcon name="sneer" />
</template>`
    const out = await runTransformVue2(code)
    expect(out).toContain(`import SneerIcon from '${P2}/esm/components/sneer.js'`)
    expect(out).toContain(`<SneerIcon />`)
    expect(out).not.toContain(`import { Icon`)
    expect(out).not.toContain(`TIcon`)
    expect(out).toContain(`components: { SneerIcon }`)
  })

  it('keeps the Icon import when it is referenced in the script body', async () => {
    const code = `<script>
import { Icon } from '${P2}'
export default {
  components: { Icon },
  methods: { getIcon() { return Icon } }
}
</script>
<template>
  <Icon name="sneer" />
</template>`
    const out = await runTransformVue2(code)
    expect(out).toContain(`import { Icon } from '${P2}'`)
    expect(out).toContain(`import SneerIcon from '${P2}/esm/components/sneer.js'`)
    expect(out).toContain(`<SneerIcon />`)
    // `components: { Icon }` is gone, but the script body still references
    // `Icon` directly so the barrel import stays; the deep component is
    // registered in its place.
    expect(out).toContain(`components: { SneerIcon }`)
  })

  it('leaves the template untouched when Icon is not registered in components', async () => {
    const code = `<script>
import { Icon, CloseIcon } from '${P2}'
export default { name: 'App' }
</script>
<template>
  <Icon name="sneer" />
</template>`
    const out = await runTransformVue2(code)
    // no `components: { Icon }` → template not rewritten, only CloseIcon is
    expect(out).toContain(`import { Icon } from '${P2}'`)
    expect(out).toContain(`import CloseIcon from '${P2}/esm/components/close.js'`)
  })

  it('handles multiple icons and a components object with other registrations', async () => {
    const code = `<script>
import { Icon } from '${P2}'
export default {
  components: { Icon, MyButton },
  data() { return { x: 1 } }
}
</script>
<template>
  <Icon name="sneer" />
  <Icon name="add" />
  <MyButton />
</template>`
    const out = await runTransformVue2(code)
    expect(out).toContain(`import SneerIcon from '${P2}/esm/components/sneer.js'`)
    expect(out).toContain(`import AddIcon from '${P2}/esm/components/add.js'`)
    expect(out).toContain(`<SneerIcon />`)
    expect(out).toContain(`<AddIcon />`)
    expect(out).toContain(`<MyButton />`)
    // both deep components registered, unrelated `MyButton` kept
    expect(out).toContain(`components: { SneerIcon, AddIcon, MyButton }`)
    expect(out).toContain(`MyButton`)
  })
})
