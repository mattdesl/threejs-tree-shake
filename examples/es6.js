// can also use wildcard:
// import * as THREE from 'three';

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Vector3,
  SphereGeometry,
  Mesh,
  MeshNormalMaterial
} from 'three';

var renderer = new WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(256, 256);

var scene = new Scene();
var camera = new PerspectiveCamera(45, 1, 0.01, 100);
camera.position.z = -4;
camera.lookAt(new Vector3());

var geometry = new SphereGeometry(1, 32, 32);
var mesh = new Mesh(geometry, new MeshNormalMaterial());
scene.add(mesh);

renderer.render(scene, camera);

document.body.appendChild(renderer.domElement);
