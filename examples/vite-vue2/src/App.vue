<template>
  <main class="app">
    <h1>unplugin-tdesign-icons · Vue 2 + Vite</h1>
    <p class="hint">源码写桶导入，构建时被插件改写为单图标深层导入（只打包用到的图标）。</p>
    <div class="icons">
      <div class="icon-card"><AddIcon /><span>AddIcon</span></div>
      <div class="icon-card"><ChevronDownIcon /><span>ChevronDownIcon</span></div>
      <div class="icon-card"><CloseIcon /><span>CloseIcon</span></div>
      <div class="icon-card"><HeartFilledIcon /><span>HeartFilledIcon</span></div>
      <div class="icon-card"><SearchIcon /><span>SearchIcon</span></div>
      <div class="icon-card"><TimeIcon /><span>TimeIcon</span></div>
      <div class="icon-card"><UserIcon /><span>UserIcon</span></div>
    </div>
  </main>
</template>

<script>
// 构建时被 unplugin-tdesign-icons 改写为单图标深层导入，例如：
//   import CloseIcon from 'tdesign-icons-vue/esm/components/close.js'
import {
  AddIcon,
  ChevronDownIcon,
  CloseIcon,
  HeartFilledIcon,
  SearchIcon,
  TimeIcon,
  UserIcon,
} from 'tdesign-icons-vue'

export default {
  name: 'App',
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
