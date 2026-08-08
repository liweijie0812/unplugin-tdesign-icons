import { render } from 'react-dom'
import React from 'react'
// These named imports are rewritten at build time by
// unplugin-tdesign-icons into single-icon deep imports, e.g.
//   import CloseIcon from 'tdesign-icons-react/esm/components/close.js'
import { CloseIcon, SearchIcon, TimeIcon, UserIcon } from 'tdesign-icons-react'

render(
  <main className="app">
    <h1>unplugin-tdesign-icons · React + esbuild</h1>
    <p className="hint">源码里写的是桶导入，构建时被插件改写为单图标深层导入（只打包用到的图标）。</p>
    <div className="icons">
      <div className="icon-card"><CloseIcon /><span>CloseIcon</span></div>
      <div className="icon-card"><SearchIcon /><span>SearchIcon</span></div>
      <div className="icon-card"><TimeIcon /><span>TimeIcon</span></div>
      <div className="icon-card"><UserIcon /><span>UserIcon</span></div>
    </div>
  </main>,
  document.getElementById('root'),
)
