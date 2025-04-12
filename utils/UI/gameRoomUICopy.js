import * as THREE from "three";
import gsap from "gsap";
import Swiper from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination } from "swiper/modules";

import { setStars } from "./ui";

/**
 * GameRoomUI manages the user interface for game levels, including modals,
 * Swiper-based instruction slides, score updates, and event listeners for UI elements.
 */
class GameRoomUI {
  /**
   * @param {string} gameName - The name of the game (e.g., "Kruskal", "Prim").
   * @param {THREE.Camera} camera - The Three.js camera for animations.
   * @param {Object} callbacks - Callback functions for level reset, mouse movement, and clicks or any other function that needs callbacks from the main file.
   */
  constructor(
    gameName,
    initialLevel,
    camera = null,
    callbacks = {} // Object containing multiple callback functions
  ) {
    this.gameName = gameName;
    this.currentLevel = initialLevel;
    this.currentMode = "";
    this.gameStatusService = null;
    this.curGameSession = null;
    this.isModalOpen = false;
    this.levelModalOpen = true;
    this.health = 4;
    this.currentScore = 0;
    this.choosingModeNotCurrent = "training";
    this.totalstars = 0;

    this.callbacks = callbacks;
    this.camera = camera;
    this.swiper = new Swiper(".mySwiper", {
      modules: [Navigation, Pagination], // ✅ Ensure modules are included
      slidesPerView: 1,
      grabCursor: true,
      loop: true,
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
    });
    // Assigning callbacks with default empty functions to avoid errors
    this.callbacks = {
      resetLevel: callbacks.resetLevel || (() => {}),
      onMouseMove: callbacks.onMouseMove || (() => {}),
      onClick: callbacks.onClick || (() => {}),
    };
    this.initializeUIElements();
    this.addEventListeners();
  }
  /**
   * Sets the game status service, which handles tracking game progress. This step is important if you want to sync UI and player's data.
   * @param {Object} gameStatusService - The service managing game state.
   */
  setGameStatusService(gameStatusService) {
    this.gameStatusService = gameStatusService;
  }

  /**
   * Sets the current game session.
   * @param {Object} curGameSession - The game session object to store session state.
   * This is important if you want to sync game session database with UI
   */
  setGameSession(curGameSession) {
    this.curGameSession = curGameSession;
  }

  /**
   * Initializes all UI elements by selecting DOM elements.
   */
  initializeUIElements() {
    // Main UI text component for hints and any other texts
    this.uiText = document.getElementById("UI-Text");

    // Score texts across page
    this.scoreElements = document.querySelectorAll(".score-label-2");
    this.scoreText = document.querySelector(".score-label-2");

    // Utility Html elements
    this.overlay = document.querySelector(".overlay");
    this.hoverEffects = document.querySelectorAll(".hover");

    // action icons
    this.pseudoBoxButton = document.querySelector(".Pesudocode-Icon");
    this.reArrangeButton = document.querySelector(".Rearrange-Action");
    this.helpInstructionButton = document.querySelector(".Instruction-Icon");

    // Tutorial Modal
    this.tutorialModal = document.querySelector(".modal__tutorial");
    this.tutorialModalNoButton = document.querySelector(".btn__tutorial__no");
    this.tutorialModalYesButton = document.querySelector(".btn__tutorial__yes");
    // Level Completion Modal (Both Success and Failure)
    this.modalCompletion = document.querySelector(".modal__completion");
    this.modalCompletionHeader = document.querySelector(
      ".modal__completion__header"
    );
    this.finalScoreText = document.querySelector(".label__final_score span");
    this.buttonNextLevel = document.querySelector(".btn__next");
    this.buttonAgain = document.querySelector(".btn__again");
    this.buttonChangeLevel = document.querySelector(".btn__change__level");
    this.labelCompletionText = document.querySelector(
      ".label__completion_text"
    );

    // Instruction Modal
    this.instructionModal = document.querySelector(".instruction");
    this.buttonStartInstructionModal = document.querySelector(
      ".btn__instruction__start"
    );

    // Setting Modal
    this.settingsModal = document.querySelector(".modal__settings");
    this.settingsTogglerEle = document.querySelector(".settings__icon");
    this.btnSettingsRestart = document.querySelector(".btn__setting__restart");
    this.btnSettingsDiffLvl = document.querySelector(".btn__setting__diffLvl");
    this.btnSettingsGoMainDungeon = document.querySelectorAll(
      ".btn__setting__mainDungeon"
    );
    this.settingsCloseButton = document.querySelector(
      ".modal__settings .btn__close"
    );

    // Level Selection Modal
    this.levelsModal = document.querySelector(".modal__level__selection");
    this.levelButtons = document.querySelectorAll(".level__btn__holder");
    this.btnLevelClose = document.querySelector(".btn__level__close");
    // headers for two modes
    this.headerWithHealth = document.getElementById("header-with-health");
    this.headerWithoutHealth = document.getElementById("header-without-health");
    // buttons for modes in level selection modal
    this.trainingBtn = document.getElementById("training-mode-btn");
    this.regularBtn = document.getElementById("regular-mode-btn");
    // stars for each level
    this.svgStars = document.querySelectorAll(
      ".level__stars__holder svg.feather-star"
    );

    // Algorithm Instruction Modal
    this.algoInstructionModal = document.querySelector(
      ".algo-instruction-modal"
    );
    this.btnAlgoInstrClose = document.querySelector(
      ".btn-algo-instruction-close"
    );
  }

