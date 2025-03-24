import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Graph, createRandomConnectedGraph } from "../../graph.js";
import { createThreePointLighting } from "../threePointLighting.js";
import { KruskalAlgorithm } from "../graphRelated/kruskal.js";
import { PrimAlgorithm } from "../graphRelated/prims.js";
import { GameSession } from "../gameRelated/gameSession.js";
import { loadModel } from "../threeModels.js";
import { GameStatusService } from "../gameStatus/gameStatusService.js";
import gsap from "gsap";
import {
  toggleInstructions,
  closePseudocode,
  decrementHealth,
  resetHealth,
  setStars,
  resetStars,
  updateHintIcons,
} from "./ui.js";
import {
  effectForCorrectSelect,
  shakeForWrongSelect,
  shakeScreen,
} from "./animations.js";

const uiText = document.getElementById("UI-Text");
const scoreElements = document.querySelectorAll(".score-label-2");
const scoreText = document.querySelector(".score-label-2");
const finalScoreText = document.querySelector(".label__final_score span");
const labelCompletionText = document.querySelector(".label__completion_text");
const stars = document.querySelectorAll(".star path:last-child");

const instructionModal = document.querySelector(".instruction");
const overlay = document.querySelector(".overlay");
const hoverEffects = document.querySelectorAll(".hover");

const pseudoBoxButton = document.querySelector(".Pesudocode-Icon");
const reArrangeButton = document.querySelector(".Rearrange-Action");
const helpInstructionButton = document.querySelector(".Instruction-Icon");

const buttonNextLevel = document.querySelector(".btn__next");
const modalCompletion = document.querySelector(".modal__completion");

const buttonAgain = document.querySelector(".btn__again");
const buttonStart = document.querySelector(".btn__instruction__start");

const settingsModal = document.querySelector(".modal__settings");
const settingsTogglerEle = document.querySelector(".settings__icon");
const btnSettingsRestart = document.querySelector(".btn__setting__restart");
const btnSettingsDiffLvl = document.querySelector(".btn__setting__diffLvl");
const btnSettingsGoMainDungeon = document.querySelectorAll(
  ".btn__setting__mainDungeon"
);

const settingsCloseButton = document.querySelector(
  ".modal__settings .btn__close"
);

const levelsModal = document.querySelector(".modal__level__selection");

// Select all level buttons
const levelButtons = document.querySelectorAll(".level__btn__holder");
const btnLevelClose = document.querySelector(".btn__level__close");

let curGameSession;
let levelModalOpen = true;
// Function to update the score
function updateScore(newScore) {
  // Iterate over each element and update its text content
  scoreElements.forEach((element) => {
    element.textContent = newScore.toString().padStart(2, "0"); // Ensures a two-digit format (e.g., '00')
  });
}

// Function to hide stars
function hideStars() {
  const svgStars = document.querySelectorAll(
    ".level__stars__holder svg.feather-star"
  );
  svgStars.forEach((star) => {
    star.style.visibility = "hidden"; // Hide stars
  });
}

// Function to show stars
function showStars() {
  const svgStars = document.querySelectorAll(
    ".level__stars__holder svg.feather-star"
  );
  svgStars.forEach((star) => {
    star.style.visibility = "visible"; // Show stars
  });
}

// Function to toggle headers
function toggleHeader(showHealth) {
  const headerWithHealth = document.getElementById("header-with-health");
  const headerWithoutHealth = document.getElementById("header-without-health");

  if (showHealth) {
    headerWithHealth.classList.remove("hidden");
    headerWithoutHealth.classList.add("hidden");
  } else {
    headerWithHealth.classList.add("hidden");
    headerWithoutHealth.classList.remove("hidden");
  }
}

async function toggleMode(mode) {
  if (!gameStatusService) {
    console.error("Error: gameStatusService is not initialized.");
    return;
  }

  const trainingBtn = document.getElementById("training-mode-btn");
  const regularBtn = document.getElementById("regular-mode-btn");

  if (mode === "training") {
    trainingBtn.classList.add("active");
    regularBtn.classList.remove("active");
    choosingModeNotCurrent = "training";
    hideStars(); // Hide stars for training mode
    // toggleHeader(false); // Hide health bar for training mode
  } else if (mode === "regular") {
    regularBtn.classList.add("active");
    trainingBtn.classList.remove("active");
    choosingModeNotCurrent = "regular";
    console.log(choosingModeNotCurrent);
    showStars(); // Show stars for regular mode
    // toggleHeader(true); // Show health bar for regular mode
  }

  // Initialize level status for the selected mode
  await initializeLevelStatus(mode);
}

