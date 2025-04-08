import * as THREE from "three";
import { loadModel } from "./utils/threeModels.js";
import * as CANNON from "cannon-es";
import { createThreePointLighting } from "./utils/threePointLighting.js";
import { Player } from "./utils/lockedFirstPersonCam/player.js";

// Set up the scene, renderer, and physics world
const scene = new THREE.Scene();
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Add gravity for more realistic feel

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor("#000");
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Create player and position them at the entrance
const player = new Player(scene, world);
player.position.set(0, 1, 7); // Position near the entrance looking into the room

// Function to hide loading screen with smooth fade
function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (!loadingScreen) return;

  loadingScreen.style.opacity = 1;
  const fadeEffect = setInterval(() => {
    if (loadingScreen.style.opacity > 0) {
      loadingScreen.style.opacity -= 0.1;
    } else {
      clearInterval(fadeEffect);
      loadingScreen.style.display = "none";
    }
  }, 50);
}

// Load your custom room
const roomURL = new URL("./floor1.glb", import.meta.url);

// Define the bucket objects for later interaction
const buckets = [];

async function loadRoom() {
  // Show loading screen if it exists
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.display = "flex";
  }

  try {
    console.log("Loading room model from:", roomURL.href);
    const { model } = await loadModel(
      roomURL.href,
      new THREE.Vector3(0, 0, 0),
      scene
    );

    // Hide loading screen
    hideLoadingScreen();

    console.log("Room loaded successfully");

    // Add physics to room elements and identify interactive elements
    model.traverse((child) => {
      if (child.isMesh) {
        // Add shadows
        child.castShadow = true;
        child.receiveShadow = true;

        console.log("Found mesh:", child.name);

        // Add physics to walls and floor
        if (child.name.includes("wall") || child.name.includes("floor")) {
          addPhysicsToMesh(child, world, { mass: 0 });
        }

        // Identify the bucket objects (the cylindrical objects in your scene)
        if (
          child.name.includes("barrel") ||
          child.name.includes("bucket") ||
          child.name.includes("cylinder")
        ) {
          buckets.push(child);
          child.userData.isInteractive = true;

          // Highlight material when hovered
          child.userData.originalMaterial = child.material.clone();

          // Add to interactable objects list
          interactableObjects.push(child);
        }
      }
    });

    // Set up bucket visualization after loading
    setupBucketSortVisualization();
  } catch (error) {
    console.error("Error loading room:", error);
    hideLoadingScreen();
  }
}

// Add physics to meshes
function addPhysicsToMesh(mesh, world, options) {
  const boundingBox = new THREE.Box3().setFromObject(mesh);
  const size = boundingBox.getSize(new THREE.Vector3());
  const center = boundingBox.getCenter(new THREE.Vector3());

  const shape = new CANNON.Box(
    new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
  );

  const body = new CANNON.Body({
    mass: options.mass,
    shape: shape,
    position: new CANNON.Vec3(center.x, center.y, center.z),
  });

  world.addBody(body);
  mesh.userData.physicsBody = body;
}

// Add floor for navigation if not already in the model
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x808080,
  side: THREE.DoubleSide,
});
const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.y = 0;
floorMesh.receiveShadow = true;
scene.add(floorMesh);
floorMesh.visible = false; // Hidden but still provides physics

const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({
  mass: 0,
  shape: floorShape,
  position: new CANNON.Vec3(0, 0, 0),
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

// Add lighting
createThreePointLighting(scene);

// Add additional spot light for better visualization
const spotLight = new THREE.SpotLight(0xffffff, 1);
spotLight.position.set(0, 10, 0);
spotLight.angle = Math.PI / 4;
spotLight.penumbra = 0.1;
spotLight.decay = 2;
spotLight.distance = 50;
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
scene.add(spotLight);

// Handle user input
document.body.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    player.controls.lock();
  }

  // Keyboard shortcuts for bucket sort steps
  if (event.key === "1") {
    showBucketSortStep(1);
  } else if (event.key === "2") {
    showBucketSortStep(2);
  } else if (event.key === "3") {
    showBucketSortStep(3);
  } else if (event.key === "4") {
    showBucketSortStep(4);
  } else if (event.key === "5") {
    showBucketSortStep(5);
  } else if (event.key === "6") {
    showBucketSortStep(6);
  } else if (event.key === "Escape") {
    // Hide visualization if showing
    const container = document.getElementById("svg-container");
    if (container && container.style.display === "block") {
      container.style.display = "none";
    }
  }
});

