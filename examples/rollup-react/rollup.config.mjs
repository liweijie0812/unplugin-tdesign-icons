import { defineConfig } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { TDesignIconsReact } from 'unplugin-tdesign-icons/rollup'

export default defineConfig({
  input: 'src/main.tsx',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    TDesignIconsReact({ localIcons: { publicPath: './dist/' } }),
    esbuild({ tsconfig: 'tsconfig.json', jsx: 'automatic' }),
    nodeResolve({ extensions: ['.tsx', '.ts', '.js', '.mjs'] }),
    commonjs(),
  ],
})
