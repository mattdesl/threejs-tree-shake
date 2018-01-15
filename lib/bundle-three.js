const { rollup } = require('rollup');
const memory = require('rollup-plugin-memory');
const path = require('path');
const generateEntry = require('./generate-three-entry');
const prettyBytes = require('pretty-bytes');

function glsl () {
  return {
    // same as ThreeJS GLSL plugin
    transform (code, id) {
      if (/\.glsl$/.test(id) === false) return;
      var transformedCode = 'export default ' + JSON.stringify(
        code
          .replace(/[ \t]*\/\/.*\n/g, '') // remove //
          .replace(/[ \t]*\/\*[\s\S]*?\*\//g, '') // remove /* */
          .replace(/\n{2,}/g, '\n') // # \n+ to \n
      ) + ';';
      return {
        code: transformedCode,
        map: { mappings: '' }
      };
    }
  };
}

function sizes (params) {
  const files = [];
  const max = typeof params.inspect === 'number' ? params.inspect : 50;
  return {
    ongenerate: (opt, rendered) => {
      const bundle = opt.bundle;
      bundle.modules.forEach(mod => {
        let file = mod.id;
        file = params.threePath ? path.relative(path.resolve(params.threePath, 'src'), file) : file;
        const length = Buffer.byteLength(mod.code, 'utf8');
        files.push({ file, length });
      });
      const total = files.reduce((sum, item) => sum + item.length, 0);
      files.forEach(item => {
        item.percent = `${Math.floor(100 * item.length / total)}%`;
      });
      files.sort((a, b) => b.length - a.length);
      const lines = files.slice(0, max).map(item => `  ${item.file}: ${prettyBytes(item.length)} (${item.percent})`);
      console.error('Total ThreeJS files', files.length);
      console.error(`ThreeJS Rollup Analyzer:\n${lines.join('\n')}`);
    }
  };
}

module.exports = function (entry, dependencies, opt = {}) {
  const inspect = opt.inspect;
  const contents = generateEntry(dependencies || [], opt);
  return rollup({
    input: entry,
    plugins: [
      // Generated entry code
      memory({
        path: entry,
        contents
      }),
      // ThreeJS GLSL stuff
      glsl(),
      inspect ? sizes(opt) : undefined
    ].filter(Boolean)
  }).then(bundle => {
    return bundle.generate({
      sourcemap: opt.sourcemap || 'inline',
      file: opt.generatedFile || 'three.js',
      name: opt.globalName || 'THREE',
      format: opt.outputFormat || 'umd'
    });
  });
};

if (!module.parent) {
  module.exports().then(result => console.log(result.code));
}
