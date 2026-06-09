const starField = document.querySelector("#starField");
const scoreLabel = document.querySelector("#scoreLabel");
const scoreBar = document.querySelector("#scoreBar");
const resetBtn = document.querySelector("#resetBtn");
const hintBtn = document.querySelector("#hintBtn");
const statusText = document.querySelector("#statusText");
const completionText = document.querySelector("#completionText");

const beacons = document.querySelectorAll(".beacon");
const targets = document.querySelectorAll(".target-ring");

const snapDistance = 0.055;

// Each object stores one beacon's starting position and matching target position.
const nodes = [
  {
    label: "Pier Light",
    startX: 0.16,
    startY: 0.48,
    targetX: 0.22,
    targetY: 0.28,
    locked: false
  },
  {
    label: "Signal Mast",
    startX: 0.35,
    startY: 0.68,
    targetX: 0.38,
    targetY: 0.36,
    locked: false
  },
  {
    label: "Fog Bell",
    startX: 0.52,
    startY: 0.30,
    targetX: 0.54,
    targetY: 0.22,
    locked: false
  },
  {
    label: "Dock Beacon",
    startX: 0.68,
    startY: 0.58,
    targetX: 0.68,
    targetY: 0.42,
    locked: false
  },
  {
    label: "Outer Buoy",
    startX: 0.83,
    startY: 0.38,
    targetX: 0.80,
    targetY: 0.26,
    locked: false
  },
  {
    label: "Tide Gauge",
    startX: 0.26,
    startY: 0.78,
    targetX: 0.30,
    targetY: 0.58,
    locked: false
  },
  {
    label: "Watch Room",
    startX: 0.74,
    startY: 0.76,
    targetX: 0.62,
    targetY: 0.66,
    locked: false
  }
];

let dragIndex = -1;
let offsetX = 0;
let offsetY = 0;

// Place the HTML beacons and target rings using percentage positions.
function placeElements() {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const beacon = beacons[index];
    const target = targets[index];

    if (!node.x && node.x !== 0) {
      node.x = node.startX;
      node.y = node.startY;
    }

    beacon.style.left = node.x * 100 + "%";
    beacon.style.top = node.y * 100 + "%";
    target.style.left = node.targetX * 100 + "%";
    target.style.top = node.targetY * 100 + "%";
  }
}

// Convert the mouse position from the full browser window to the star field area.
function getMousePosition(event) {
  const rect = starField.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    width: rect.width,
    height: rect.height
  };
}

// Start dragging the selected beacon and remember where the mouse grabbed it.
function startDrag(event) {
  const beacon = event.currentTarget;
  dragIndex = Number(beacon.dataset.index);
  const node = nodes[dragIndex];
  const mouse = getMousePosition(event);

  event.preventDefault();
  node.locked = false;
  completionText.hidden = true;

  offsetX = mouse.x - node.x * mouse.width;
  offsetY = mouse.y - node.y * mouse.height;

  beacon.classList.add("is-dragging");
  setStatus(node.label + ": calibrating.");
  updateProgress();
}

// Move the active beacon while the mouse is moving.
function dragBeacon(event) {
  if (dragIndex === -1) {
    return;
  }

  const mouse = getMousePosition(event);
  const node = nodes[dragIndex];

  node.x = (mouse.x - offsetX) / mouse.width;
  node.y = (mouse.y - offsetY) / mouse.height;
  node.x = limitNumber(node.x, 0.04, 0.96);
  node.y = limitNumber(node.y, 0.08, 0.8);

  beacons[dragIndex].style.left = node.x * 100 + "%";
  beacons[dragIndex].style.top = node.y * 100 + "%";

  setStatusForDistance(node);
}

// When the mouse is released, check whether the beacon should snap to its target.
function stopDrag() {
  if (dragIndex === -1) {
    return;
  }

  const node = nodes[dragIndex];
  const beacon = beacons[dragIndex];

  beacon.classList.remove("is-dragging");
  trySnapNode(node, beacon, targets[dragIndex]);
  dragIndex = -1;
  updateProgress();
}

// Lock the beacon in place if it is close enough to the target ring.
function trySnapNode(node, beacon, target) {
  const distance = getDistance(node.x, node.y, node.targetX, node.targetY);

  if (distance <= snapDistance) {
    node.x = node.targetX;
    node.y = node.targetY;
    node.locked = true;
    beacon.style.left = node.x * 100 + "%";
    beacon.style.top = node.y * 100 + "%";
    beacon.classList.add("is-locked");
    target.classList.add("locked");
    setStatus(node.label + ": locked.");
  } else {
    node.locked = false;
    beacon.classList.remove("is-locked");
    target.classList.remove("locked");
    setStatus(node.label + ": drifting.");
  }
}

function setStatusForDistance(node) {
  const distance = getDistance(node.x, node.y, node.targetX, node.targetY);

  if (distance <= snapDistance) {
    setStatus(node.label + ": signal found.");
  } else if (distance <= snapDistance * 1.8) {
    setStatus(node.label + ": signal warming.");
  } else {
    setStatus(node.label + ": calibrating.");
  }
}

// Count the locked beacons and update the progress display.
function updateProgress() {
  let lockedCount = 0;

  for (let index = 0; index < nodes.length; index += 1) {
    if (nodes[index].locked) {
      lockedCount += 1;
    }
  }

  scoreLabel.textContent = lockedCount + " / " + nodes.length + " aligned";
  scoreBar.style.width = (lockedCount / nodes.length) * 100 + "%";

  if (lockedCount === nodes.length) {
    completionText.hidden = false;
    setStatus("Beacon field: aligned.");
  } else if (lockedCount === 0) {
    completionText.hidden = true;
  }
}

function setStatus(message) {
  statusText.textContent = message;
}

// Reset all beacons to their original positions.
function resetField() {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    node.x = node.startX;
    node.y = node.startY;
    node.locked = false;
    beacons[index].classList.remove("is-locked");
    targets[index].classList.remove("locked");
  }

  dragIndex = -1;
  completionText.hidden = true;
  placeElements();
  updateProgress();
  setStatus("Beacon field: unsettled.");
}

// Show or hide the target rings when the hint button is clicked.
function toggleTargets() {
  if (starField.classList.contains("show-targets")) {
    starField.classList.remove("show-targets");
    hintBtn.setAttribute("aria-pressed", "false");
    hintBtn.title = "Reveal targets";
    setStatus("Target field: quiet.");
  } else {
    starField.classList.add("show-targets");
    hintBtn.setAttribute("aria-pressed", "true");
    hintBtn.title = "Hide targets";
    setStatus("Target field: revealed.");
  }
}

function limitNumber(value, min, max) {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

function getDistance(x1, y1, x2, y2) {
  const xDistance = x1 - x2;
  const yDistance = y1 - y2;
  return Math.sqrt(xDistance * xDistance + yDistance * yDistance);
}

for (let index = 0; index < beacons.length; index += 1) {
  beacons[index].addEventListener("mousedown", startDrag);
}

document.addEventListener("mousemove", dragBeacon);
document.addEventListener("mouseup", stopDrag);
resetBtn.addEventListener("click", resetField);
hintBtn.addEventListener("click", toggleTargets);

placeElements();
updateProgress();
setStatus("Beacon field: unsettled.");
