import * as THREE from "three";
import WebGL from "three/addons/capabilities/WebGL.js";

if (!WebGL.isWebGL2Available()) {
  const warning = WebGL.getWebGL2ErrorMessage();
  document.body.append(warning);
  throw warning.textContent;
}

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.append(renderer.domElement);

// code here
const baseplateGeometry = new THREE.BoxGeometry(100, 5, 100);
const baseplateMaterial = new THREE.MeshBasicMaterial({ color: 0xa9a9a9 });
const baseplate = new THREE.Mesh(baseplateGeometry, baseplateMaterial);
scene.add(baseplate);

camera.position.set(0, 50, 100);
camera.lookAt(0, 0, 0);

function animate() {
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
