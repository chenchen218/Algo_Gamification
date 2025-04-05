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
    if (
      player.selectedDoor &&
      player.selectedDoor.name &&
      player.selectedDoor.name.includes("bucketsort")
    ) {
      window.location.href = "bucketsort.html";
    }

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
const mainDungeonURL = new URL(
  "./src/main_dungeon_v4_compressed.glb",
  import.meta.url
);

const floor1URL = new URL("./src/floor1.glb", import.meta.url);

const floor2URL = new URL("./src/floor2.glb", import.meta.url);

let treasure_wall_gate_left = [];
let treasure_wall_gate_right = [];

// Global variables to track door positions in the main dungeon
let mainDungeonDoorPosition = null;
let mainDungeonDoorDirection = new THREE.Vector3(0, 0, 1); // Default direction

// Global variable to track which door leads to our new floors
let newFloorsEntryDoor = null;

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

          // Find a suitable door to connect our new floors
          // Let's use the first door that doesn't have a specific algorithm assigned
          if (
            !mainDungeonDoorPosition &&
            !child.name.includes("kruskal") &&
            !child.name.includes("heapsort") &&
            !child.name.includes("prim") &&
            !child.name.includes("bucketsort")
          ) {
            mainDungeonDoorPosition = child.position.clone();

            // Determine the door's facing direction
            // This is a simplification - you might need to adjust based on your model
            // We're assuming doors face outward from the center of the dungeon
            mainDungeonDoorDirection = new THREE.Vector3(
              mainDungeonDoorPosition.x,
              0,
              mainDungeonDoorPosition.z
            ).normalize();

            console.log("Selected door for new floors:", child.name);
            console.log("Door position:", mainDungeonDoorPosition);
            console.log("Door direction:", mainDungeonDoorDirection);

            // Mark this door as leading to our new floors
            child.name += "_to_new_floors";
          }
        }
      }
    });

    console.log("World doors:", world.doors);

    // Now create the floors in a fixed position
    await createFloors();
  } catch (error) {
    console.log("Error loading dungeon", error);
    hideLoadingScreen(); // Hide loading screen even if there's an error
  }
}

async function createFloors() {
  // Position floor1 in a specific location that won't overlap
  const floor1Position = new THREE.Vector3(50, 0, 0); // 50 units to the right

  // Position floor2 directly above floor1
  const floor2Position = new THREE.Vector3(50, 5, 0); // Same X,Z as floor1, 5 units higher

  try {
    // Load first floor
    const { model: floor1Model } = await loadModel(
      floor1URL.href,
      floor1Position,
      scene
    );
    console.log("Floor 1 loaded successfully");

    // Load second floor
    const { model: floor2Model } = await loadModel(
      floor2URL.href,
      floor2Position,
      scene
    );
    console.log("Floor 2 loaded successfully");

    // Process the models
    [floor1Model, floor2Model].forEach((model, index) => {
      // Ensure the model is at the correct position
      model.position.copy(index === 0 ? floor1Position : floor2Position);

      model.traverse((child) => {
        if (child.isMesh) {
          // Add physics to walls and structural elements
          if (
            child.name.includes("wall") ||
            child.name.includes("pillar") ||
            child.name.includes("floor") ||
            child.name.includes("ceiling")
          ) {
            addPhysicsToMesh(child, world, { mass: 0 });
          }

          // Add doors to the world.doors array
          if (child.name.includes("door") || child.name.includes("stair")) {
            console.log(
              `Found interactive element in floor ${index + 1}:`,
              child.name
            );
            world.doors.push(child);
          }
        }
      });
    });

    // Create a visible connection between main dungeon and new floors
    createBridge(
      new THREE.Vector3(25, 0, 0), // Midpoint between main dungeon and floor1
      new THREE.Vector3(10, 0, 0) // Size of the bridge
    );

    // Find an unused door in the main dungeon to connect to our new floors
    findAndSetupNewFloorsEntryDoor(floor1Position);
  } catch (error) {
    console.log("Error loading floors", error);
  }
}