// Event listeners for mode buttons
document.getElementById("training-mode-btn").addEventListener("click", () => {
  toggleMode("training");
});

document.getElementById("regular-mode-btn").addEventListener("click", () => {
  toggleMode("regular");
});

// Initialize to regular mode
// toggleMode("regular");

let isModalOpen = false;

let currentScore = 0;
let currentLevel = 1;
let currentMode;
let choosingModeNotCurrent;
let curNodes;
let curEdges;
let graph;

let currentAlgorithm = "kruskal";

let health = 4;

let onMouseMove;
let onClick;
let gameStatusService;

// Add an event listener to initialize the game after login
document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch("/api/users/getUser", {
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const userData = await response.json();
      console.log("User is logged in:", userData);

      // Initialize GameStatusService with the logged-in userId
      gameStatusService = new GameStatusService(userData.id);

      // Await the initialization of GameStatusService
      await gameStatusService.init();
      const userId = gameStatusService.getUserId();
      curGameSession = new GameSession(userId, "Kruskal", currentLevel);
      console.log(curGameSession.toObject());
      // Ensure toggleMode is called only after initialization
      await toggleMode("regular");
    } else {
      console.warn("User is not logged in. Redirecting to login page.");
      window.location.href = "signInSignUp.html";
    }
  } catch (error) {
    console.error("Error checking login status:", error);
    window.location.href = "signInSignUp.html";
  }
});

async function initializeLevelStatus(mode) {
  try {
    if (!gameStatusService) {
      console.error("Error: gameStatusService is not initialized.");
      return;
    }

    // Fetch game status for the user
    const gameStatus = await gameStatusService.getLocalGameStatus();

    if (!gameStatus) {
      console.error("No game status found for this user.");
      return;
    }

    // Reset all levels to the locked state and clear stars
    resetAllLevels();

    let highestCompletedLevel = 0;

    // Get the specific levels based on the selected mode
    const kruskalLevels = gameStatus.games["Kruskal"]?.[mode];
    if (!kruskalLevels) {
      console.error(`No levels found for mode: ${mode}`);
      return;
    }

    console.log(`Initializing levels for mode: ${mode}`, kruskalLevels);

    kruskalLevels.forEach((gameData, index) => {
      const level = index + 1; // Levels are 1-based index

      // Find the button and star elements for the current level
      const currentLevelButton = document.querySelector(
        `.btn__level__${level}`
      );
      const currentStarsHolder = currentLevelButton.querySelector(
        ".level__stars__holder"
      );

      // Update the stars based on the level data
      const stars = currentStarsHolder.querySelectorAll("svg.feather-star");
      for (let i = 0; i < stars.length; i++) {
        if (i < gameData.stars) {
          stars[i].classList.add("filled");
          stars[i].style.fill = "#a5d8ff"; // Filled stars color
        } else {
          stars[i].classList.remove("filled");
          stars[i].style.fill = "none"; // Default color for unfilled stars
        }
      }

      // Check if the level is completed and track the highest completed level
      if (gameData.status === "completed") {
        highestCompletedLevel = level;
        unlockLevelUI(level);
      }
    });

    // Unlock the next level if there is a completed level
    if (
      highestCompletedLevel > 0 &&
      highestCompletedLevel < kruskalLevels.length
    ) {
      unlockLevelUI(highestCompletedLevel + 1);
    }
  } catch (error) {
    console.error("Error initializing level status:", error);
  }
}

