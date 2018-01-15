const fromString = require('from2-string');
const path = require('path');
const through = require('through2');
const resolve = require('resolve');
const duplexer = require('duplexer2');
const concatStream = require('concat-stream');

const detectImports = require('./lib/detect-deps');
const detectGlobals = require('./lib/detect-global-deps');
const bundleThreeJS = require('./lib/bundle-three');

module.exports = function (bundler, opts = {}) {
  const basedir = opts.basedir || process.cwd();
  const moduleName = opts.moduleName || 'three';
  const globalName = opts.globalName || 'THREE';

  // Whether we are importing each module, or just relying on THREE globally
  const isGlobalUsage = opts.l || opts.loose;
  const isInsertFront = typeof opts.isInsertFront === 'boolean' ? opts.isInsertFront : isGlobalUsage;

  // Probably a better way... meh
  const MAGIC_STRING = isInsertFront
    ? `module.exports = window.${globalName};`
    : '__$$MAGIC_THREEJS_TREE_SHAKE_REPLACEMENT_STRING$$__';

  // Pretend the file comes from node_modules so things like babelify
  // won't try to transform it if non-global
  const generatedFile = 'node_modules/three/bin/three.js';

  const threePath = opts.threePath || path.dirname(resolve.sync('three/package.json', { basedir }));
  const threeExamples = path.resolve(threePath, 'examples');
  const baseNodeModules = path.resolve(basedir, 'node_modules');

  // how far into node_modules we should look
  const isDeepSearch = opts.global || opts.g; // by default, this may be overkill
  const isExamplesSearch = opts.examples !== false;
  const global = isDeepSearch || isExamplesSearch;

  const ignoreDependencies = [].concat(opts.ignoreDependencies || []).filter(Boolean);
  const includeDependencies = [].concat(opts.includeDependencies || []).filter(Boolean);
  let allDependencies = [];
  const threeInput = fromString(MAGIC_STRING);
  bundler.exclude(moduleName);
  bundler.require(threeInput, { expose: moduleName, file: generatedFile });
  bundler.transform(transform, { global });

  bundler.on('reset', addHooks);
  addHooks();

  function addHooks () {
    const fn = isInsertFront ? inserter : replacer;
    bundler.pipeline.get('wrap').push(fn());
  }

  function transform (file, opt) {
    // Generated index
    if (file === generatedFile) {
      // Ignore generated 'three' module
      return through();
    }
    // ignore JSON
    if (/\.json$/i.test(file)) {
      return through();
    }

    const isExample = file.startsWith(threeExamples);
    const isDeep = file.startsWith(baseNodeModules);

    if (isExample) {
      // only detect in example if desired...
      return isExamplesSearch ? detect(file, true) : through();
    } else if (isDeep) {
      // only detect in deep modules if desired, for perf
      return isDeepSearch ? detect(file, true) : through();
    } else {
      // any other local modules, let's search them...
      return detect(file, isGlobalUsage);
    }
  }

  function replacer () {
    const output = through();
    const input = concatStream(function (buf) {
      let bundleSrc = buf.toString();
      getThreeSrc().then(threeSrc => {
        bundleSrc = bundleSrc.replace(MAGIC_STRING, () => threeSrc);
        output.push(bundleSrc);
        output.push(null);
      });
    });
    return duplexer(input, output);
  }

  function inserter () {
    let first = true;
    return through(function (chunk, enc, next) {
      if (first) {
        first = false;
        getThreeSrc().then(code => {
          this.push(Buffer.from(code));
          this.push(chunk);
          next(null);
        });
      } else {
        next(null, chunk);
      }
    });
  }

  function getThreeSrc () {
    const entry = path.resolve(threePath, 'src/Index.js');
    const generateOpts = Object.assign({}, opts, {
      basedir,
      threePath,
      generatedFile,
      sourcemap: false,
      outputFormat: 'umd',
      globalName
    });
    // filter out unwanted deps
    allDependencies = allDependencies.filter(dep => {
      return !ignoreDependencies.includes(dep);
    });
    // add additional deps
    includeDependencies.forEach(dep => {
      if (!allDependencies.includes(dep)) allDependencies.push(dep);
    });
    if (opts.debug) {
      console.error('All ThreeJS dependencies:\n' + allDependencies.join('\n'));
    }
    return bundleThreeJS(entry, allDependencies, generateOpts)
      .then(result => {
        return result.code;
      });
  }

  function detect (file, searchGlobalUsage) {
    var code = '';
    return through((chunk, enc, next) => {
      code += chunk.toString();
      next(null, chunk);
    }, next => {
      // Only run on code that has 'three' in it somewhere
      if (code && (code.includes(globalName) || code.includes(moduleName))) {
        gatherImports(file, code, searchGlobalUsage);
      }
      next();
    });
  }

  function gatherImports (file, code, searchGlobalUsage) {
    const opts = {
      filename: file,
      globalName,
      moduleName
    };

    let dependencies;
    if (searchGlobalUsage) {
      dependencies = detectGlobals(code, opts);
    } else {
      dependencies = detectImports(code, opts);
    }

    dependencies.forEach(dep => {
      if (!allDependencies.includes(dep)) allDependencies.push(dep);
    });
  }
};
