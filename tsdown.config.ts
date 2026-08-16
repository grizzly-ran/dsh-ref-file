/**
 * Browser client bundle for dsh-ref-file, mirroring the DeepSeek Harness
 * `clientBundle` protocol: a CJS closure-factory artifact wrapped in
 * `window.__ModuleLoader__.load({ id, factory })`, externals answered by the
 * browser module table. The client imports no @deepseek-ai runtime values
 * (type-only imports are erased), so the external set is just React.
 */
import { defineConfig } from 'tsdown'

/** The client bundle's registration id: MUST equal the package name. */
const PLUGIN_ID = 'dsh-ref-file'

export default defineConfig({
  name: `${PLUGIN_ID}/client`,
  entry: { client: 'lib/client/index.js' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  sourcemap: true,
  clean: false,
  external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  noExternal: (id: string) => (['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'].includes(id) ? undefined : true),
  plugins: [{
    name: 'dsh-ref-file-purity',
    resolveId(source: string) {
      // No @deepseek-ai value import may survive: cross-plugin value imports
      // would inline a duplicate runtime or require a specifier the frozen
      // module table cannot answer. Type-only imports are erased and never
      // reach this gate.
      if (source.startsWith('@deepseek-ai/')) {
        throw new Error(
          `client bundle purity: "${source}" is not allowed — dsh-ref-file's client imports @deepseek-ai types only`,
        )
      }
      return null
    },
  }],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
