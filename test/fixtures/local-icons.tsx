import * as React from 'react'
import { Icon } from 'tdesign-icons-react'
export function App({ name }: { name: string }) {
  return <div><Icon name="sneer" /><Icon name={name} /></div>
}
console.log(App)
