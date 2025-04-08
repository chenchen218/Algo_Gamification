// Create a file called bucketSortSimple.js
import * as THREE from "three";

// Basic scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add a cube to represent your room
const roomGeometry = new THREE.BoxGeometry(10, 5, 10);
const roomMaterial = new THREE.MeshBasicMaterial({
  color: 0x808080,
  wireframe: true,
});
const room = new THREE.Mesh(roomGeometry, roomMaterial);
scene.add(room);

// Add some buckets (cylinders)
const bucketGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
const bucketMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

for (let i = 0; i < 5; i++) {
  const bucket = new THREE.Mesh(bucketGeometry, bucketMaterial);
  bucket.position.set(i * 2 - 4, 0, -2);
  scene.add(bucket);
}

// Position camera
camera.position.z = 5;
camera.position.y = 2;

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

console.log("Bucket Sort Simple Room Loaded");
