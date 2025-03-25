import * as THREE from "three";
import WebGL from "three/addons/capabilities/WebGL.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const controlsToggleDiv = document.getElementById("controlsToggle");

if (!WebGL.isWebGL2Available()) {
  const warning = WebGL.getWebGL2ErrorMessage();
  document.body.append(warning);
  throw warning.textContent;
}

const clock = new THREE.Clock();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
// scene.fog = new THREE.Fog(0xffffff, 0, 50);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.append(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.object); // todo: what is this code??
controlsToggleDiv.addEventListener("click", () => {
  controls.lock();
});
controls.addEventListener("lock", function () {
  controlsToggleDiv.style.setProperty("display", "none");
});
controls.addEventListener("unlock", function () {
  controlsToggleDiv.style.removeProperty("display");
});

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

document.addEventListener("keydown", (event) => {
  if (controls.isLocked) {
    event.preventDefault();
  }

  switch (event.code) {
    case "KeyW":
      moveForward = true;
      break;
    case "KeyA":
      moveLeft = true;
      break;
    case "KeyS":
      moveBackward = true;
      break;
    case "KeyD":
      moveRight = true;
      break;
    case "ShiftLeft":
      moveDown = true;
      break;
    case "Space":
      moveUp = true;
  }
});

document.addEventListener("keyup", (event) => {
  if (controls.isLocked) {
    event.preventDefault();
  }

  switch (event.code) {
    case "KeyW":
      moveForward = false;
      break;
    case "KeyA":
      moveLeft = false;
      break;
    case "KeyS":
      moveBackward = false;
      break;
    case "KeyD":
      moveRight = false;
      break;
    case "ShiftLeft":
      moveDown = false;
      break;
    case "Space":
      moveUp = false;
  }
});

controls.addEventListener("unlock", function () {});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// baseplate
const baseplateGeometry = new THREE.BoxGeometry(100, 5, 100);
const baseplateMaterial = new THREE.MeshBasicMaterial({ color: 0xa9a9a9 });
const baseplate = new THREE.Mesh(baseplateGeometry, baseplateMaterial);

scene.add(baseplate);

camera.position.set(0, 50, 100);
camera.lookAt(0, 0, 0);

function animate() {
  if (!controls.isLocked) {
    return;
  }

  const delta = clock.getDelta();

  // todo: calcualte distance travel/speed, I believe we need to do that velocity normalization stuff from the example
  // I saw another game where if you hold w/s and a a/d key you sort of move way faster
  // I believe this was the reason

  if (moveRight) {
    controls.moveRight(32 * delta);
  }

  if (moveLeft) {
    controls.moveRight(-32 * delta);
  }

  if (moveForward) {
    controls.moveForward(32 * delta);
  }

  if (moveBackward) {
    controls.moveForward(-32 * delta);
  }

  if (moveUp) {
    controls.object.position.y += 32 * delta;
  }

  if (moveDown) {
    controls.object.position.y -= 32 * delta;
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
