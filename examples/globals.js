// Somewhere at the root of your app
global.THREE = require('three');

// Now the rest of your modules/files can use ThreeJS
// without having to import/require it all the time.
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(256, 256);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
camera.position.z = -4;
camera.lookAt(new THREE.Vector3());

const geometry = new THREE.SphereGeometry(1, 32, 32);
const mesh = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());
scene.add(mesh);

renderer.render(scene, camera);

document.body.appendChild(renderer.domElement);