// Function to reset all levels to the original state
function resetAllLevels() {
  const levelButtons = document.querySelectorAll(".level__btn__holder");

  levelButtons.forEach((button, index) => {
    button.classList.add("level__locked"); // Lock the level

    // Reset stars
    const stars = button.querySelectorAll(
      ".level__stars__holder svg.feather-star"
    );
    stars.forEach((star) => {
      star.classList.remove("filled");
      star.style.fill = "none"; // Default color for unfilled stars
    });

    // Show lock icon
    const lockIcon = button.querySelector(".feather-lock");
    if (lockIcon) {
      lockIcon.style.display = "block"; // Show the lock icon
    }
  });

  // Always unlock the first level
  const firstLevelButton = document.querySelector(".btn__level__1");
  if (firstLevelButton) {
    firstLevelButton.classList.remove("level__locked");
    const lockIcon = firstLevelButton.querySelector(".feather-lock");
    if (lockIcon) {
      lockIcon.style.display = "none"; // Hide the lock icon
    }
  }

  console.log(
    "All levels have been reset to the original state, and the first level is unlocked."
  );
}

function unlockLevelUI(level) {
  const nextLevelButton = document.querySelector(`.btn__level__${level}`);
  if (nextLevelButton) {
    nextLevelButton.classList.remove("level__locked");
    const lockIcon = nextLevelButton.querySelector(".feather-lock");
    if (lockIcon) {
      lockIcon.style.display = "none"; // Hide the lock icon
    }
  }
}

function updateLevelStatus(level, starsCount) {
  const currentLevelButton = document.querySelector(`.btn__level__${level}`);
  const currentStarsHolder = currentLevelButton.querySelector(
    ".level__stars__holder"
  );

  // Update stars based on the zero-based starsCount
  const stars = currentStarsHolder.querySelectorAll("svg.feather-star");
  for (let i = 0; i < stars.length; i++) {
    if (i <= starsCount) {
      stars[i].classList.add("filled");
      stars[i].style.fill = "#a5d8ff"; // Gold color for filled stars
    } else {
      stars[i].classList.remove("filled");
      stars[i].style.fill = "none"; // Default color for unfilled stars
    }
  }

  // Unlock the next level
  const nextLevel = level + 1;
  const nextLevelButton = document.querySelector(`.btn__level__${nextLevel}`);
  if (nextLevelButton) {
    nextLevelButton.classList.remove("level__locked");
    const lockIcon = nextLevelButton.querySelector(".feather-lock");
    if (lockIcon) {
      lockIcon.style.display = "none"; // Hide the lock icon
    }
  }
}

levelButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    if (button.classList.contains("level__locked")) {
      console.log(`Level ${index + 1} is locked.`);
      return; // Exit if the level is locked
    }

    closeLevelModal();

    const chosenLevel = index + 1; // Levels are 1-based
    console.log(`Level ${chosenLevel} selected.`);

    // Only reset the level if it is different from the current level
    // or the mode has changed
    if (
      chosenLevel !== currentLevel ||
      choosingModeNotCurrent !== currentMode
    ) {
      currentLevel = chosenLevel;
      currentMode = choosingModeNotCurrent; // Update the current mode
      window.removeEventListener("mousemove", onMouseMove, false);
      window.removeEventListener("click", onClick, false);

      resetLevel(currentLevel); // Reset the scene for the chosen level

      // Show or hide the health bar based on the chosen mode
      if (currentMode === "regular") {
        toggleHeader(true); // Show health bar for regular mode
      } else {
        toggleHeader(false); // Hide health bar for training mode
      }
      initailCameraAnimationGSAP(); // Trigger the camera animation
    }
  });
});

settingsTogglerEle.addEventListener("click", () => {
  settingsModal.classList.toggle("hidden");
  overlay.classList.toggle("hidden");
  isModalOpen = !isModalOpen;
  disableEventListeners();
});

settingsCloseButton.addEventListener("click", () => {
  settingsModal.classList.toggle("hidden");
  overlay.classList.toggle("hidden");
  isModalOpen = false;
  enableEventListeners();
});

function closeLevelModal() {
  levelsModal.classList.add("hidden");
  overlay.classList.add("hidden");
  isModalOpen = false;

  // Delay enabling event listeners by 300ms
  setTimeout(() => {
    enableEventListeners();
  }, 300);
}
function openLevelModal() {
  levelsModal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  isModalOpen = true;
  disableEventListeners();
}

function closeSettingModal() {
  settingsModal.classList.add("hidden");
  overlay.classList.add("hidden");
  isModalOpen = false;
  enableEventListeners();
}

function openSettingModal() {
  settingsModal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  isModalOpen = true;
}

