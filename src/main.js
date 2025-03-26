import * as THREE from "three";
import WebGL from "three/addons/capabilities/WebGL.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import soliderUrl from "./models/Soldier.glb";

checkWebGlSupport();

const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
const renderer = new THREE.WebGLRenderer();
const controls = new PointerLockControls(camera, document.body);
const loader = new GLTFLoader();

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let moveUp = false;
let moveDown = false;

function initializeScene() {
  scene.background = new THREE.Color(0x87ceeb);
}

function initializeRenderer() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  document.body.append(renderer.domElement);
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function initializeControls() {
  // wtf is happening, very weird behavior with div created dynamically.
  const controlsToggleDiv = document.createElement("div");
  controlsToggleDiv.style.position = "fixed";
  controlsToggleDiv.style.inset = "0";
  controlsToggleDiv.style.background = "rgba(0, 0, 0, 0.5)";
  controlsToggleDiv.style.zIndex = "2";
  controlsToggleDiv.style.display = "flex";
  controlsToggleDiv.style.alignItems = "center";
  controlsToggleDiv.style.justifyContent = "center";
  controlsToggleDiv.textContent = "Click to return to the game";
  document.body.append(controlsToggleDiv);

  controlsToggleDiv.addEventListener("click", () => {
    controls.lock();
  });
  controls.addEventListener("lock", function () {
    controlsToggleDiv.style.setProperty("display", "none");
  });
  controls.addEventListener("unlock", function () {
    controlsToggleDiv.style.setProperty("display", "flex");
  });
  scene.add(controls.object);

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
}

function checkWebGlSupport() {
  if (!WebGL.isWebGL2Available()) {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.body.append(warning);
    console.log("wtf");
    throw warning.textContent;
  }
}

function loadLights() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(-60, 100, -10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;
  scene.add(dirLight);
}

function createBaseplate() {
  const baseplateGeometry = new THREE.PlaneGeometry(100, 100);
  const baseplateMaterial = new THREE.MeshBasicMaterial({ color: 0xa9a9a9 });
  const baseplate = new THREE.Mesh(baseplateGeometry, baseplateMaterial);
  baseplate.rotation.x = -Math.PI / 2;
  scene.add(baseplate);
}

function defaultCameraPosition() {
  camera.position.set(0, 10, 10);
  camera.lookAt(0, 0, 0);
}

function loadSolider() {
  loader.load(soliderUrl, (gltf) => {
    const model = gltf.scene;
    model.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
      }
    });
    scene.add(model);
  });
}

function animate() {
  const delta = clock.getDelta();

  rotateCubes(delta);

  if (controls.isLocked) {
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
  }

  renderer.render(scene, camera);
}

const CUBES = [];
const CUBE_GEOMETRY = new THREE.BoxGeometry(8, 8, 8);
function createCube() {
  const cubeMaterial = new THREE.MeshBasicMaterial({
    color: Math.random() * 0xffffff,
  });
  const cube = new THREE.Mesh(CUBE_GEOMETRY, cubeMaterial);
  const randomX = Math.floor(Math.random() * 100) - 50;
  const randomY = Math.floor(Math.random() * 100) - 50;
  cube.position.set(randomX - 4, 4, randomY - 4);
  CUBES.push(cube);
  scene.add(cube);
}

function generateRandomCubes() {
  for (let i = 0; i < 25; i++) {
    createCube();
  }
}

function rotateCubes(delta) {
  for (const cube of CUBES) {
    cube.rotation.y += (Math.PI / 2) * delta;
  }
}

function main() {
  initializeScene();
  initializeRenderer();
  initializeControls();
  createBaseplate();
  generateRandomCubes();
  loadLights();
  loadSolider();
  defaultCameraPosition();
  renderer.setAnimationLoop(animate);
}

main();