  /**
   * Adds event listeners for buttons and UI interactions.
   */
  addEventListeners() {
    // -------Instruction Modal---------
    this.addAllEventListenersInstructionModal();
    // -------Pseudo Modal-------
    this.listenEventPseudoModalToggle();
    // -------settings Modal-----
    this.addAllEventListenersForSettingsModal();
    // -------completion Modal-----

    this.addAllEventListenersForCompletionModal();
    // -------Level Selection Modal-----
    this.addAllEventListenersLevelSelectionModal();
    // -------Algorithm Instruction Modal-----
    this.addAllEventListenersAlgoInstructionModal();
  }

  resetAllComponents() {}

  /**
   * Updates the player's score across all score elements in the UI.
   * @param {number} newScore - The new score value.
   */
  updateScore(newScore) {
    this.currentScore = newScore;
    this.scoreElements.forEach((element) => {
      element.textContent = newScore.toString().padStart(2, "0");
    });
    this.scoreText.innerHTML = `${this.currentScore}`;
  }
  /**
   * Hides all stars from the UI.
   * - Loops through each star element and sets its visibility to "hidden".
   * - Used when switching to a mode where stars are not required (e.g., training mode).
   */
  hideStars() {
    this.svgStars.forEach((star) => {
      star.style.visibility = "hidden"; // Hide stars
    });
  }

  /**
   * Displays all stars in the UI.
   * - Loops through each star element and sets its visibility to "visible".
   * - Used when switching to a mode where stars are relevant (e.g., regular mode).
   */
  showStars() {
    this.svgStars.forEach((star) => {
      star.style.visibility = "visible"; // Show stars
    });
  }

  /**
   * Toggles the visibility of the game header based on the mode.
   * - In "regular mode", the health bar is shown.
   * - In "training mode", the header without health is shown instead.
   *
   * @param {boolean} showHealth - If true, displays the header with health; otherwise, hides it.
   */
  toggleHeader(showHealth) {
    if (showHealth) {
      this.headerWithHealth.classList.remove("hidden"); // Show health bar header
      this.headerWithoutHealth.classList.add("hidden"); // Hide non-health header
    } else {
      this.headerWithHealth.classList.add("hidden"); // Hide health bar header
      this.headerWithoutHealth.classList.remove("hidden"); // Show non-health header
    }
  }

  /**
   * Toggles between training and regular game modes.
   * @param {string} mode - The selected mode ("training" or "regular").
   */

