import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import * as CANNON from "cannon-es";

const CENTER_SCREEN = new THREE.Vector2();
const uiTextHolder = document.querySelector(".UI-Text");
const roomEnterText = "Click to enter this room!";
let generalText =
  "Brave adventurer! Solve the Algorithmic riddles in each room to gather clues and unlock the gate to the treasure!";
const lockedDoorText = "This door is locked. Please try another door.";
const treasureDoorLockedText =
  "Conquer and master all rooms to ignite every symbol above the door, for only then will the door to the treasure finally unlock.";
const treasureDoorUnlockedText =
  "Well done, brave explorer! The treasure door is now unlocked. Continue to sharpen your skills by revisiting any of the rooms at your leisure.";

export class Player {
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  cameraHelper = new THREE.CameraHelper(this.camera);
  controls = new PointerLockControls(this.camera, document.body);

  maxSpeed = 20;
  velocity = new THREE.Vector3();
  input = new THREE.Vector3();

  raycaster = new THREE.Raycaster(
    new THREE.Vector3(),
    new THREE.Vector3(),
    0,
    5
  );
  selectedDoor = null;
  gameDone = false;

  constructor(scene, world) {
    // Restore the player's position from localStorage if it exists
    const storedPosition = localStorage.getItem("player_pos");
    const storedLookAt = localStorage.getItem("player_lookAt");
    if (storedPosition) {
      console.log(storedPosition);
      const position = JSON.parse(storedPosition);
      this.position.set(position.x, position.y, position.z);
    } else {
      // Default starting position
      this.position.set(-0.3, 2, 6);
    }

    if (storedLookAt) {
      const lookAt = JSON.parse(storedLookAt);
      this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    } else {
      this.camera.lookAt(0, 1, 0); // Default lookAt direction
      console.log("Camera is looking at default direction.");
    }
    scene.add(this.camera);
    // scene.add(this.cameraHelper);

    const playerShape = new CANNON.Sphere(0.5); // Using a sphere for simplicity
    this.body = new CANNON.Body({
      mass: 1, // Dynamic object
      shape: playerShape,
      position: new CANNON.Vec3(
        this.position.x,
        this.position.y,
        this.position.z
      ),
    });
    world.addBody(this.body);

    document.addEventListener("keyup", this.onKeyUp.bind(this));
    document.addEventListener("keydown", this.onKeyDown.bind(this));
  }

  update(dt) {
    if (this.controls.isLocked === true) {
      // Calculate the forward and right vectors based on the camera's direction
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward); // Forward direction based on camera orientation

      const right = new THREE.Vector3();
      right.crossVectors(this.camera.up, forward).normalize(); // Right direction perpendicular to forward

      // Initialize move direction
      const moveDirection = new THREE.Vector3();

      // Handle forward and backward movement
      if (this.input.z !== 0) {
        moveDirection.add(forward.multiplyScalar(this.input.z));
      }

      // Handle left and right movement (negate right for "A" key to go left)
      if (this.input.x !== 0) {
        moveDirection.add(right.multiplyScalar(-this.input.x));
      }

      // Apply the movement direction to the physics body
      this.body.velocity.set(
        moveDirection.x * this.maxSpeed * dt,
        this.body.velocity.y, // Preserve Y velocity (e.g., for gravity)
        moveDirection.z * this.maxSpeed * dt
      );

      // Limit or dampen the Y velocity
      if (this.body.velocity.y > 0) {
        // Example threshold
        this.body.velocity.y = Math.min(this.body.velocity.y, 0); // Limit Y velocity
      }

      // Sync the camera position with the physics body
      this.camera.position.copy(this.body.position);
    }
  }

  updateRaycaster(world) {
    // Set the raycaster from the camera's center point
    this.raycaster.setFromCamera(CENTER_SCREEN, this.camera);

    // Assuming doors are stored in an array in world.doors
    const intersections = this.raycaster.intersectObjects(world.doors, true);

    if (intersections.length > 0) {
      const intersectedDoor = intersections[0].object;
      if (!intersectedDoor.name.includes("ready")) {
        uiTextHolder.innerHTML = lockedDoorText;

        // Ensure generalText is restored if the player moves away from a locked door
        this.selectedDoor = intersectedDoor;

        return;
      }

      if (intersectedDoor.name.includes("treasure")) {
        if (!this.gameDone) {
          uiTextHolder.innerHTML = treasureDoorLockedText;
        } else {
          uiTextHolder.innerHTML = treasureDoorUnlockedText;
        }

        return;
      }
      if (intersectedDoor.isMesh) {
        // Ensure it's a mesh with a rotation property
        console.log("Intersected with a door:", intersectedDoor.name);

        if (this.selectedDoor !== intersectedDoor) {
          if (this.selectedDoor && this.selectedDoor.rotation) {
            this.selectedDoor.rotation.y = 0;
          }

          this.selectedDoor = intersectedDoor;

          // Slightly open the door by rotating it (you might need to adjust the axis and angle)
          this.selectedDoor.rotation.y += THREE.MathUtils.degToRad(10); // Rotate by 10 degrees on the Y axis
          uiTextHolder.innerHTML = roomEnterText;
        }
      }
    } else {
      if (this.selectedDoor) {
        if (this.selectedDoor.rotation) {
          // Reset the selected door's rotation when no door is intersected
          this.selectedDoor.rotation.y = 0;
        }

        this.selectedDoor = null;

        // Reset the UI text to generalText if the door was previously locked or interacted with
        uiTextHolder.innerHTML = generalText;
      }
    }
  }

  setGameDone() {
    this.gameDone = true;
    generalText = treasureDoorUnlockedText;
  }

  get position() {
    return this.camera.position;
  }

  onKeyUp(event) {
    switch (event.code) {
      case "Escape":
        if (event.repeat) break;
        if (this.controls.isLocked) {
          console.log("unlocking controls");
          this.controls.unlock();
        } else {
          console.log("locking controls");
          this.controls.lock();
        }
        break;
      case "KeyW":
        this.input.z = 0;
        break;
      case "KeyA":
        this.input.x = 0;
        break;
      case "KeyS":
        this.input.z = 0;
        break;
      case "KeyD":
        this.input.x = 0;
        break;
    }
  }

  onKeyDown(event) {
    switch (event.code) {
      case "KeyW":
        this.input.z = this.maxSpeed;
        break;
      case "KeyA":
        this.input.x = -this.maxSpeed;
        break;
      case "KeyS":
        this.input.z = -this.maxSpeed;
        break;
      case "KeyD":
        this.input.x = this.maxSpeed;
        break;
      case "KeyR":
        if (this.repeat) break;
        this.position.set(-0.3, 1.5, 12);
        this.velocity.set(0, 0, 0);
        break;
    }
  }
}
