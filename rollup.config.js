import babel from 'rollup-plugin-babel';
import flow from 'rollup-plugin-flow';
// import ascii from "rollup-plugin-ascii";
// import node from "rollup-plugin-node-resolve";
import {terser} from "rollup-plugin-terser";
// import resolve from 'rollup-plugin-node-resolve';
import pkg from './package.json';

// @param targets - object targets to build for e.g. { node: '6' }
// see https://babeljs.io/docs/en/babel-preset-env#targets
const copyright = `// ${pkg.homepage} v${pkg.version} Copyright ${(new Date).getFullYear()}`;

const plugins = (targets, babelConfig) => [
  flow(),
  babel({
    exclude: 'node_modules/**',
    babelrc: false,
    presets: [['@babel/preset-env', { modules: false, targets }]],
    plugins: ['transform-flow-strip-types'],
    comments: false,
    ...babelConfig,
  }),
];

const external = [];
const browser = "dist/lib/sankey-multilevel.js";
const minBrowser = "dist/lib/sankey-multilevel.min.js";
const cmd = "dist/sankey-multilevel.cmd.js";
const amd = "dist/sankey-multilevel.amd.js";
const inputDir = 'ts-output/sankey-multilevel.js';
export default [
  {
    input: inputDir,
    // input: 'src/index.js',
    output: {
      name: 'sankeyMultilevel',
      file: browser,
      format: 'umd',
      sourcemap: false,
    },
    plugins: [
      ...plugins(),
      // resolve()
    ]
  },
  {
    input: inputDir,
    // input: 'src/index.js',
    output: {
      extend: true,
      name: 'sankeyMultilevel',
      file: minBrowser,
      format: 'umd',
      indent: false,
      sourcemap: false,
    },
    plugins: [
      ...plugins(),
      // resolve(),
      // ascii()
      terser({output: {preamble: copyright}})
    ]
  },
  {
    input: inputDir,
    // input: 'src/index.js',
    output: {
      name: 'sankeyMultilevel',
      file: amd,
      format: 'amd',
      sourcemap: false,
    },
    plugins: plugins(null)
  },
  {
    input: inputDir,
    output: {
      name: 'sankeyMultilevel',
      file: pkg.module,
      format: 'esm',
      sourcemap: false,
    },
    external,
    plugins: plugins({ node: '8' }),
  },
  {
    input: inputDir,
    output: {
      name: 'sankeyMultilevel',
      file: cmd,
      format: 'cjs',
      sourcemap: false,
    },
    external,
    plugins: plugins({ node: '6' }),
  },
];
