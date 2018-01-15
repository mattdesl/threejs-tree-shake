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
