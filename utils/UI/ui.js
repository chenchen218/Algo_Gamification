const uiText = document.getElementById("UI-Text");
export function toggleInstructions(currentAlgorithm) {
  const kruskalPseudo = document.querySelector(".kruskal-pseudo");
  const primPseudo = document.querySelector(".prim-pseudo");
  const heapSortPseudo = document.querySelector(".heapify-pseudo");

  if (currentAlgorithm === "kruskal") {
    kruskalPseudo.classList.toggle("hidden");
    primPseudo.classList.add("hidden");
  } else if (currentAlgorithm === "prim") {
    primPseudo.classList.toggle("hidden");
    kruskalPseudo.classList.add("hidden");
  } else if (currentAlgorithm === "heapsort") {
    heapSortPseudo.classList.toggle("hidden");
  }
}

export function closePseudocode() {
  const kruskalPseudo = document.querySelector(".kruskal-pseudo");
  const primPseudo = document.querySelector(".prim-pseudo");
  const heapSortPseudo = document.querySelector(".heapsort-pseudo");
  primPseudo?.classList.add("hidden");
  kruskalPseudo?.classList.add("hidden");
  heapSortPseudo?.classList.add("hidden");
}

export function decrementHealth(health) {
  const healthIcons = document.querySelectorAll(".health-icon");
  console.log(health);
  if (health >= 0 && health <= 4) {
    healthIcons[health].style.fill = "white";
    health--;
    console.log(health);
  }
  return health;
}

export function resetHealth() {
  let health = 4;
  const healthIcons = document.querySelectorAll(".health-icon");
  for (let i = 0; i <= health; i++) {
    healthIcons[i].style.fill = "red";
  }
  return health;
}

export function setStars(health) {
  const stars = document.querySelectorAll(".star path:last-child");
  let numStars;
  if (health === 4) {
    numStars = 2;
  } else if (health >= 2 && health < 4) {
    // Updated the condition to prevent overlap
    numStars = 1;
  } else if (health >= 0 && health < 2) {
    numStars = 0;
  } else {
    numStars = -1;
  }
  console.log(numStars);

  for (let i = 0; i <= numStars; i++) {
    stars[i].style.fill = "#fab005"; // Ensure the color is a string
  }

  return numStars;
}

export function resetStars() {
  const stars = document.querySelectorAll(".star path:last-child");
  for (let i = 0; i <= 2; i++) {
    stars[i].style.fill = "#e9ecef"; // Ensure the color is a string
  }
}

export function updateHintIcons(listItem, result) {
  const wrongIcon = listItem.querySelector("svg:first-child");
  const correctIcon = listItem.querySelector("svg:nth-child(2)");
  if (result === 0) {
    wrongIcon.classList.remove("hidden");
    correctIcon.classList.add("hidden");
  } else {
    wrongIcon.classList.add("hidden");
    correctIcon.classList.remove("hidden");
  }
}

export function removeFromScene(objects, parent) {
  objects.forEach((obj) => {
    parent.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((material) => material.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
  objects.length = 0; // Clear the array
}

export function updateLabelRotations(labels, camera) {
  labels.forEach((label) => {
    label.lookAt(camera.position);
  });
}