// Function to find an unused door in the main dungeon and set it up as the entry to our new floors
function findAndSetupNewFloorsEntryDoor(targetPosition) {
  // Look through all doors in the world
  for (let i = 0; i < world.doors.length; i++) {
    const door = world.doors[i];

    // Skip doors that are already assigned to algorithms
    if (
      door.name.includes("kruskal") ||
      door.name.includes("heapsort") ||
      door.name.includes("prim") ||
      door.name.includes("bucketsort") ||
      door.name.includes("to_new_floors")
    ) {
      continue;
    }

    // Found an unused door - mark it as the entry to our new floors
    door.name += "_to_new_floors";
    door.userData.teleportTarget = new THREE.Vector3(
      targetPosition.x + 2, // A bit inside the room
      targetPosition.y + 1, // Player height
      targetPosition.z + 2 // A bit inside the room
    );

    newFloorsEntryDoor = door;
    console.log("Set up door as entry to new floors:", door.name);

    // Create a return door/trigger in the new floor
    createReturnTrigger(
      new THREE.Vector3(
        targetPosition.x - 5,
        targetPosition.y,
        targetPosition.z
      ),
      new THREE.Vector3(
        door.position.x + 2,
        door.position.y,
        door.position.z + 2
      )
    );

    // Only set up one door
    break;
  }
}

// Create a trigger to return from the new floors to the main dungeon
function createReturnTrigger(position, targetPosition) {
  // Create a visible door or marker
  const geometry = new THREE.BoxGeometry(1, 2, 0.2);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    transparent: true,
    opacity: 0.8,
  });
  const returnDoor = new THREE.Mesh(geometry, material);
  returnDoor.position.copy(position);
  returnDoor.name = "return_to_main_dungeon";
  returnDoor.userData.teleportTarget = targetPosition;
  scene.add(returnDoor);

  // Add to world.doors so it can be selected
  world.doors.push(returnDoor);

  // Add physics
  addPhysicsToMesh(returnDoor, world, { mass: 0 });

  // Add a label
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 256;
  canvas.height = 64;
  context.fillStyle = "#ffffff";
  context.font = "24px Arial";
  context.fillText("Return to Main Hall", 10, 40);

  const texture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });
  const labelGeometry = new THREE.PlaneGeometry(2, 0.5);
  const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
  labelMesh.position.copy(position);
  labelMesh.position.y += 1.5; // Position above the door
  labelMesh.position.z += 0.2; // Slightly in front of the door
  scene.add(labelMesh);

  return returnDoor;
}

async function initializeGame() {
  await createMainDungeon();
  await createFloors();
  console.log("All models loaded successfully");
}

// Call the initialization function
initializeGame();

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

// Modify the onMouseDown function to handle teleportation through doors
function onMouseDown(event) {
  if (player.controls.isLocked && player.selectedDoor) {
    const position = {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
    };

    localStorage.setItem("player_pos", JSON.stringify(position));
    storeCameraLookAt(player.camera);

    // Handle existing algorithm doors
    if (player.selectedDoor.name.includes("kruskal"))
      window.location.href = "Kruskal.html";
    if (player.selectedDoor.name.includes("heapsort"))
      window.location.href = "heapsort.html";
    if (player.selectedDoor.name.includes("prim"))
      window.location.href = "Prim.html";
    if (player.selectedDoor.name.includes("bucketsort"))
      window.location.href = "bucketsort.html";

    // Handle teleportation to new floors
    if (
      player.selectedDoor.name.includes("to_new_floors") &&
      player.selectedDoor.userData.teleportTarget
    ) {
      // Teleport the player to the target position
      player.position.copy(player.selectedDoor.userData.teleportTarget);
      console.log("Teleported to new floors");
    }

    // Handle return to main dungeon
    if (
      player.selectedDoor.name.includes("return_to_main_dungeon") &&
      player.selectedDoor.userData.teleportTarget
    ) {
      // Teleport the player back to main dungeon
      player.position.copy(player.selectedDoor.userData.teleportTarget);
      console.log("Returned to main dungeon");
    }
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

function checkStairCollision() {
  // Create a raycaster pointing down from the player
  const raycaster = new THREE.Raycaster(
    player.position.clone(),
    new THREE.Vector3(0, -1, 0)
  );

  // Get all objects the ray intersects with
  const intersects = raycaster.intersectObjects(scene.children, true);

  // Check if any of the intersected objects are stairs
  for (let i = 0; i < intersects.length; i++) {
    const object = intersects[i].object;

    // If the player is on stairs
    if (object.name && object.name.includes("stair")) {
      console.log("Player is on stairs");

      // Allow the player to move up/down more easily when on stairs
      // This could be a gradual elevation change based on forward/backward movement
      if (player.moveForward) {
        // Adjust player height based on stair direction
        // This is a simplified approach - you might need to adjust based on your specific stair model
        player.position.y += 0.05; // Small increment up when moving forward on stairs
      }

      if (player.moveBackward) {
        player.position.y -= 0.05; // Small decrement down when moving backward on stairs
      }

      return true;
    }
  }

  return false;
}

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
