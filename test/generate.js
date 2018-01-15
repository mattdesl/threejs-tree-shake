const tape = require('tape');

const generate = require('../lib/generate-three-entry');

tape('generates ThreeJS entry', t => {
  const result = generate([ 'RGBFormat', 'RGBAFormat', 'MeshNormalMaterial', 'SphereGeometry', 'QuadraticBezierCurve3', 'WebGLRenderer' ]);
  t.equals(result.trim(), `import './polyfills.js';
export { WebGLRenderer } from './renderers/WebGLRenderer.js';
export { SphereGeometry } from './geometries/SphereGeometry.js';
export { MeshNormalMaterial } from './materials/MeshNormalMaterial.js';
export { QuadraticBezierCurve3 } from './extras/curves/QuadraticBezierCurve3.js';
export { RGBFormat, RGBAFormat } from './constants.js';`);
  t.end();
});

tape('generates ThreeJS entry', t => {
  const result = generate([ 'SphereBufferGeometry', 'SphereGeometry', 'QuadraticBezierCurve3', 'WebGLRenderer' ], {
    legacy: true,
    polyfills: false
  });
  t.equals(result.trim(), `export { WebGLRenderer } from './renderers/WebGLRenderer.js';
export { SphereGeometry, SphereBufferGeometry } from './geometries/SphereGeometry.js';
export { QuadraticBezierCurve3 } from './extras/curves/QuadraticBezierCurve3.js';
export * from './Three.Legacy.js';`);
  t.end();
});

tape('handles BufferAttribute', t => {
  const result = generate([ 'Float32BufferAttribute', 'Uint8ClampedBufferAttribute' ], {
    polyfills: false
  });
  t.equals(result.trim(), `export * from './core/BufferAttribute.js';`);
  t.end();
});