  async toggleMode(mode) {
    if (mode === "training") {
      this.trainingBtn.classList.add("active");
      this.regularBtn.classList.remove("active");
      this.choosingModeNotCurrent = "training";
      this.hideStars();
    } else if (mode === "regular") {
      this.regularBtn.classList.add("active");
      this.trainingBtn.classList.remove("active");
      this.choosingModeNotCurrent = "regular";
      this.showStars();
    }

    await this.initializeLevelStatus(mode);
  }
  /**
   * Initializes level status based on game progress.
   * This requires setting gameStatusService and initalizing
   * gameStatusService class with proper data from database
   * @param {string} mode - The selected mode.
   */
  async initializeLevelStatus(mode) {
    try {
      if (!this.gameStatusService) {
        console.error("Error: gameStatusService is not initialized.");
        return;
      }

      const gameStatus = await this.gameStatusService.getLocalGameStatus();

      if (!gameStatus) {
        console.error("No game status found for this user.");
        return;
      }

      this.resetAllLevels();

      const levels = gameStatus.games[this.gameName]?.[mode];
      if (!levels) {
        console.error(`No levels found for mode: ${mode}`);
        return;
      }

      let highestCompletedLevel = 0;
      levels.forEach((gameData, index) => {
        const level = index + 1;
        const currentLevelButton = document.querySelector(
          `.btn__level__${level}`
        );
        const currentStarsHolder = currentLevelButton.querySelector(
          ".level__stars__holder"
        );

        const stars = currentStarsHolder.querySelectorAll("svg.feather-star");
        for (let i = 0; i < stars.length; i++) {
          if (i < gameData.stars) {
            stars[i].classList.add("filled");
            stars[i].style.fill = "#a5d8ff";
          } else {
            stars[i].classList.remove("filled");
            stars[i].style.fill = "none";
          }
        }

        if (gameData.status === "completed") {
          highestCompletedLevel = level;
          this.unlockLevelUI(level);
        }
      });

      if (highestCompletedLevel > 0 && highestCompletedLevel < levels.length) {
        this.unlockLevelUI(highestCompletedLevel + 1);
      }
    } catch (error) {
      console.error("Error initializing level status:", error);
    }
  }

  /**
   * Resets all levels to their locked state except for the first level.
   * - Adds the `level__locked` class to each level button.
   * - Resets all stars to an unfilled state.
   * - Ensures the lock icon is displayed on all levels except the first one.
   */
  resetAllLevels() {
    this.levelButtons.forEach((button) => {
      // Reset all stars to their unfilled state
      button.classList.add("level__locked");
      const stars = button.querySelectorAll(
        ".level__stars__holder svg.feather-star"
      );
      stars.forEach((star) => {
        star.classList.remove("filled");
        star.style.fill = "none";
      });
      // Display the lock icon for locked levels
      const lockIcon = button.querySelector(".feather-lock");
      if (lockIcon) lockIcon.style.display = "block";
    });
    // Ensure the first level is unlocked
    const firstLevelButton = document.querySelector(".btn__level__1");
    if (firstLevelButton) {
      firstLevelButton.classList.remove("level__locked");
      const lockIcon = firstLevelButton.querySelector(".feather-lock");
      if (lockIcon) lockIcon.style.display = "none";
    }
  }

  /**
   * Unlocks a specific level by removing the locked state.
   * - Removes the `level__locked` class from the given level.
   * - Hides the lock icon to indicate the level is now accessible.
   *
   * @param {number} level - The level number to unlock.
   */
  unlockLevelUI(level) {
    const nextLevelButton = document.querySelector(`.btn__level__${level}`);
    if (nextLevelButton) {
      nextLevelButton.classList.remove("level__locked");
      // Hide the lock icon for the unlocked level
      const lockIcon = nextLevelButton.querySelector(".feather-lock");
      if (lockIcon) lockIcon.style.display = "none";
    }
  }

  /**
   * Updates the visual status of a specific level.
   * - Fills in stars to reflect the player's performance.
   * - Unlocks the next level if the current one is completed.
   *
   * @param {number} level - The current level number being updated.
   * @param {number} starsCount - The number of stars achieved (0-based index).
   */
  updateLevelStatus(level, starsCount) {
    const currentGameData =
      this.gameStatusService.gameStatus?.games[this.gameName]?.[
        this.currentMode
      ]?.[level - 1];

    if (starsCount + 1 < currentGameData.stars) {
      return;
    }
    const currentLevelButton = document.querySelector(`.btn__level__${level}`);
    const currentStarsHolder = currentLevelButton.querySelector(
      ".level__stars__holder"
    );

    // Update stars based on the starsCount
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
    // Unlock the next level if the current one is completed
    const nextLevel = level + 1;
    const nextLevelButton = document.querySelector(`.btn__level__${nextLevel}`);
    if (nextLevelButton) {
      nextLevelButton.classList.remove("level__locked");
      // Hide the lock icon for the next level
      const lockIcon = nextLevelButton.querySelector(".feather-lock");
      if (lockIcon) {
        lockIcon.style.display = "none"; // Hide the lock icon
      }
    }
  }

