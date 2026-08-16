// These named imports are rewritten at build time by
// unplugin-tdesign-icons into single-icon deep imports, e.g.
//   import CloseIcon from 'tdesign-icons-web-components/esm/components/close.js'
//
// Importing a component module also registers the corresponding
// custom element, e.g. `<t-icon-close>`, which is what the template uses.
// The side-effect entry registers the generic `<t-icon>` backed by local JSON.
import 'tdesign-icons-web-components'
import {
  AddIcon,
  ChevronDownIcon,
  CloseIcon,
  HeartFilledIcon,
  SearchIcon,
  TimeIcon,
  UserIcon,
} from 'tdesign-icons-web-components'

const dynamicIcon = 'unhappy'

document.querySelector('#app').innerHTML = `
  <main class="app">
    <h1>unplugin-tdesign-icons - Web Components</h1>
    <p class="hint">Named components use deep imports. Generic t-icon uses bundled local JSON.</p>
    <div class="icons">
      <div class="icon-card"><t-icon-add></t-icon-add><span>AddIcon</span></div>
      <div class="icon-card"><t-icon-chevron-down></t-icon-chevron-down><span>ChevronDownIcon</span></div>
      <div class="icon-card"><t-icon-close></t-icon-close><span>CloseIcon</span></div>
      <div class="icon-card"><t-icon-heart-filled></t-icon-heart-filled><span>HeartFilledIcon</span></div>
      <div class="icon-card"><t-icon-search></t-icon-search><span>SearchIcon</span></div>
      <div class="icon-card"><t-icon-time></t-icon-time><span>TimeIcon</span></div>
      <div class="icon-card"><t-icon-user></t-icon-user><span>UserIcon</span></div>
      <div class="icon-card"><t-icon name="sneer"></t-icon><span>static t-icon</span></div>
      <div class="icon-card"><t-icon name="${dynamicIcon}"></t-icon><span>dynamic t-icon</span></div>
    </div>
  </main>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #f5f7fa; color: #181818; }
    .app { max-width: 720px; margin: 0 auto; padding: 3rem 1.5rem; text-align: center; }
    .hint { color: #666; margin-bottom: 2rem; }
    .icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 1rem; }
    .icon-card { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem; background: #fff; border-radius: 10px; box-shadow: 0 1px 4px rgb(0 0 0 / 8%); font-size: 0.8rem; color: #666; }
    .icon-card svg, .icon-card [part="t-icon"] { width: 2em; height: 2em; }
  </style>
`
