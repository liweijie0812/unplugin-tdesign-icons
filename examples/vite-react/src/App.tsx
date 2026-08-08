import { useState } from 'react'
// These named imports are rewritten at build time by
// unplugin-tdesign-icons into single-icon deep imports, e.g.
//   import CloseIcon from 'tdesign-icons-react/esm/components/close.js'
import {
  AddIcon,
  ChevronDownIcon,
  CloseIcon,
  HeartFilledIcon,
  SearchIcon,
  TimeIcon,
  UserIcon,
} from 'tdesign-icons-react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app">
      <h1>unplugin-tdesign-icons · React + Vite</h1>
      <p className="hint">
        源码里写的是桶导入，构建时被插件改写为单图标深层导入（只打包用到的图标）。
      </p>

      <div className="icons">
        <div className="icon-card"><AddIcon /><span>AddIcon</span></div>
        <div className="icon-card"><ChevronDownIcon /><span>ChevronDownIcon</span></div>
        <div className="icon-card"><CloseIcon /><span>CloseIcon</span></div>
        <div className="icon-card"><HeartFilledIcon /><span>HeartFilledIcon</span></div>
        <div className="icon-card"><SearchIcon /><span>SearchIcon</span></div>
        <div className="icon-card"><TimeIcon /><span>TimeIcon</span></div>
        <div className="icon-card"><UserIcon /><span>UserIcon</span></div>
      </div>

      <button className="btn" type="button" onClick={() => setCount(c => c + 1)}>
        count is: {count}
      </button>
    </main>
  )
}

export default App
