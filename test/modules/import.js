import {
  Scene,
  Object3D
} from 'three';

import THREEDefault, { WebGLRenderer as Renderer, LinearFilter } from 'three';
import * as THREE from 'three';

const a = THREE.RGBFormat;

module.exports = function () {
  return THREEDefault.RGBAFormat;
};