  /**
   * Creates an animated transition of the camera between two positions.
   * - Moves the camera smoothly from the starting position to an elevated position.
   * - Ensures the camera always looks at a fixed point (0,0,4).
   * - Use as needed in 3D three.js renderer and scene
   * Uses GSAP (GreenSock Animation Platform) for smooth animation effects.
   */
  initailCameraAnimationGSAP_K_P() {
    const timeline = gsap.timeline();
    const midPosition = { x: 0, y: 5, z: 26 };
    const endPosition = { x: 0, y: 26, z: 26 };

    // First animation to move to the midPosition
    timeline.to(this.camera.position, {
      x: midPosition.x,
      y: midPosition.y,
      z: midPosition.z,
      duration: 2, // Duration of the first animation
      ease: "power2.inOut",
      onUpdate: () => {
        this.camera.lookAt(new THREE.Vector3(0, 0, 4)); // Keep looking at the target
      },
    });

    // Second animation to move to the endPosition
    timeline.to(this.camera.position, {
      x: endPosition.x,
      y: endPosition.y,
      z: endPosition.z,
      duration: 2, // Duration of the second animation
      ease: "power2.inOut",
      onUpdate: () => {
        this.camera.lookAt(new THREE.Vector3(0, 0, 4)); // Keep looking at the target
      },
    });
  }

  initialCameraAnimationGSAP_HS() {
    const endPosition = { x: 0, y: 2, z: 10 };
    gsap.to(this.camera.position, {
      x: endPosition.x,
      y: endPosition.y,
      z: endPosition.z,
      duration: 4, // Duration of the animation in seconds
      ease: "power2.inOut", // Easing function for smooth movement
      onUpdate: () => {
        // Ensure the camera keeps looking at the target point
        this.camera.lookAt(new THREE.Vector3(0, 2, 0));
      },
    });
  }

  // -------Instruction Modal---------
  /**
   * Adds all event listeners related to the instruction modal.
   * - Initializes click event listeners for different instruction-related UI elements.
   */
  addAllEventListenersInstructionModal() {
    this.listenEventInstructionModalGameStart();
    this.listenEventHelpButtonInstructionModalOpen();
    this.listenEventGameFeatureInstrModal();
    this.listenEventAlgorithmInstrModal();
  }

  /**
   * Handles the event when the "Start Instruction" button is clicked.
   * - Disables mouse event listeners to prevent unintended interactions.
   * - Hides the instruction modal and the overlay.
   * - Ensures that once the instruction modal is closed, it cannot be reopened without user action.
   */
  listenEventInstructionModalGameStart() {
    this.buttonStartInstructionModal.addEventListener("click", () => {
      this.disableMouseEventListeners_K_P();
      console.log("inside Instruction Game Start");
      console.log(this.levelModalOpen);
      if (!this.levelModalOpen) {
        console.log("inside Instruction Game Start enabling");
        this.overlay.classList.add("hidden");
        this.closeModal(this.instructionModal);
      }
      this.instructionModal.classList.add("hidden");
      this.levelModalOpen = false;
    });
  }

  /**
   * Handles the event when the "Help" button is clicked.
   * - Toggles the visibility of the dropdown menu for instruction options.
   */
  listenEventHelpButtonInstructionModalOpen() {
    this.helpInstructionButton.addEventListener("click", () => {
      // this.openModal(this.instructionModal);
      // document.querySelector(".btn__instruction__start").textContent =
      //   "Close Instruction";
      let subMenu = document.getElementById("subMenu");

      subMenu.classList.toggle("open-menu");
    });
  }
  /**
   * Handles the event when the "Game Features" option is selected.
   * - Opens the main instruction modal.
   * - Updates the start button text to indicate that the instruction modal is now open.
   * - Toggles the submenu visibility.
   */
  listenEventGameFeatureInstrModal() {
    const gameFeatureBtn = document.querySelector(".sub-menu-game-features");
    gameFeatureBtn.addEventListener("click", () => {
      this.openModal(this.instructionModal);
      document.querySelector(".btn__instruction__start").textContent =
        "Close Instruction";
      let subMenu = document.getElementById("subMenu");

      subMenu.classList.toggle("open-menu");
    });
  }

  /**
   * Handles the event when the "Algorithm Instructions" option is selected.
   * - Opens the algorithm-specific instruction modal.
   * - Toggles the submenu visibility.
   */
  listenEventAlgorithmInstrModal() {
    const algoInstrBtn = document.querySelector(".sub-menu-algo-instructions");
    algoInstrBtn.addEventListener("click", () => {
      console.log(this.algoInstructionModal);
      this.openModal(this.algoInstructionModal);
      let subMenu = document.getElementById("subMenu");

      subMenu.classList.toggle("open-menu");
    });
  }

