import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import * as THREE from "three";

// Initialize the GLTFLoader
const assetLoader = new GLTFLoader();

// ✅ Use the correct path for DracoLoader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/"); // Ensure this path exists
assetLoader.setDRACOLoader(dracoLoader);

export function loadModel(url, position, scene, mixers = []) {
  return new Promise((resolve, reject) => {
    console.log("Attempting to load model from URL:", url);

    assetLoader.load(
      url,
      function (gltf) {
        try {
          if (!gltf.scene) {
            console.error("❌ Scene is missing in the loaded GLTF file:", gltf);
            reject(new Error("Invalid GLTF: Scene is missing"));
            return;
          }

          // ✅ Clone model before adding to scene
          const model = gltf.scene.clone();
          model.position.copy(position);
          scene.add(model);

          let mixer = null;
          let action = null;

          // ✅ Ensure animations exist before processing
          if (gltf.animations && gltf.animations.length > 0) {
            console.log("🎞 Animations found in GLTF file:", gltf.animations);
            mixer = new THREE.AnimationMixer(model);
            action = mixer.clipAction(gltf.animations[0]);

            // Set animation properties
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            action.enabled = true;
            action.paused = false;
            action.play();

            mixers.push(mixer);
          } else {
            console.warn("⚠️ No animations found in the GLTF file.");
          }

          resolve({ model, mixer, action });
        } catch (error) {
          console.error("❌ Error processing GLTF model:", error);
          reject(error);
        }
      },
      undefined,
      function (error) {
        console.error("❌ Error loading GLTF model:", error);
        reject(error);
      }
    );
  });
}
