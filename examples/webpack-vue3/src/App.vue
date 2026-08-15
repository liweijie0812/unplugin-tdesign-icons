<script setup>
import { shallowRef } from 'vue'
import { CloseIcon, Icon, SearchIcon, TimeIcon, UserIcon } from 'tdesign-icons-vue-next'

const dynamicIcon = shallowRef('unhappy')
</script>

<template>
  <main class="app">
    <h1>unplugin-tdesign-icons · Vue 3 + Webpack</h1>
    <p class="hint">具名组件按需深层导入，Icon 与 t-icon 使用本地 svg-sprite。</p>
    <div class="icons">
      <div class="icon-card"><CloseIcon /><span>CloseIcon</span></div>
      <div class="icon-card"><SearchIcon /><span>SearchIcon</span></div>
      <div class="icon-card"><TimeIcon /><span>TimeIcon</span></div>
      <div class="icon-card"><UserIcon /><span>UserIcon</span></div>
      <div class="icon-card"><Icon name="sneer" /><span>static Icon</span></div>
      <div class="icon-card"><Icon :name="dynamicIcon" /><span>dynamic Icon</span></div>
      <div class="icon-card"><t-icon name="unhappy" /><span>tdesign t-icon</span></div>
    </div>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #f5f7fa;
  color: #181818;
}
.app {
  max-width: 560px;
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