  // -------Algorithm Instruction Modal-------

  /**
   * Adds event listeners related to the algorithm instruction modal.
   * - Currently, only includes a listener for closing the modal.
   */
  addAllEventListenersAlgoInstructionModal() {
    this.listenEventCloseButtonAlgoInstructionModal();
  }

  /**
   * Handles the event when the "Close" button in the algorithm instruction modal is clicked.
   * - Closes the modal when the button is clicked.
   */
  listenEventCloseButtonAlgoInstructionModal() {
    this.btnAlgoInstrClose.addEventListener("click", () => {
      this.closeModal(this.algoInstructionModal);
    });
  }

  // -------Pseudo Modal-------

  /**
   * Adds an event listener to toggle the pseudo-code modal.
   * - Listens for a click event on the pseudo-code button and toggles the modal.
   */
  listenEventPseudoModalToggle() {
    this.pseudoBoxButton.addEventListener("click", () => {
      this.pseudoModalToggle();
    });
  }

  /**
   * Toggles the visibility of the pseudo-code modal.
   * - If visible, hides it; if hidden, shows it.
   */
  pseudoModalToggle() {
    const pseudoModal = document.querySelector(".pseudo");
    pseudoModal.classList.toggle("hidden");
  }

  /**
   * Ensures the pseudo-code modal is completely hidden.
   * - Used when explicitly closing the modal.
   */
  pseudoModalClose() {
    const pseudoModal = document.querySelector(".pseudo");
    pseudoModal.classList.add("hidden");
  }

  // -------Setting Modal--------
  /**
   * Adds event listeners for the settings modal.
   * - Handles opening and closing the modal.
   * - Adds functionality for restarting the level and returning to the main dungeon.
   */
  addAllEventListenersForSettingsModal() {
    this.listenEventSettingsModalOpen();
    this.listenEventSettingsModalClose();
    this.listenEventGoToMainDungeon();
    this.listenEventSettingsModalRestartLevel();
  }
  /**
   * Adds an event listener for opening the settings modal.
   * - When the settings toggle button is clicked, the settings modal is opened.
   */
  listenEventSettingsModalOpen() {
    this.settingsTogglerEle.addEventListener("click", () => {
      this.openModal(this.settingsModal);
    });
  }

  /**
   * Adds an event listener for closing the settings modal.
   * - When the close button in the settings modal is clicked, the modal is closed.
   */
  listenEventSettingsModalClose() {
    this.settingsCloseButton.addEventListener("click", () => {
      this.closeModal(this.settingsModal);
    });
  }

  // Event Listener for restarting Level from Settings Modal
  listenEventSettingsModalRestartLevel() {
    this.btnSettingsRestart.addEventListener("click", () => {
      this.closeModal(this.settingsModal);
      this.callbacks.resetLevel(this.currentLevel);
    });
  }

  // Button to go back to main Dungeon in setting modal
  listenEventGoToMainDungeon() {
    this.btnSettingsGoMainDungeon.forEach((button) => {
      button.addEventListener("click", () => {
        window.location.href = "mainDungeon.html";
      });
    });
  }

  // ----------Level Modal-----------------
  /**
   * Adds event listeners for the level selection modal.
   * - Handles opening and closing the modal.
   * - Manages switching between training and regular modes.
   * - Handles level button selections.
   */
  addAllEventListenersLevelSelectionModal() {
    this.listenEventLvlSelectionModalOpen();
    this.listenEventLvlSelectionModalClose();
    this.listenEventLevelSelectionModalToggleModes();
    this.listenEventLevelSelectionModalLevelButtonsSelect();
  }

  /**
   * Adds an event listener for opening the level selection modal.
   * - When the "Change Level" button is clicked in the settings modal:
   *   - Closes the settings modal.
   *   - Disables mouse event listeners temporarily.
   *   - Opens the level selection modal.
   */
  listenEventLvlSelectionModalOpen() {
    this.btnSettingsDiffLvl.addEventListener("click", async (e) => {
      e.preventDefault();

      // Close the settings modal first
      await this.closeModal(this.settingsModal);

      setTimeout(() => {
        this.disableMouseEventListeners_K_P();
      }, 1500); // Re-enable mouse events when modal is closed
      // Open the level sel
      this.btnLevelClose.classList.remove("hidden");
      this.openModal(this.levelsModal);
    });
  }

