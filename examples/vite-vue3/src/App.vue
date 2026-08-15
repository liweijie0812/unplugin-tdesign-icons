<script setup lang="ts">
import { ref } from 'vue'
// `<Icon name="..." />` 是 TDesign 的通用图标组件（svg-sprite 渲染）。
// 开启 localIcons 后，Icon 与 t-icon 会指向构建产物中的本地 svg-sprite；
// name 保持不变，因此静态和动态名称都能工作。
import { Icon } from 'tdesign-icons-vue-next'

const count = ref(0)
const dynamicIcon = ref('sneer')
</script>

<template>
  <main class="app">
    <h1>unplugin-tdesign-icons · Vue 3 + Vite</h1>
    <p class="hint">
      模板里的 <code>&lt;Icon name="xxx" /&gt;</code> 会加载构建产物中的本地 svg-sprite。
    </p>

    <div class="icons">
      <div class="icon-card"><Icon name="add" /><span>add</span></div>
      <div class="icon-card"><Icon name="chevron-down" /><span>chevron-down</span></div>
      <div class="icon-card"><Icon name="close" /><span>close</span></div>
      <div class="icon-card"><Icon name="heart-filled" /><span>heart-filled</span></div>
      <div class="icon-card"><Icon name="search" /><span>search</span></div>
      <div class="icon-card"><Icon name="time" /><span>time</span></div>
      <div class="icon-card"><Icon name="user" /><span>user</span></div>
      <!-- localIcons 同时支持动态 name -->
      <div class="icon-card"><Icon :name="dynamicIcon" /><span>dynamic Icon</span></div>
      <!-- tdesign-vue-next 全局注册的 t-icon 使用相同本地 sprite -->
      <div class="icon-card"><t-icon name="unhappy" /><span>t-icon name="unhappy"</span></div>
    </div>

    <button class="btn" type="button" @click="count++">
      count is: {{ count }}
    </button>
  </main>
</template>

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
.btn {
  padding: 0.6rem 1.4rem;
  border: none;
  border-radius: 8px;
  background: #0052d9;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}
</style>
