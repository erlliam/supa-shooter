import * as THREE from "three";
import WebGL from "three/addons/capabilities/WebGL.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import soliderUrl from "./models/Soldier.glb";
import RAPIER from "@dimforge/rapier3d-compat";

checkWebGlSupport();

const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  250
);
const renderer = new THREE.WebGLRenderer();
const controls = new PointerLockControls(camera, document.body);
const loader = new GLTFLoader();

await RAPIER.init();
const worldGravity = { x: 0.0, y: -9.81, z: 0.0 };
const world = new RAPIER.World(worldGravity);

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
  const crosshairDiv = document.getElementById("crosshair");
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
    crosshairDiv.style.setProperty("display", "unset");
  });
  controls.addEventListener("unlock", function () {
    crosshairDiv.style.setProperty("display", "none");
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

  document.addEventListener("mousedown", () => {
    if (!lookingAt) {
      return;
    }

    for (const cube of CUBES) {
      if (cube.mesh !== lookingAt.object) {
        continue;
      }

      cube.rigidBody.applyImpulse({ x: 0, y: 5000, z: 0 }, true);

      console.log(cube);
      console.log("hit");
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
  const baseplateColliderDesc = RAPIER.ColliderDesc.cuboid(50, 0, 50);
  const baseplateCollider = world.createCollider(baseplateColliderDesc);
  scene.add(baseplate);
}

function defaultCameraPosition() {
  camera.position.set(0, 50, 75);
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

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0); // -1 to 1 for x and y. 0, 0 is center of screen
let lookingAt;

function animate() {
  const delta = clock.getDelta();

  world.step();

  for (const cube of CUBES) {
    cube.mesh.position.copy(cube.collider.translation());
    cube.mesh.quaternion.copy(cube.collider.rotation());
  }

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children);
  lookingAt = intersects[0];

  if (lookingAt) {
    const color = lookingAt.object.material.color.clone();
    if (color.r !== 1) {
      lookingAt.object.material.color.set(0xff0000);
      setTimeout(() => {
        lookingAt.object.material.color.set(color);
      });
    }
  }

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
function createCube(x, y = 50, z) {
  const cubeMaterial = new THREE.MeshBasicMaterial({
    color: Math.random() * 0xffffff,
  });
  const cube = new THREE.Mesh(CUBE_GEOMETRY, cubeMaterial);
  const randomX = x ?? Math.floor(Math.random() * 100) - 50;
  const randomZ = z ?? Math.floor(Math.random() * 100) - 50;
  cube.position.set(randomX - 4, y, randomZ - 4);

  const cubeRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(
    ...cube.position.toArray()
  );
  const cubeColliderDesc = RAPIER.ColliderDesc.cuboid(4, 4, 4);

  const cubeRigidBody = world.createRigidBody(cubeRigidBodyDesc);
  const cubeCollider = world.createCollider(cubeColliderDesc, cubeRigidBody);

  CUBES.push({ rigidBody: cubeRigidBody, collider: cubeCollider, mesh: cube });
  scene.add(cube);
}

function generateRandomCubes() {
  for (let i = 0; i < 25; i++) {
    createCube();
  }
}

function main() {
  initializeScene();
  initializeRenderer();
  initializeControls();

  defaultCameraPosition();
  loadLights();

  // loadSolider();

  createBaseplate();
  generateRandomCubes();

  renderer.setAnimationLoop(animate);
}

main();
