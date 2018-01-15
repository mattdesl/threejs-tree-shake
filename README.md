# threejs-tree-shake

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

A browserify plugin to tree-shake and optimizes a ThreeJS application.

> :rotating_light: Still highly experimental and unstable, but feel free to try it out. Tested with browserify@15 and Three r89.

This parses your source AST to find which ThreeJS modules your app actually uses. Then it runs [rollup](https://github.com/rollup/rollup) on the fly to generate a much smaller ThreeJS module. It's not ideal, and may break with future ThreeJS changes or in certain applications.

After minification on a simple example app, the bundle size goes from 533 kB to 320 kB. Other apps may have more or less savings depending on how many modules you require.

## Quick Start

This works with CommonJS `require` or relying on `THREE` as a global namespace. It also works with `import` statements, although typically you will transpile them with the `babelify` transform.

Here is an example with CommonJS:

```js
var THREE = require('three');

var renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(256, 256);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
camera.position.z = -4;
camera.lookAt(new THREE.Vector3());

var geometry = new THREE.SphereGeometry(1, 32, 32);
var mesh = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());
scene.add(mesh);

renderer.render(scene, camera);

document.body.appendChild(renderer.domElement);
```

Now, you will need to install the tool in your local repo.

```sh
# make sure three is installed as a local dependency
# this way, you can call require('three')
npm install three --save

# install the necessary tooling
npm install browserify threejs-tree-shake --save-dev

# run browserify to generate a final bundle
npx browserify myApp.js -p threejs-tree-shake > bundle.js
```

> :bulb: In this case the `npx` command will run our locally-installed tools (i.e. within node_modules folder).

The final bundle will be much smaller than usual since many ThreeJS modules will get discarded (e.g. various materials, constants, geometries, helpers, and legacy functions you won't need).

## Loose Search

In many cases you will have a ThreeJS app that doesn't `import` or `require` ThreeJS in every file (e.g. if you are using a `<script>` tag). In this case, you can turn on loose dependency searching, which searches for `THREE.SomeDependency` in your files instead of checking the AST.

For example, your files all look like this, without any imports:

`app.js`

```js
const sphere = new THREE.SphereGeometry(1, 32, 32);
...
```

For this plugin to work, you will need to require and assign ThreeJS at the very root of your module, *then* import the rest of your app. This way ThreeJS gets bundled inside your final bundle, rather than relying on a separate script tag.

`index.js`

```js
// assign to globals
global.THREE = require('three');

// now require your app
require('./app.js');
```

It's recommended you use `require` here instead of `import`, since Babel will re-write your import statements to appear before any assignments.

Now, when you use the tool, make sure to pass `--loose` (or `-l`), or `{ loose: true }` to turn on this mode.

```sh
npx browserify index.js -p [ threejs-tree-shake --loose ] > bundle.js
```

## Including ThreeJS Examples

If you'd like to include ThreeJS examples, you can organize your code like so:

```js
// assign to global THREE namespace
global.THREE = require('three');

// here we include any ThreeJS example utilities
// they will get assigned onto THREE namespace
require('three/examples/js/loaders/GLTFLoader.js');
require('three/examples/js/utils/GeometryUtils.js');
// ... etc

// now require your app
require('./app.js');
```

Then, in another file, you can either use loose/global style, just relying on `THREE.WebGLRenderer` and `THREE.GLTFLoader`, or you can continue to use imports and everything will work as expected:

```js
import { GLTFLoader, WebGLRenderer } from 'three';
...
```

## Benchmarks

As a benchmark, the scripts in the example folder render a 3D sphere. One script includes GLTFLoader, and thus all its dependencies, to test the bloat with a more practical example.

You can see the variants in [./examples](./examples) showing the different `require()` styles. Here are the minified bundle sizes and build times:

```sh
es5.js — without optimization: 533 kB (5.7s)
es5.js — with optimization: 320 kB (3.7s)
globals.js — without optimization: 533 kB (5s)
globals.js — with optimization: 321 kB (3.2s)
import-with-gltf.js — without optimization: 561 kB (5.3s)
import-with-gltf.js — with optimization: 404 kB (4.9s)
```

See also [Real-World Benchmarks](#real-world-benchmarks).

## Options

The plugin has the following options:

- `basedir` - the dir to resolve `'three'` module, default cwd
- `moduleName` - the default name of ThreeJS in requires, default `'three'`
- `globalName` - the default name of THREE global namespace, default `'THREE'`
- `threePath` - the path to ThreeJS and its `src` file, default resolves to `path.dirname(require('three/package.json'))`
- `loose`, `l` - turn on loose mode for searching dependencies, default false
- `isInsertFront` - whether to pre-pend ThreeJS to front of bundle, default false unless loose is enabled
- `global` - apply search across all node_modules as well, default false for performance & robustness reasons. Turn this on if you have a 3rd party dependency that includes some `THREE.FooBar` statements (global style)
- `examples` - apply search across all `three/examples/js` files as well, default true
- `ignoreDependencies` - an array of dependency names (e.g. `"LinearFilter"` or `"SphereGeometry"`) to strip from bundle
- `includeDependencies` - an array of dependency names to include in the bundle
- `debug` - write all the matched dependencies to stderr before bundling
- `inspect` - true to visualize ThreeJS file size breakdown
- `babel` - options passed to babel `transform` when parsing AST
- `polyfills` - include ThreeJS polyfills, default true
- `legacy` - include `Three.Legacy` file, default false as it tends to bloat filesize dramatically

## Implementation Details

### Dependency Tracking

It collects dependencies using AST inspection, so it can handle all of the following cases:

```js
import { WebGLRenderer, Scene, Object3D } from 'three';
import * as THREE from 'three';
const { LinearFilter } = require('three');
const NearestFilter = require('three').NearestFilter;
const _three = require('three');
const sphereGeom = new _three.SphereGeometry(1);
const formats = [ THREE.RGBFormat, THREE.RGBAFormat ];
const filters = [ NearestFilter, LinearFilter ]
```

The above code needs ThreeJS to bundle the following modules and constants:

```js
WebGLRenderer, Scene, Object3D, LinearFilter, NearestFilter,
SphereGeometry, RGBFormat, RGBAFormat
```

The `--loose` and `-l` flags will only search global usage of ThreeJS, which relies on regex and thus may be less robust (e.g. will also match inside strings). However, this may be useful if your entire app is already written with `THREE.WebGLRenderer` style, and without any import or `require('three')` statements at the top of each file.

Files required from `three/examples/...` and `node_modules/...` paths will always be detected using a global pattern, so for example including GLTFLoader in your bundle will also pick up all its necessary dependencies.

By default, this tool strips the Three.Legacy features out since they introduce a large file bloat. You can pass `--legacy` or `{ legacy: true }` to maintain them.

### Bundling on the Fly

We use Rollup to bundle on the fly, generating an entry point for the ThreeJS source code with only the modules needed. The tool must be able to find a ThreeJS `src/` file, which by default will look in the resolved `node_modules/three/src` folder.

### Final Replacement

Once we have the final UMD bundle, we have two options:

- Prepend the bundle with the tree-shaked ThreeJS, which will assign it to global scope. Replace the required `'three'` module with a simple `module.exports = window.THREE;`.
- Replace the required `'three'` module with the entire UMD ThreeJS code, which may allow for further optimization (e.g. flat packing bundle). This also has the benefit of not leaking ThreeJS to window.

By default, in loose mode it will just prepend the bundle and assign THREE to global scope, but in strict (default) mode it will try to use the latter strategy.

## Real-World Benchmarks

I also tested this in a real ThreeJS application: [TAIGA](https://christmasexperiments.com/2017/19/taiga/). Without ThreeJS tree shaking, the final bundle was 773 kB after minify. With tree shaking, the final bundle is 590 kB.

Here is my browserify settings, all those plugins/transforms will need to be installed locally as well:

```js
browserify('src/index.js')
  .transform('babelify')
  .transform('glslify')
  .transform('unassertify', { global: true })
  .transform('envify', { global: true })
  .transform('unreachable-branch-transform', { global: true })
  .plugin('threejs-tree-shake', {
    loose: true, // ignore AST stuff
    global: true, // for third-party modules
    includeDependencies: [
      // ... if any are missing
    ],
    ignoreDependencies: [
      // ... remove a few extras like Skeleton
      // GLTFLoader will include them but your app
      // may not need them!
    ]
  })
  // apply more optimizations
  .plugin('bundle-collapser/plugin')
  .plugin('common-shakeify')
  .plugin('browser-pack-flat/plugin')
  .bundle().pipe(process.stdout);
```

## FAQ

### Do I really need this?

A 50-200 kB bundle size difference is rather small, and in most cases you probably shouldn't bother employing this tool.

### Doesn't Webpack and Rollup already handle tree-shaking?

This is purpose built for ThreeJS's rather unique architecture — you will find only small savings with typical tree-shakers.

### Why doesn't this work with Webpack/Rollup/Parcel/whatever?

It's open source, feel free to fork and write your own implementation on top of your favourite bundler.

### Is this an insane hack?

Yes.

## License

MIT, see [LICENSE.md](http://github.com/mattdesl/threejs-tree-shake/blob/master/LICENSE.md) for details.
