import { render } from 'react-dom'
import React from 'react'
// These named imports are rewritten at build time by
// unplugin-tdesign-icons into single-icon deep imports, e.g.
//   import CloseIcon from 'tdesign-icons-react/esm/components/close.js'
import { CloseIcon, Icon, SearchIcon, TimeIcon, UserIcon } from 'tdesign-icons-react'

const dynamicIcon = 'unhappy'

render(
  <main className="app">
    <h1>unplugin-tdesign-icons · React + Rolldown</h1>
    <p className="hint">具名组件按需深层导入，通用 Icon 使用本地 svg-sprite。</p>
    <div className="icons">
      <div className="icon-card"><CloseIcon /><span>CloseIcon</span></div>
      <div className="icon-card"><SearchIcon /><span>SearchIcon</span></div>
      <div className="icon-card"><TimeIcon /><span>TimeIcon</span></div>
      <div className="icon-card"><UserIcon /><span>UserIcon</span></div>
      <div className="icon-card"><Icon name="sneer" /><span>static Icon</span></div>
      <div className="icon-card"><Icon name={dynamicIcon} /><span>dynamic Icon</span></div>
    </div>
  </main>,
  document.getElementById('root'),
)
