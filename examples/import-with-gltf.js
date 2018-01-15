// To use 3rd party ThreeJS libraries,
// you will need to require (not import)
// it and assign it to global THREE
// at the top of your app.
global.THREE = require('three');

// Then you can require your vendor libs here...
require('three/examples/js/loaders/GLTFLoader.js');

// It will end up on the global THREE object:
console.log(THREE.GLTFLoader);

// Now you can use CommonJS or ES6 import/export as usual
// for tree shaking...
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Mesh,
  MeshNormalMaterial,
  SphereGeometry,
  Vector3
} from 'three';

const renderer = new WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(256, 256);

const scene = new Scene();
const camera = new PerspectiveCamera(45, 1, 0.01, 100);
camera.position.z = -4;
camera.lookAt(new Vector3());

const geometry = new SphereGeometry(1, 32, 32);
const mesh = new Mesh(geometry, new MeshNormalMaterial());
scene.add(mesh);

renderer.render(scene, camera);

document.body.appendChild(renderer.domElement);