// Interactable objects for raycasting
const interactableObjects = [];

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Track currently hovered object
let hoveredObject = null;

// Mouse move event for hover effects
document.addEventListener("mousemove", (event) => {
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Handle click on objects
document.addEventListener("click", () => {
  if (hoveredObject && hoveredObject.userData.isInteractive) {
    // Start bucket sort visualization when clicking on a bucket
    showBucketSortStep(1);
  }
});

// Bucket sort visualization setup
function setupBucketSortVisualization() {
  // Create UI for visualization
  const container = document.createElement("div");
  container.id = "svg-container";
  container.style.position = "absolute";
  container.style.top = "50%";
  container.style.left = "50%";
  container.style.transform = "translate(-50%, -50%)";
  container.style.width = "80%";
  container.style.height = "80%";
  container.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  container.style.color = "white";
  container.style.padding = "20px";
  container.style.borderRadius = "10px";
  container.style.display = "none";
  container.style.zIndex = "1000";
  container.style.fontFamily = "Arial, sans-serif";

  // Navigation controls
  const controls = document.createElement("div");
  controls.style.position = "absolute";
  controls.style.bottom = "20px";
  controls.style.left = "0";
  controls.style.width = "100%";
  controls.style.display = "flex";
  controls.style.justifyContent = "center";
  controls.style.gap = "10px";

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "« Previous";
  prevBtn.style.padding = "10px 20px";
  prevBtn.style.backgroundColor = "#555";
  prevBtn.style.color = "white";
  prevBtn.style.border = "none";
  prevBtn.style.borderRadius = "5px";
  prevBtn.style.cursor = "pointer";
  prevBtn.onclick = () => {
    const currentStep = parseInt(container.dataset.currentStep || "1");
    if (currentStep > 1) {
      showBucketSortStep(currentStep - 1);
    }
  };

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next »";
  nextBtn.style.padding = "10px 20px";
  nextBtn.style.backgroundColor = "#555";
  nextBtn.style.color = "white";
  nextBtn.style.border = "none";
  nextBtn.style.borderRadius = "5px";
  nextBtn.style.cursor = "pointer";
  nextBtn.onclick = () => {
    const currentStep = parseInt(container.dataset.currentStep || "1");
    if (currentStep < 6) {
      showBucketSortStep(currentStep + 1);
    }
  };

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "10px";
  closeBtn.style.right = "10px";
  closeBtn.style.width = "30px";
  closeBtn.style.height = "30px";
  closeBtn.style.backgroundColor = "#f44336";
  closeBtn.style.color = "white";
  closeBtn.style.border = "none";
  closeBtn.style.borderRadius = "50%";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "20px";
  closeBtn.style.display = "flex";
  closeBtn.style.justifyContent = "center";
  closeBtn.style.alignItems = "center";
  closeBtn.onclick = () => {
    container.style.display = "none";
  };

  controls.appendChild(prevBtn);
  controls.appendChild(nextBtn);
  container.appendChild(closeBtn);
  container.appendChild(controls);

  document.body.appendChild(container);

  // Create a floating button to start the tutorial
  const startBtn = document.createElement("button");
  startBtn.textContent = "Start Bucket Sort Tutorial";
  startBtn.style.position = "fixed";
  startBtn.style.bottom = "20px";
  startBtn.style.right = "20px";
  startBtn.style.padding = "10px 20px";
  startBtn.style.backgroundColor = "#4CAF50";
  startBtn.style.color = "white";
  startBtn.style.border = "none";
  startBtn.style.borderRadius = "5px";
  startBtn.style.cursor = "pointer";
  startBtn.style.zIndex = "999";
  startBtn.onclick = () => {
    showBucketSortStep(1);
  };

  document.body.appendChild(startBtn);
}

// Function to show each step of bucket sort
function showBucketSortStep(step) {
  const container = document.getElementById("svg-container");
  if (!container) return;

  // Store current step
  container.dataset.currentStep = step.toString();

  // Show container
  container.style.display = "block";

  // Clear previous content
  while (container.firstChild) {
    if (
      container.firstChild.tagName === "BUTTON" ||
      container.firstChild.tagName === "DIV"
    ) {
      container.removeChild(container.firstChild);
    } else {
      break;
    }
  }

  // Create content based on step
  const content = document.createElement("div");
  content.style.height = "calc(100% - 60px)";
  content.style.overflow = "auto";
  content.style.padding = "20px";

  // Check if SVG exists
  const img = new Image();
  img.onload = function () {
    // SVG exists, display it
    content.innerHTML = `<img src="./src/AlgorithmsInstructions/bucketSortAlgo/${step}.svg" style="width: 100%;">`;
  };

  img.onerror = function () {
    // SVG doesn't exist, show fallback content
    let stepContent = "";

    switch (step) {
      case 1:
        stepContent = `
          <h1>Bucket Sort: Introduction</h1>
          <p>Bucket Sort is a distribution-based sorting algorithm.</p>
          <p>How it works:</p>
          <ol>
            <li>Divide the range into equal-sized buckets</li>
            <li>Distribute elements into appropriate buckets</li>
            <li>Sort elements within each bucket (using another algorithm)</li>
            <li>Concatenate the buckets in order</li>
          </ol>
          <p>Best suited for uniformly distributed data over a range.</p>
          <p>Time Complexity: O(n + k), where n is the number of elements and k is the number of buckets</p>
          <p>Space Complexity: O(n + k)</p>
        `;
        break;
      case 2:
        stepContent = `
          <h1>Step 1: Creating Buckets & Distribution</h1>
          <p>Create n buckets, each representing a range of values.</p>
          <p>For each element x in the array:</p>
          <ul>
            <li>Calculate the bucket index: floor(n * x)</li>
            <li>Place the element in the corresponding bucket</li>
          </ul>
          <p>Distribution formula: bucketIndex = floor(n * element)</p>
          <p>Example: For element 0.42 with 5 buckets: bucketIndex = floor(5 * 0.42) = floor(2.1) = 2</p>
        `;
        break;
      case 3:
        stepContent = `
          <h1>Step 2: Elements in Buckets</h1>
          <p>Elements are now distributed into buckets:</p>
          <ul>
            <li>Bucket 0 (0-0.2): [0.18]</li>
            <li>Bucket 1 (0.2-0.4): [0.32, 0.24]</li>
            <li>Bucket 2 (0.4-0.6): [0.42]</li>
            <li>Bucket 3 (0.6-0.8): [0.73, 0.65]</li>
            <li>Bucket 4 (0.8-1.0): [0.85, 0.91]</li>
          </ul>
          <p>Each bucket contains elements from a specific range</p>
          <p>Elements within buckets are still unsorted</p>
        `;
        break;
      case 4:
        stepContent = `
          <h1>Step 3: Sorting Within Buckets</h1>
          <p>Sort elements within each bucket:</p>
          <ul>
            <li>Bucket 0 (0-0.2): [0.18]</li>
            <li>Bucket 1 (0.2-0.4): [0.24, 0.32]</li>
            <li>Bucket 2 (0.4-0.6): [0.42]</li>
            <li>Bucket 3 (0.6-0.8): [0.65, 0.73]</li>
            <li>Bucket 4 (0.8-1.0): [0.85, 0.91]</li>
          </ul>
          <p>Usually, insertion sort is used for each bucket</p>
          <p>Insertion sort is efficient for small arrays</p>
        `;
        break;
      case 5:
        stepContent = `
          <h1>Step 4: Concatenate Buckets</h1>
          <p>Combine elements from all buckets in order</p>
          <p>Start with the first bucket, then second, and so on</p>
          <p>Final sorted array: [0.18, 0.24, 0.32, 0.42, 0.65, 0.73, 0.85, 0.91]</p>
          <p>The concatenation process preserves the sorting done within buckets, resulting in a completely sorted array.</p>
        `;
        break;
      case 6:
        stepContent = `
          <h1>Bucket Sort: Analysis & Applications</h1>
          <p><strong>Time Complexity:</strong></p>
          <ul>
            <li>Best Case: O(n+k) when data is uniformly distributed</li>
            <li>Average Case: O(n+k)</li>
            <li>Worst Case: O(n²) when all elements go to the same bucket</li>
          </ul>
          <p><strong>Space Complexity:</strong> O(n+k)</p>
          <p><strong>Best used for:</strong></p>
          <ul>
            <li>Floating-point numbers uniformly distributed</li>
            <li>Limited range of input values</li>
            <li>External sorting with limited memory</li>
          </ul>
          <p><strong>Real-world applications:</strong></p>
          <ul>
            <li>Sorting postal codes</li>
            <li>Numerical data analysis</li>
            <li>Processing simulation results</li>
          </ul>
        `;
        break;
      default:
        stepContent = "<p>Content not available</p>";
    }

    content.innerHTML = stepContent;
  };

  img.src = `./src/AlgorithmsInstructions/bucketSortAlgo/${step}.svg`;

  container.appendChild(content);

  // Re-add the navigation controls
  const controls = document.createElement("div");
  controls.style.position = "absolute";
  controls.style.bottom = "20px";
  controls.style.left = "0";
  controls.style.width = "100%";
  controls.style.display = "flex";
  controls.style.justifyContent = "center";
  controls.style.gap = "10px";

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "« Previous";
  prevBtn.style.padding = "10px 20px";
  prevBtn.style.backgroundColor = "#555";
  prevBtn.style.color = "white";
  prevBtn.style.border = "none";
  prevBtn.style.borderRadius = "5px";
  prevBtn.style.cursor = "pointer";
  prevBtn.disabled = step === 1;
  prevBtn.style.opacity = step === 1 ? "0.5" : "1";
  prevBtn.onclick = () => {
    if (step > 1) showBucketSortStep(step - 1);
  };

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next »";
  nextBtn.style.padding = "10px 20px";
  nextBtn.style.backgroundColor = "#555";
  nextBtn.style.color = "white";
  nextBtn.style.border = "none";
  nextBtn.style.borderRadius = "5px";
  nextBtn.style.cursor = "pointer";
  nextBtn.disabled = step === 6;
  nextBtn.style.opacity = step === 6 ? "0.5" : "1";
  nextBtn.onclick = () => {
    if (step < 6) showBucketSortStep(step + 1);
  };

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "10px";
  closeBtn.style.right = "10px";
  closeBtn.style.width = "30px";
  closeBtn.style.height = "30px";
  closeBtn.style.backgroundColor = "#f44336";
  closeBtn.style.color = "white";
  closeBtn.style.border = "none";
  closeBtn.style.borderRadius = "50%";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "20px";
  closeBtn.style.display = "flex";
  closeBtn.style.justifyContent = "center";
  closeBtn.style.alignItems = "center";
  closeBtn.onclick = () => {
    container.style.display = "none";
  };

  controls.appendChild(prevBtn);
  controls.appendChild(nextBtn);
  container.appendChild(closeBtn);
  container.appendChild(controls);
}

// Animation loop
let previousTime = performance.now();
const FIXED_TIME_STEP = 1 / 60;
let accumulatedTime = 0;

function animate() {
  requestAnimationFrame(animate);

  // Update raycasting for interaction
  if (player.controls.isLocked) {
    // Use camera direction for raycasting when controls locked
    raycaster.setFromCamera(new THREE.Vector2(0, 0), player.camera);
  } else {
    raycaster.setFromCamera(mouse, player.camera);
  }

  // Check for intersections with interactable objects
  const intersects = raycaster.intersectObjects(interactableObjects);

  // Reset previously hovered object
  if (hoveredObject) {
    hoveredObject.material = hoveredObject.userData.originalMaterial;
    hoveredObject = null;
  }

  // Handle new hover
  if (intersects.length > 0) {
    hoveredObject = intersects[0].object;
    if (hoveredObject.userData.originalMaterial) {
      // Create highlighted material
      const highlightMaterial = hoveredObject.userData.originalMaterial.clone();
      highlightMaterial.emissive = new THREE.Color(0x555555);
      hoveredObject.material = highlightMaterial;
    }
  }

  // Physics and rendering
  const currentTime = performance.now();
  let dt = (currentTime - previousTime) / 1000;
  previousTime = currentTime;

  dt = Math.min(dt, 0.1);

  accumulatedTime += dt;
  while (accumulatedTime >= FIXED_TIME_STEP) {
    world.step(FIXED_TIME_STEP);
    player.update(FIXED_TIME_STEP);
    accumulatedTime -= FIXED_TIME_STEP;
  }

  renderer.render(scene, player.camera);
}

// Initialize and start animation
console.log("Starting room initialization");
loadRoom();
animate();

// Handle window resize
window.addEventListener("resize", () => {
  player.camera.aspect = window.innerWidth / window.innerHeight;
  player.camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log("Script loaded");