  /**
   * Adds an event listener for closing the level selection modal.
   * - When the close button is clicked in the level selection modal, the modal is closed.
   */
  listenEventLvlSelectionModalClose() {
    this.btnLevelClose.addEventListener("click", (e) => {
      e.preventDefault();
      this.closeModal(this.levelsModal);
    });
  }

  /**
   * Adds event listeners for toggling between Training Mode and Regular Mode.
   * - When a mode button is clicked, the corresponding mode is selected.
   */
  listenEventLevelSelectionModalToggleModes() {
    // click events for mode selection buttons
    this.trainingBtn.addEventListener("click", () =>
      this.toggleMode("training")
    );
    this.regularBtn.addEventListener("click", () => this.toggleMode("regular"));
  }
  /**
   * Adds event listeners to all level buttons in the level selection modal.
   * - Ensures locked levels cannot be selected.
   * - Closes the modal upon selecting a level.
   * - Resets the game state if the selected level differs from the current level or mode.
   * - Manages health display based on the selected mode.
   * - Initializes a camera animation for certain games.
   */
  listenEventLevelSelectionModalLevelButtonsSelect() {
    this.levelButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        if (button.classList.contains("level__locked")) {
          console.log(`Level ${index + 1} is locked.`);
          return; // Exit if the level is locked
        }

        this.closeModal(this.levelsModal);

        const chosenLevel = index + 1; // Levels are 1-based
        console.log(`Level ${chosenLevel} selected.`);

        // Check if the selected level or mode has changed, or if health is depleted
        if (
          chosenLevel !== this.currentLevel ||
          this.choosingModeNotCurrent !== this.currentMode ||
          this.health < 0
        ) {
          // Update the current level and mode
          this.currentLevel = chosenLevel;
          this.currentMode = this.choosingModeNotCurrent; // Update the current mode
          this.disableMouseEventListeners_K_P(); // Disable mouse events temporarily

          // Reset the game state for the selected level (callback function needed to
          // control your actual game components not related with UI)
          this.callbacks.resetLevel(this.currentLevel);

          // Show or hide the health bar based on the chosen mode
          if (this.currentMode === "regular") {
            this.toggleHeader(true); // Show health bar for regular mode
          } else {
            this.toggleHeader(false); // Hide health bar for training mode
          }

          // Reset game session for the new level
          this.curGameSession.resetGameSession(
            this.gameName,
            this.currentLevel,
            this.currentMode
          );

          // If the game is Kruskal or Prim, trigger the initial camera animation
          if (this.gameName == "Kruskal" || this.gameName == "Prim") {
            this.initailCameraAnimationGSAP_K_P(); // Trigger the camera animation
          }
          if (this.gameName == "Heapsort") {
            this.initialCameraAnimationGSAP_HS();
          }
        }
      });
    });
  }

  // --------Modal Completion----------

  /**
   * Adds event listeners for the completion modal.
   * - Handles interactions when a level is completed or failed.
   * - Provides options to retry, proceed to the next level, or select a different level.
   */
  addAllEventListenersForCompletionModal() {
    this.listenEventPlayAgainCompletionModal();
    this.listenEventPlayNextLevelCompletionModal();
    this.listenEventChangeLevelCompletionModal();
  }
  // open level completion modal
  openCompletionModal() {
    this.openModal(this.modalCompletion);
  }

  // close level completion modal
  closeCompletionModal() {
    this.closeModal(this.modalCompletion);
  }

  /**
   * Populates the completion modal with success details.
   * - Updates UI elements to reflect successful completion.
   * - Displays the player's final score.
   * - Awards stars based on health in regular mode, or default stars in training mode.
   * - Hides the "Next Level" button if the last level is reached.
   */
  fillInfoSuccessCompletionModal() {
    this.modalCompletionHeader.innerHTML = "Congratulations!";
    this.finalScoreText.innerHTML = `${this.currentScore}`;
    this.labelCompletionText.innerHTML = `
        You have successfully completed level ${this.currentLevel} of ${this.gameName}'s Algorithm in ${this.currentMode} mode!
      `;
    // Award stars based on mode
    if (this.currentMode == "regular") {
      this.totalStars = setStars(this.health);
    } else {
      this.totalStars = setStars(4);
    }
    this.buttonChangeLevel.style.display = "none";
    if (this.currentLevel === 3) {
      // Remove or hide the "Next Level" button if it's level 3
      this.buttonNextLevel.style.display = "none";
    } else {
      // Ensure the "Next Level" button is visible for other levels
      this.buttonNextLevel.style.display = "inline-block";
    }
  }

  /**
   * Populates the completion modal with failure details.
   * - Updates UI elements to reflect level failure.
   * - Displays the player's final score.
   * - Hides the "Next Level" button, forcing the player to retry or change levels.
   */

  fillInfoFailureSuccessCompletionModal() {
    this.modalCompletionHeader.innerHTML = "Game Over!";
    this.finalScoreText.innerHTML = `${this.currentScore}`;
    this.labelCompletionText.innerHTML = `
        You have failed level ${this.currentLevel} of ${this.gameName}'s Algorithm in ${this.currentMode} mode!
      `;

    this.totalStars = setStars(this.health);
    this.buttonChangeLevel.style.display = "inline-block";
    this.buttonNextLevel.style.display = "none";
  }

  /**
   * Adds an event listener to restart the current level when the "Play Again" button is clicked.
   */
  listenEventPlayAgainCompletionModal() {
    this.buttonAgain.addEventListener("click", () => {
      this.callbacks.resetLevel(this.currentLevel);
    });
  }

  /**
   * Adds an event listener to proceed to the next level when the "Next Level" button is clicked.
   * - Increments the level counter and resets the scene for the next level.
   */
  listenEventPlayNextLevelCompletionModal() {
    this.buttonNextLevel.addEventListener("click", () => {
      this.currentLevel++;
      this.callbacks.resetLevel(this.currentLevel);
    });
  }

  /**
   * Adds an event listener to allow changing levels when the "Change Level" button is clicked.
   * - Closes the completion modal.
   * - Opens the level selection modal after a short delay.
   * - Ensures mouse interactions are properly managed.
   */
  listenEventChangeLevelCompletionModal() {
    this.buttonChangeLevel.addEventListener("click", () => {
      this.closeCompletionModal();

      setTimeout(() => {
        this.disableMouseEventListeners_K_P();
      }, 1500); // Re-enable mouse events when modal is closed
      // Open the level sel
      this.btnLevelClose.classList.remove("hidden");
      this.openModal(this.levelsModal);
    });
  }

  // Functions for all modals
  // Function to open a modal
  openModal(modal) {
    modal.classList.remove("hidden"); // Show the given modal
    this.overlay.classList.remove("hidden"); // Show overlay
    this.isModalOpen = true; // Update modal state
    this.disableMouseEventListeners_K_P(); // Disable mouse events when modal is open
  }

  // Function to close a modal
  closeModal(modal) {
    modal.classList.add("hidden"); // Hide the given modal
    this.overlay.classList.add("hidden"); // Hide overlay
    this.isModalOpen = false; // Update modal state
    console.log("inside closeModal");
    console.log(this.gameName);
    // this.enableMouseEventListeners_K_P();
    setTimeout(() => {
      this.enableMouseEventListeners_K_P();
    }, 1000); // Re-enable mouse events when modal is closed
  }

  // -------For Kruskal and Prim Only------------
  // enable Mouse event listeners
  enableMouseEventListeners_K_P() {
    console.log(this.gameName);
    if (this.gameName == "Kruskal" || this.gameName == "Prim") {
      if (this.callbacks?.onMouseMove) {
        console.log("mousemove added back");
        window.addEventListener("mousemove", this.callbacks.onMouseMove, false);
      }
      if (this.callbacks?.onClick) {
        console.log("click added back");
        window.addEventListener("click", this.callbacks.onClick, false);
      }
    }
  }

  // Disable mouse event listeners
  disableMouseEventListeners_K_P() {
    if (this.gameName == "Kruskal" || this.gameName == "Prim") {
      if (this.callbacks?.onMouseMove) {
        console.log("mousemove removed");
        window.removeEventListener(
          "mousemove",
          this.callbacks.onMouseMove,
          false
        );
      }
      if (this.callbacks?.onClick) {
        console.log("click removed");
        window.removeEventListener("click", this.callbacks.onClick, false);
      }
    }
  }
  // -------Done For Kruskal and Prim Only------------
}

export default GameRoomUI;
