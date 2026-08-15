<template>
  <main class="app">
    <h1>unplugin-tdesign-icons · Vue 2 + Vite</h1>
    <p class="hint">
      通用 Icon 的静态和动态 name 都使用构建产物中的本地 svg-sprite。
    </p>
    <div class="icons">
      <div class="icon-card"><Icon name="add" /><span>add</span></div>
      <div class="icon-card"><Icon name="chevron-down" /><span>chevron-down</span></div>
      <div class="icon-card"><Icon name="close" /><span>close</span></div>
      <div class="icon-card"><Icon name="heart-filled" /><span>heart-filled</span></div>
      <div class="icon-card"><Icon name="search" /><span>search</span></div>
      <div class="icon-card"><Icon name="time" /><span>time</span></div>
      <div class="icon-card"><Icon name="user" /><span>user</span></div>
      <div class="icon-card"><Icon :name="dynamicIcon" /><span>dynamic</span></div>
    </div>
  </main>
</template>

<script>
// Vue 2 保持 Options API；localIcons 会保留 Icon 与动态 name，并注入本地 URL。
import { Icon } from 'tdesign-icons-vue'

export default {
  name: 'App',
  components: { Icon },
  data: () => ({ dynamicIcon: 'unhappy' }),
}
</script>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: #f5f7fa;
  color: #181818;
}
.app {
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
  text-align: center;
}
.hint {
  color: #666;
  margin-bottom: 2rem;
}
.icons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 1rem;
  margin-bottom: 2.5rem;
}
.icon-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 8%);
  font-size: 0.8rem;
  color: #666;
}
.icon-card svg {
  width: 2em;
  height: 2em;
}
</style>