btnSettingsDiffLvl.addEventListener("click", async (e) => {
  e.preventDefault();

  // Close the settings modal first
  await closeSettingModal();

  // Open the levels modal after the settings modal is fully closed
  btnLevelClose.classList.remove("hidden");
  openLevelModal();
  disableEventListeners();
});

btnLevelClose.addEventListener("click", (e) => {
  e.preventDefault();
  closeLevelModal();
});

btnSettingsGoMainDungeon.forEach((button) => {
  button.addEventListener("click", () => {
    window.location.href = "mainDungeon.html";
  });
});

disableEventListeners();

buttonStart.addEventListener("click", () => {
  disableEventListeners();
  // overlay.classList.add("hidden");
  if (!levelModalOpen) {
    overlay.classList.add("hidden");
    enableEventListeners();
  }
  instructionModal.classList.add("hidden");
  levelModalOpen = false;

  // levelsModal.classList.remove("hidden");
  // const userId = gameStatusService.getUserId();
  // curGameSession = new GameSession(userId, "Kruskal", currentLevel);
  // console.log(curGameSession.toObject());
});

function showPrimInstructions() {
  overlay.classList.remove("hidden");
  instructionModal.classList.remove("hidden");
  document
    .querySelector('.instruction__img[src="./src/Kruskal Instructions.png"]')
    .classList.add("hidden");
  document
    .querySelector('.instruction__img[src="./src/Prim Instructions.png"]')
    .classList.remove("hidden");
}

window.toggleInstructions = function () {
  toggleInstructions(currentAlgorithm);
};

pseudoBoxButton.addEventListener("click", () => {
  toggleInstructions(currentAlgorithm);
});

helpInstructionButton.addEventListener("click", () => {
  instructionModal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  document.querySelector(".btn__instruction__start").textContent =
    "Close Instruction";
});

const openModal = function (currentLevel) {
  // Show modal and overlay
  modalCompletion.classList.remove("hidden");
  disableEventListeners();
  overlay.classList.remove("hidden");

  // Select the "Next Level" button
  const nextButton = document.querySelector(".btn__next");

  // Check if it's level 3
  if (currentLevel === 3) {
    // Remove or hide the "Next Level" button if it's level 3
    nextButton.style.display = "none";
  } else {
    // Ensure the "Next Level" button is visible for other levels
    nextButton.style.display = "inline-block";
  }
};

const closeModal = function () {
  modalCompletion.classList.add("hidden");
  overlay.classList.add("hidden");
  enableEventListeners();
};

// Function to enable event listeners
function enableEventListeners() {
  window.addEventListener("mousemove", onMouseMove, false);
  window.addEventListener("click", onClick, false);
}

// Function to disable event listeners
function disableEventListeners() {
  window.removeEventListener("mousemove", onMouseMove, false);
  window.removeEventListener("click", onClick, false);
}

// function resetScene() {
//   // Remove objects from the scene and dispose of their resources
//   chestList.forEach((chest) => {
//     scene.remove(chest);
//     if (chest.geometry) chest.geometry.dispose();
//     if (chest.material) chest.material.dispose();
//   });
//   openChestList.forEach((chest) => {
//     scene.remove(chest);
//     if (chest.geometry) chest.geometry.dispose();
//     if (chest.material) chest.material.dispose();
//   });
//   chestLabelList.forEach((label) => {
//     scene.remove(label);
//     if (label.geometry) label.geometry.dispose();
//     if (label.material) label.material.dispose();
//   });
//   edgeList.forEach((edge) => {
//     scene.remove(edge);
//     if (edge.geometry) edge.geometry.dispose();
//     if (edge.material) edge.material.dispose();
//   });
//   edgeLabelList.forEach((label) => {
//     scene.remove(label);
//     if (label.geometry) label.geometry.dispose();
//     if (label.material) label.material.dispose();
//   });
//   ringList.forEach((ring) => {
//     scene.remove(ring);
//     if (ring.geometry) ring.geometry.dispose();
//     if (ring.material) ring.material.dispose();
//   });

//   // Reset arrays and variables
//   chestList.length = 0;
//   openChestList.length = 0;
//   chestLabelList.length = 0;
//   edgeList.length = 0;
//   edgeLabelList.length = 0;
//   ringList.length = 0;

