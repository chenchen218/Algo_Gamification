import * as THREE from "three";
export function createThreePointLightingRoom(scene) {
  const three_point_lighting_prefab = new THREE.Group();
  const light = new THREE.AmbientLight(0xffffff, 1);
  const light1 = new THREE.DirectionalLight(0xffffff, 5);
  const light2 = new THREE.DirectionalLight(0xffffff, 1);
  const light3 = new THREE.DirectionalLight(0xffffff, 1);

  light1.position.x += 100;
  light2.position.x -= 100;
  light3.position.z += 100;

  three_point_lighting_prefab.add(light);
  three_point_lighting_prefab.add(light1);
  three_point_lighting_prefab.add(light2);
  three_point_lighting_prefab.add(light3);

  scene.add(three_point_lighting_prefab);
}
export function createThreePointLighting(scene) {
  const three_point_lighting_prefab = new THREE.Group();

  // Reduced ambient light for less uniform brightness
  const light = new THREE.AmbientLight(0x404040, 0.5);

  // Directional lights with reduced intensity and soft shadows
  const light1 = new THREE.DirectionalLight(0xffffff, 2);
  light1.position.set(100, 100, 100);
  light1.castShadow = true;
  light1.shadow.mapSize.width = 1024;
  light1.shadow.mapSize.height = 1024;
  light1.shadow.radius = 1.5;

  const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
  light2.position.set(-100, 50, -100);

  const light3 = new THREE.DirectionalLight(0xffffff, 0.5);
  light3.position.set(0, 100, 100);

  three_point_lighting_prefab.add(light);
  three_point_lighting_prefab.add(light1);
  three_point_lighting_prefab.add(light2);
  three_point_lighting_prefab.add(light3);

  scene.add(three_point_lighting_prefab);
}
