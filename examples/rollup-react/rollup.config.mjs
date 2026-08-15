import { defineConfig } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
// Import the framework-bound plugin factory from the Rollup subpath.
import { TDesignIconsReact } from 'unplugin-tdesign-icons/rollup'

export default defineConfig({
  input: 'src/main.tsx',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    // Inject the local sprite URL before TSX compilation.
    TDesignIconsReact({ localIcons: { publicPath: './dist/' } }),
    // Compile TSX to JavaScript with the automatic JSX runtime.
    esbuild({ tsconfig: 'tsconfig.json', jsx: 'automatic' }),
    nodeResolve({ extensions: ['.tsx', '.ts', '.js', '.mjs'] }),
    commonjs(),
  ],
})
