import * as THREE from "three";
import { loadModel } from "./utils/threeModels.js";
import * as CANNON from "cannon-es";
import { createThreePointLighting } from "./utils/threePointLighting.js";
import { Player } from "./utils/lockedFirstPersonCam/player.js";

import "toastify-js/src/toastify.css";

function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  loadingScreen.style.opacity = 1;

  const fadeEffect = setInterval(() => {
    if (loadingScreen.style.opacity > 0) {
      loadingScreen.style.opacity -= 0.1;
    } else {
      clearInterval(fadeEffect);
      loadingScreen.style.display = "none";
    }
  }, 50); // 50ms for smooth fade
}

const scene = new THREE.Scene();
const world = new CANNON.World();
world.gravity.set(0, 0, 0);
world.doors = [];
const renderer = new THREE.WebGLRenderer();
renderer.setClearColor("#000");
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const player = new Player(scene, world);
const mainDungeonURL = new URL("./src/floor2.glb", import.meta.url);

let treasure_wall_gate_left = [];
let treasure_wall_gate_right = [];

async function createMainDungeon() {
  const position = new THREE.Vector3(0, 0, 0);

  // Show loading screen
  document.getElementById("loading-screen").style.display = "flex";

  try {
    const { model } = await loadModel(mainDungeonURL.href, position, scene);

    // Hide loading screen smoothly after model is loaded
    hideLoadingScreen();

    model.traverse((child) => {
      if (child.isMesh) {
        if (child.name.includes("wall_doorway_door_treasure_left_ready")) {
          treasure_wall_gate_left.push(child);
        }
        if (child.name.includes("wall_doorway_door_treasure_right_ready")) {
          treasure_wall_gate_right.push(child);
        }

        if (child.name.includes("wall") || child.name.includes("pillar")) {
          addPhysicsToMesh(child, world, { mass: 0 });
        }

        if (child.name.includes("wall_doorway_door")) {
          console.log(child.name);
          world.doors.push(child);
        }
      }
    });

    console.log("World doors:", world.doors);
  } catch (error) {
    console.log("Error loading dungeon", error);
    hideLoadingScreen(); // Hide loading screen even if there’s an error
  }
}

createMainDungeon();

const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x808080,
  side: THREE.DoubleSide,
});
const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);

// Rotate the floor to be horizontal
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.y = 0; // Adjust height if necessary
scene.add(floorMesh);
floorMesh.visible = false;

const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({
  mass: 0, // mass = 0 makes the body static
  shape: floorShape,
  position: new CANNON.Vec3(0, 0, 0),
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Align the plane with the floor
world.addBody(floorBody);

function addPhysicsToMesh(mesh, world, options) {
  // Create a Box3 bounding box that fits the mesh exactly
  const boundingBox = new THREE.Box3().setFromObject(mesh);

  // Get the size and center of the bounding box
  const size = boundingBox.getSize(new THREE.Vector3());
  const center = boundingBox.getCenter(new THREE.Vector3());

  // Create a Cannon.js box shape based on the exact size of the bounding box
  const shape = new CANNON.Box(
    new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
  );

  // Create a physics body for the mesh with the exact shape and position
  const body = new CANNON.Body({
    mass: options.mass, // Use 0 for static objects like walls
    shape: shape,
    position: new CANNON.Vec3(center.x, center.y, center.z),
  });

  // Add the physics body to the world
  world.addBody(body);

  // Optional: Add collision detection for the player
  body.addEventListener("collide", (event) => {
    if (event.body === player.body) {
      console.log("Player collided with a wall");
    }
  });

  mesh.userData.physicsBody = body;
}

createThreePointLighting(scene);

document.body.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    player.controls.lock();
  }
});

let previousTime = performance.now();

function storeCameraLookAt(camera) {
  // Create a direction vector
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  // Calculate the global look-at position
  const globalLookAt = camera.position
    .clone()
    .add(direction.multiplyScalar(10)); // Multiply by a scalar to move the point further away

  // Store the global look-at position
  localStorage.setItem("player_lookAt", JSON.stringify(globalLookAt));
}