//   // Clear raycaster references
//   window.removeEventListener("mousemove", onMouseMove, false);
//   window.removeEventListener("click", onClick, false);
//   onMouseMove = null;
//   onClick = null;

//   // Reset any leftover resources
//   if (sphereInter) {
//     scene.remove(sphereInter);
//     sphereInter.geometry.dispose();
//     sphereInter.material.dispose();
//   }

//   if (startingNodeLabelForPrim) {
//     scene.remove(startingNodeLabelForPrim);
//     startingNodeLabelForPrim.geometry.dispose();
//     startingNodeLabelForPrim.material.dispose();
//     startingNodeLabelForPrim = null;
//   }
//   if (startingNodeRingForPrim) {
//     scene.remove(startingNodeRingForPrim);
//     startingNodeRingForPrim.geometry.dispose();
//     startingNodeRingForPrim.material.dispose();
//     startingNodeRingForPrim = null;
//   }

//   hoverRing.visible = false;
//   usedColors.clear();
//   componentColors = {};

//   // Reset score and UI
//   currentScore = 0;
//   updateScore(0);
//   resetStars();
// }

// function createHoverElements() {
//   const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
//   const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
//   sphereInter = new THREE.Mesh(sphereGeometry, sphereMaterial);
//   sphereInter.visible = false;
//   scene.add(sphereInter);

//   hoverRing = createRing(0.8, 0.9, labelDepth, 0x000000);
//   hoverRing.visible = false;
//   scene.add(hoverRing);
// }

// function setUpGameModel(currentLevel) {
//   console.log(levelConfig);
//   console.log(currentLevel);
//   if (!levelConfig[currentLevel]) {
//     console.error(
//       `Invalid level: ${currentLevel}. Level does not exist in levelConfig.`
//     );
//     return; // Exit the function if the level is invalid
//   }
//   const { nodes: numNodes, edges: numEdges } = levelConfig[currentLevel];
//   curNodes = Array.from({ length: numNodes }, (_, i) => i);
//   curEdges = numEdges;

//   graph = createRandomConnectedGraph(curNodes, curEdges);
//   if (currentLevel <= 3) {
//     curAlgorithmForGraph = new KruskalAlgorithm(graph);
//     currentAlgorithm = "kruskal";
//   } else {
//     if (currentLevel == 4) {
//       showPrimInstructions();
//     }
//     curAlgorithmForGraph = new PrimAlgorithm(graph);
//     currentAlgorithm = "prim";
//   }

//   // updateComponentColors(curAlgorithmForGraph.uf, curNodes, componentColors);
//   createModels();
//   createHoverElements();
// }

// function resetLevel(curlvl) {
//   uiText.innerHTML = `Please click on the Edge to Create Minimum Spanning Tree`;
//   health = resetHealth();
//   document.querySelector(".Hint-Text").classList.add("hidden");
//   closeModal();
//   closePseudocode();
//   resetScene();
//   setUpGameModel(curlvl);
//   updateNodeLabel(levelTitle, `Level ${curlvl}`, 0.9, 0.3, 0x212529);
// }

// buttonNextLevel.addEventListener("click", () => {
//   uiText.innerHTML = `Please click on the Edge to Create Minimum Spanning Tree`;
//   health = resetHealth();
//   currentLevel++;
//   closeModal();
//   closePseudocode();
//   resetScene();
//   setUpGameModel(currentLevel);
//   if (currentAlgorithm === "prim") {
//     updateNodeLabel(chapterTitle, "Prim's Algorithm", 1, 0.3, 0x212529);
//     chapterTitle.position.set(9.5, 6.5, -30);
//   }
//   if (currentLevel > 3) {
//     updateNodeLabel(
//       levelTitle,
//       `Level ${currentLevel - 3}`,
//       0.9,
//       0.3,
//       0x212529
//     );
//   } else {
//     updateNodeLabel(levelTitle, `Level ${currentLevel}`, 0.9, 0.3, 0x212529);
//   }
// });

// buttonAgain.addEventListener("click", () => {
//   resetLevel(currentLevel);
// });

// btnSettingsRestart.addEventListener("click", () => {
//   closeSettingModal();
//   resetLevel(currentLevel);
// });
