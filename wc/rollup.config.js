import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { importMetaAssets } from '@web/rollup-plugin-import-meta-assets';

const sourceDir = 'src';
const outputDir = 'dist';

export default {
  input: 'index.js',
  output: {
    dir: '../static/',
    format: 'esm'
  },
  plugins: [
    nodeResolve({ browser: true }),
    commonjs({
      include: ['node_modules/**']
    }),
    importMetaAssets()
  ]
};