function onMouseDown(event) {
  if (player.controls.isLocked && player.selectedDoor) {
    const position = {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
    };

    const lookAt = new THREE.Vector3();
    player.camera.getWorldDirection(lookAt);

    localStorage.setItem("player_pos", JSON.stringify(position));
    storeCameraLookAt(player.camera);
    // then guide the window to kruskal.html
    if (player.selectedDoor.name.includes("kruskal"))
      window.location.href = "Kruskal.html";
    if (player.selectedDoor.name.includes("heapsort"))
      window.location.href = "heapsort.html";
    if (player.selectedDoor.name.includes("prim"))
      window.location.href = "Prim.html";
  }
}

document.addEventListener("mousedown", onMouseDown);

// Handle window resize
window.addEventListener("resize", () => {
  player.camera.aspect = window.innerWidth / window.innerHeight;
  player.camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "F5") {
    event.preventDefault(); // Prevent the default F5 behavior
    localStorage.clear(); // Clear localStorage
    sessionStorage.clear();
    window.location.reload(); // Reload the page
  }
});

// Mini-map
const miniMapCamera = new THREE.OrthographicCamera(
  150 / -2, // left
  150 / 2, // right
  150 / 2, // top
  150 / -2, // bottom
  1, // near clipping plane
  1000 // far clipping plane
);
const scale = 50; // Reduce this value to zoom in
miniMapCamera.left = -scale;
miniMapCamera.right = scale;
miniMapCamera.top = scale;
miniMapCamera.bottom = -scale;
miniMapCamera.updateProjectionMatrix();
miniMapCamera.position.set(0, 250, -10); // Position it above the dungeon
miniMapCamera.lookAt(new THREE.Vector3(0, 0, -10)); // Look directly down
const miniMapRenderer = new THREE.WebGLRenderer({ alpha: true });
miniMapRenderer.setSize(350, 350); // Size of the mini-map
miniMapRenderer.domElement.id = "miniMapCanvas";

document.body.appendChild(miniMapRenderer.domElement); // Append it to the body or a specific element
miniMapRenderer.domElement.style.position = "absolute";
miniMapRenderer.domElement.style.top = "15px";
miniMapRenderer.domElement.style.left = "15px";

const mapBackground = new THREE.Mesh(
  new THREE.CircleGeometry(100, 32),
  new THREE.MeshBasicMaterial({ color: "#868e96" })
);
mapBackground.rotation.x = -Math.PI / 2;
scene.add(mapBackground);
mapBackground.position.y = player.camera.position.y;
const playerMarker = new THREE.Mesh(
  new THREE.CircleGeometry(3, 32),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
playerMarker.rotation.x = -Math.PI / 2; // Rotate the marker to face up
scene.add(playerMarker);

function updatePlayerMarker() {
  playerMarker.position.copy(player.camera.position); // Directly use the camera's position
  playerMarker.position.y = player.camera.position.y + 0.04;
}
const FIXED_TIME_STEP = 1 / 60; // 60 updates per second
let accumulatedTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now();
  let dt = (currentTime - previousTime) / 1000; // Convert ms to seconds
  previousTime = currentTime;

  // Cap dt to prevent large jumps in physics (e.g., if game lags)
  dt = Math.min(dt, 0.1); // Max 100ms per frame

  // Accumulate time and perform fixed steps
  accumulatedTime += dt;
  while (accumulatedTime >= FIXED_TIME_STEP) {
    world.step(FIXED_TIME_STEP); // Always use fixed step
    player.update(FIXED_TIME_STEP); // Update player at fixed step
    accumulatedTime -= FIXED_TIME_STEP;
  }
  player.updateRaycaster(world);
  // Update player marker and mini-map camera position based on player position
  updatePlayerMarker();
  // updateMiniMap();

  renderer.render(scene, player.camera);
  previousTime = currentTime;

  miniMapRenderer.render(scene, miniMapCamera); // Mini-map rendering
}
animate();
