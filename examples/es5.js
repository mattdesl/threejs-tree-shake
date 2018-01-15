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
