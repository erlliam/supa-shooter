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
    }
  });
}

function checkWebGlSupport() {
  if (!WebGL.isWebGL2Available()) {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.body.append(warning);
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

const offset = 0.01;
const characterRigidBody = world.createRigidBody(
  RAPIER.RigidBodyDesc.kinematicPositionBased()
);
const characterCollider = world.createCollider(
  RAPIER.ColliderDesc.capsule(2, 1).setTranslation(0, 25, 0),
  characterRigidBody
);
const characterController = world.createCharacterController(offset);
characterController.setApplyImpulsesToDynamicBodies(true);

let jumping = false;
let jumpStart;
let jumpEnd;
let canJump = true;

function animate() {
  const delta = clock.getDelta();

  // really should add a collider with rapier js that's event based and remove the stuff when it touches or add the player
  for (const child of scene.children) {
    if (child.isMesh) {
      if (child.position.y < -25) {
        child.geometry.dispose();
        scene.remove(child);
      }
    }
  }

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

  const cameraRotation = camera.rotation.clone();
  let forward = new THREE.Vector3(0, 0, -1).applyEuler(cameraRotation); // Move forward/backward in camera's z-axis
  forward.y = 0;
  let right = new THREE.Vector3(1, 0, 0).applyEuler(cameraRotation); // Move left/right in camera's x-axis
  right.y = 0;
  const grounded = characterController.computedGrounded();

  const velocity = new THREE.Vector3();

  if (controls.isLocked) {
    const desiredTranslation = new RAPIER.Vector3(0, 0, 0);
    if (moveRight) {
      velocity.add(right);
    }

    if (moveLeft) {
      velocity.add(right.negate());
    }

    if (moveForward) {
      velocity.add(forward);
    }

    if (moveBackward) {
      velocity.add(forward.negate());
    }

    if (moveUp && grounded && canJump) {
      canJump = false;
      jumping = true;
      jumpStart = performance.now();
      jumpEnd = jumpStart + 350;
    }
    // if (moveDown) {
    //   velocity.y -= 1;
    // }

    velocity.normalize();

    if (performance.now() >= jumpEnd && jumping) {
      jumping = false;
      setTimeout(() => {
        canJump = true;
      }, 200);
    }

    if (jumping) {
      let progress = (performance.now() - jumpStart) / 350; // jump takes 300ms, normalize progress 0 - 1
      let scaledForce = 50 * (1 - progress);
      desiredTranslation.y = scaledForce * delta; // apply this over like 300 ms
    } else {
      desiredTranslation.y = -9.81 * 5 * delta;
    }

    desiredTranslation.x = velocity.x * 16 * delta;
    desiredTranslation.z = velocity.z * 16 * delta;

    characterController.computeColliderMovement(
      characterCollider,
      desiredTranslation
    );
    const computedMovement = characterController.computedMovement();
    const currentPosition = characterRigidBody.translation();

    characterRigidBody.setNextKinematicTranslation(
      new RAPIER.Vector3(
        currentPosition.x + computedMovement.x,
        currentPosition.y + computedMovement.y,
        currentPosition.z + computedMovement.z
      )
    );
  }

  let currentPosition = characterCollider.translation();
  if (currentPosition.y < -25) {
    characterRigidBody.setNextKinematicTranslation(
      new RAPIER.Vector3(0, 25, 0)
    );
    currentPosition = characterCollider.translation();
  }

  camera.position.set(currentPosition.x, currentPosition.y, currentPosition.z);

  world.step();

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
