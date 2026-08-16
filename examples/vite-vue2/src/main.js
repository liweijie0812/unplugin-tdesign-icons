import Vue from 'vue'
// Registering the tdesign-vue Icon plugin also registers the global <t-icon>,
// which (with localIcons) renders from the emitted local SVG sprite.
import { Icon } from 'tdesign-vue'
import App from './App.vue'

Vue.use(Icon)

new Vue({
  render: (h) => h(App),
}).$mount('#app')
