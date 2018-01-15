const tape = require('tape');
const fs = require('fs');
const path = require('path');
const browserify = require('browserify');
const mapLimit = require('map-limit');
const bytes = require('pretty-bytes');
const uglify = require('uglify-js');
const ms = require('pretty-ms');

const plugin = require('../plugin');

const babelify = require('babelify').configure({
  presets: [ 'es2015' ],
  sourceMaps: false
});

const files = [
  'es5.js',
  'globals.js',
  'import-with-gltf.js'
].map(p => path.resolve(__dirname, '../examples/', p));

mapLimit(files, 1, bench, () => console.log('Done.'));

function bench (file, cb) {
  doBundle(false, file, (err) => {
    if (err) return cb(err);
    doBundle(true, file, cb);
  });
}

function doBundle (withOptimize, file, cb) {
  const opts = {
    loose: file.includes('globals')
  };

  const start = Date.now();
  const b = browserify(file, {
    debug: false,
    transform: file.includes('es5') ? undefined : [
      babelify
    ],
    plugin: withOptimize ? [
      [ plugin, opts ]
    ] : undefined
  });
  b.bundle((err, src) => {
    if (err) return cb(err);
    src = src.toString();
    try {
      const min = uglify.minify(src, { mangle: true, compress: { dead_code: true, evaluate: true } });
      src = min.code;
    } catch (err) {
      return cb(err);
    }

    const then = Date.now();
    const time = ms(then - start);
    const name = path.basename(file);
    console.log(`${name} — ${withOptimize ? 'with' : 'without'} optimization: ${bytes(src.length)} (${time})`);
    cb(null);
  });
}
