const tape = require('tape');
const fs = require('fs');
const path = require('path');
const browserify = require('browserify');
const through = require('through2');
const babelify = require('babelify');

const detect = require('../lib/detect-deps');
const detectGlobals = require('../lib/detect-global-deps');

tape('test dependency finder on ES5 commonJS', t => {
  const filename = path.resolve(__dirname, 'modules/es5.js');
  const str = fs.readFileSync(filename, 'utf-8');

  const results = detect(str, { filename });
  t.deepEqual(results, [ 'WebGLRenderer',
    'RGBFormat',
    'LinearFilter',
    'RGBAFormat',
    'NearestFilter',
    'SphereGeometry',
    'BufferGeometry' ]);
  t.end();
});

tape('test dependency finder on ES6 import', t => {
  const filename = path.resolve(__dirname, 'modules/import.js');
  const str = fs.readFileSync(filename, 'utf-8');

  const results = detect(str, { filename });
  t.deepEqual(results, [ 'Scene',
    'Object3D',
    'WebGLRenderer',
    'LinearFilter',
    'RGBAFormat',
    'RGBFormat' ]);
  t.end();
});

tape('test dependency finder on common ThreeJS example code', t => {
  const filename = path.resolve(__dirname, 'modules/simple.js');
  const str = fs.readFileSync(filename, 'utf-8');

  const results = detect(str, { filename });
  t.deepEqual(results, [ 'WebGLRenderer', 'Scene', 'PerspectiveCamera', 'Mesh', 'MeshNormalMaterial', 'SphereGeometry', 'Vector3' ]);
  t.end();
});

tape('test dependency finder on common ThreeJS example code after babel', t => {
  t.plan(1);

  const filename = path.resolve(__dirname, 'modules/simple.js');
  const babelTransform = babelify.configure({
    presets: [ 'babel-preset-es2015' ],
    sourceMaps: false
  });
  const b = browserify(filename, { transform: [ babelTransform, transform ] });
  b.exclude('three'); // just avoid bundling ThreeJS for speed

  b.bundle((err, src) => {
    if (err) return t.fail(err);
  });

  function transform (file) {
    let code = '';
    return through((chunk, enc, next) => {
      code += chunk;
      next(null, chunk);
    }, (cb) => {
      const results = detect(code, { filename: file });
      t.deepEqual(results, [ 'WebGLRenderer',
        'Scene',
        'PerspectiveCamera',
        'Vector3',
        'SphereGeometry',
        'Mesh',
        'MeshNormalMaterial' ]);
      cb();
    });
  }
});

tape('test dependency finder on ThreeJS examples', t => {
  const filename = path.resolve(__dirname, 'modules/GLTFLoader.js');
  const str = fs.readFileSync(filename, 'utf-8');

  const deps = ['GLTFLoader', 'DefaultLoadingManager', 'LoaderUtils', 'FileLoader', 'Color', 'DirectionalLight', 'PointLight', 'SpotLight', 'AmbientLight', 'MeshPhongMaterial', 'MeshLambertMaterial', 'MeshBasicMaterial', 'ShaderMaterial', 'ShaderLib', 'UniformsUtils', 'Interpolant', 'Matrix3', 'Matrix4', 'Vector2', 'Vector3', 'Vector4', 'Texture', 'NearestFilter', 'LinearFilter', 'NearestMipMapNearestFilter', 'LinearMipMapNearestFilter', 'NearestMipMapLinearFilter', 'LinearMipMapLinearFilter', 'ClampToEdgeWrapping', 'MirroredRepeatWrapping', 'RepeatWrapping', 'AlphaFormat', 'RGBFormat', 'RGBAFormat', 'LuminanceFormat', 'LuminanceAlphaFormat', 'UnsignedByteType', 'UnsignedShort4444Type', 'UnsignedShort5551Type', 'UnsignedShort565Type', 'BackSide', 'FrontSide', 'NeverDepth', 'LessDepth', 'EqualDepth', 'LessEqualDepth', 'GreaterEqualDepth', 'NotEqualDepth', 'AlwaysDepth', 'AddEquation', 'SubtractEquation', 'ReverseSubtractEquation', 'ZeroFactor', 'OneFactor', 'SrcColorFactor', 'OneMinusSrcColorFactor', 'SrcAlphaFactor', 'OneMinusSrcAlphaFactor', 'DstAlphaFactor', 'OneMinusDstAlphaFactor', 'DstColorFactor', 'OneMinusDstColorFactor', 'SrcAlphaSaturateFactor', 'InterpolateSmooth', 'InterpolateLinear', 'InterpolateDiscrete', 'MeshStandardMaterial', 'BufferAttribute', 'TextureLoader', 'InterleavedBuffer', 'InterleavedBufferAttribute', 'Loader', 'DoubleSide', 'sRGBEncoding', 'BufferGeometry', 'Group', 'VertexColors', 'SkinnedMesh', 'Mesh', 'TriangleStripDrawMode', 'TriangleFanDrawMode', 'LineBasicMaterial', 'Material', 'LineSegments', 'Line', 'LineLoop', 'PointsMaterial', 'Points', 'PerspectiveCamera', 'Math', 'OrthographicCamera', 'NumberKeyframeTrack', 'QuaternionKeyframeTrack', 'VectorKeyframeTrack', 'AnimationUtils', 'AnimationClip', 'Bone', 'Object3D', 'PropertyBinding', 'Skeleton', 'Scene'];
  t.deepEqual(detectGlobals(str), deps);
  t.end();
});
