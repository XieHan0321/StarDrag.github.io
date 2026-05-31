const canvas = document.querySelector("#skyCanvas");
const ctx = canvas.getContext("2d");
const scoreLabel = document.querySelector("#scoreLabel");
const scoreBar = document.querySelector("#scoreBar");
const resetBtn = document.querySelector("#resetBtn");
const hintBtn = document.querySelector("#hintBtn");
const statusText = document.querySelector("#statusText");
const completionText = document.querySelector("#completionText");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const snapDistance = 0.052;

const state = {
  width: 0,
  height: 0,
  dpr: 1,
  hoverIndex: -1,
  activeIndex: 0,
  dragIndex: -1,
  pointerOffset: { x: 0, y: 0 },
  showTargets: false,
  lastMessage: "",
  startTime: performance.now()
};

const nodes = [
  {
    id: "pier",
    label: "Pier Light",
    color: "#53efd6",
    start: { x: 0.16, y: 0.48 },
    target: { x: 0.22, y: 0.28 }
  },
  {
    id: "signal",
    label: "Signal Mast",
    color: "#f2b35e",
    start: { x: 0.35, y: 0.68 },
    target: { x: 0.38, y: 0.36 }
  },
  {
    id: "fog",
    label: "Fog Bell",
    color: "#ff7f8c",
    start: { x: 0.52, y: 0.30 },
    target: { x: 0.54, y: 0.22 }
  },
  {
    id: "dock",
    label: "Dock Beacon",
    color: "#9fdc8e",
    start: { x: 0.68, y: 0.58 },
    target: { x: 0.68, y: 0.42 }
  },
  {
    id: "buoy",
    label: "Outer Buoy",
    color: "#c5a7ff",
    start: { x: 0.83, y: 0.38 },
    target: { x: 0.80, y: 0.26 }
  },
  {
    id: "tide",
    label: "Tide Gauge",
    color: "#89bfff",
    start: { x: 0.26, y: 0.78 },
    target: { x: 0.30, y: 0.58 }
  },
  {
    id: "watch",
    label: "Watch Room",
    color: "#f7df72",
    start: { x: 0.74, y: 0.76 },
    target: { x: 0.62, y: 0.66 }
  }
].map((node) => ({
  ...node,
  position: { ...node.start },
  locked: false
}));

const links = [
  [0, 1],
  [1, 2],
  [2, 4],
  [1, 3],
  [3, 4],
  [1, 5],
  [5, 6],
  [3, 6]
];

const backgroundStars = createStarField(96);
const waterfront = [
  { x: 0.03, w: 0.06, h: 0.08 },
  { x: 0.11, w: 0.04, h: 0.12 },
  { x: 0.18, w: 0.07, h: 0.07 },
  { x: 0.31, w: 0.05, h: 0.1 },
  { x: 0.42, w: 0.08, h: 0.06 },
  { x: 0.57, w: 0.05, h: 0.13 },
  { x: 0.66, w: 0.06, h: 0.09 },
  { x: 0.78, w: 0.045, h: 0.12 },
  { x: 0.86, w: 0.08, h: 0.075 }
];

function createStarField(count) {
  let seed = 7123;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  return Array.from({ length: count }, () => ({
    x: random(),
    y: random() * 0.74,
    radius: 0.55 + random() * 1.25,
    alpha: 0.22 + random() * 0.58,
    phase: random() * Math.PI * 2
  }));
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  state.width = rect.width;
  state.height = rect.height;
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width * state.dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * state.dpr));
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  draw();
}

function draw(now = performance.now()) {
  const t = prefersReducedMotion ? 0 : (now - state.startTime) / 1000;
  drawBackground(t);
  drawTargets(t);
  drawConnections();
  drawNodes(t);
}

function drawBackground(t) {
  const { width, height } = state;
  ctx.clearRect(0, 0, width, height);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#07111f");
  sky.addColorStop(0.5, "#0b1b24");
  sky.addColorStop(1, "#11201d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  backgroundStars.forEach((star) => {
    const pulse = prefersReducedMotion ? 0.8 : 0.65 + Math.sin(t * 1.2 + star.phase) * 0.25;
    ctx.globalAlpha = star.alpha * pulse;
    ctx.fillStyle = "#f6f0dd";
    ctx.beginPath();
    ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  drawWaterfront();
  drawWater(t);
}

function drawWaterfront() {
  const { width, height } = state;
  const base = height * 0.83;

  ctx.save();
  ctx.fillStyle = "rgba(3, 9, 12, 0.64)";
  ctx.fillRect(0, base, width, height - base);

  ctx.fillStyle = "rgba(6, 13, 17, 0.9)";
  waterfront.forEach((building) => {
    const x = building.x * width;
    const w = building.w * width;
    const h = building.h * height;
    ctx.fillRect(x, base - h, w, h);
    ctx.fillStyle = "rgba(242, 179, 94, 0.24)";
    ctx.fillRect(x + w * 0.22, base - h + h * 0.28, w * 0.14, h * 0.12);
    ctx.fillRect(x + w * 0.58, base - h + h * 0.52, w * 0.14, h * 0.12);
    ctx.fillStyle = "rgba(6, 13, 17, 0.9)";
  });

  ctx.strokeStyle = "rgba(83, 239, 214, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, base + 0.5);
  ctx.lineTo(width, base + 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawWater(t) {
  const { width, height } = state;
  const top = height * 0.86;

  ctx.save();
  for (let line = 0; line < 6; line += 1) {
    const y = top + line * 18;
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 20) {
      const wave = Math.sin(x * 0.015 + t * 0.8 + line) * 4;
      if (x === -20) {
        ctx.moveTo(x, y + wave);
      } else {
        ctx.lineTo(x, y + wave);
      }
    }
    ctx.strokeStyle = line % 2 === 0 ? "rgba(83, 239, 214, 0.1)" : "rgba(242, 179, 94, 0.09)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawTargets(t) {
  const targetOpacity = state.showTargets ? 0.76 : 0.24;

  ctx.save();
  links.forEach(([a, b]) => {
    const start = toScreen(nodes[a].target);
    const end = toScreen(nodes[b].target);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = `rgba(246, 240, 221, ${state.showTargets ? 0.25 : 0.08})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 9]);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  nodes.forEach((node, index) => {
    const target = toScreen(node.target);
    const glow = node.locked ? 0.85 : targetOpacity;
    const pulse = prefersReducedMotion ? 1 : 1 + Math.sin(t * 2.4 + index) * 0.08;
    ctx.strokeStyle = withAlpha(node.color, glow);
    ctx.lineWidth = node.locked ? 3 : 2;
    ctx.beginPath();
    ctx.arc(target.x, target.y, targetRadius() * pulse, 0, Math.PI * 2);
    ctx.stroke();

    if (state.showTargets || node.locked) {
      ctx.fillStyle = withAlpha(node.color, node.locked ? 0.18 : 0.1);
      ctx.beginPath();
      ctx.arc(target.x, target.y, targetRadius() * 0.56, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}

function drawConnections() {
  ctx.save();
  links.forEach(([a, b]) => {
    const startNode = nodes[a];
    const endNode = nodes[b];
    const start = toScreen(startNode.position);
    const end = toScreen(endNode.position);
    const bothLocked = startNode.locked && endNode.locked;
    const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    gradient.addColorStop(0, withAlpha(startNode.color, bothLocked ? 0.86 : 0.34));
    gradient.addColorStop(1, withAlpha(endNode.color, bothLocked ? 0.86 : 0.34));
    ctx.strokeStyle = gradient;
    ctx.lineWidth = bothLocked ? 3 : 1.6;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  });
  ctx.restore();
}

function drawNodes(t) {
  nodes.forEach((node, index) => {
    const point = toScreen(node.position);
    const isHover = index === state.hoverIndex;
    const isActive = index === state.activeIndex;
    const isDragging = index === state.dragIndex;
    const pulse = prefersReducedMotion ? 0 : Math.sin(t * 3 + index) * 1.6;
    const radius = nodeRadius() + (isHover || isDragging ? 4 : 0) + (node.locked ? 2 : 0);

    if (isDragging || isActive) {
      drawGuide(index);
    }

    ctx.save();
    const glow = ctx.createRadialGradient(point.x, point.y, 1, point.x, point.y, radius * 3.5);
    glow.addColorStop(0, withAlpha(node.color, node.locked ? 0.42 : 0.34));
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius * 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = withAlpha(node.color, node.locked ? 0.98 : 0.92);
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.beginPath();
    ctx.arc(point.x - radius * 0.3, point.y - radius * 0.3, Math.max(2, radius * 0.22), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isActive ? "rgba(246, 240, 221, 0.88)" : "rgba(246, 240, 221, 0.28)";
    ctx.lineWidth = isActive ? 2.5 : 1;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawGuide(index) {
  const node = nodes[index];
  const point = toScreen(node.position);
  const target = toScreen(node.target);
  const distance = distanceBetween(node.position, node.target);
  const near = distance < snapDistance * 1.8;
  
 ctx.save();
  ctx.strokeStyle = near ? withAlpha(node.color, 0.62) : "rgba(246, 240, 221, 0.2)";
  ctx.lineWidth = near ? 2 : 1;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(target.x, target.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function getNodeAt(point) {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    const screen = toScreen(node.position);
    const hitRadius = nodeRadius() + 12;
    if (Math.hypot(point.x - screen.x, point.y - screen.y) <= hitRadius) {
      return index;
    }
  }
  return -1;
}

function handlePointerDown(event) {
  const point = getPointerPosition(event);
  const index = getNodeAt(point);

  if (index === -1) {
    return;
  }

  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(event.pointerId);
  state.dragIndex = index;
  state.activeIndex = index;
  state.hoverIndex = index;
  state.pointerOffset = {
    x: point.x - nodes[index].position.x * state.width,
    y: point.y - nodes[index].position.y * state.height
  };
  nodes[index].locked = false;
  completionText.hidden = true;
  setStatus(`${nodes[index].label}: calibrating.`);
  draw();
}

function handlePointerMove(event) {
  const point = getPointerPosition(event);

  if (state.dragIndex !== -1) {
    const node = nodes[state.dragIndex];
    node.position = clampPoint({
      x: (point.x - state.pointerOffset.x) / state.width,
      y: (point.y - state.pointerOffset.y) / state.height
    });
    setStatusForDistance(node);
    draw();
    return;
  }

  const hover = getNodeAt(point);
  if (hover !== state.hoverIndex) {
    state.hoverIndex = hover;
    draw();
  }
}

function handlePointerUp(event) {
  if (state.dragIndex === -1) {
    return;
  }

  const index = state.dragIndex;
  const node = nodes[index];
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  state.dragIndex = -1;
  trySnapNode(node);
  updateProgress();
  draw();
}

function handlePointerLeave() {
  if (state.dragIndex === -1 && state.hoverIndex !== -1) {
    state.hoverIndex = -1;
    draw();
  }
}

function trySnapNode(node) {
  const distance = distanceBetween(node.position, node.target);
  if (distance <= snapDistance) {
    node.position = { ...node.target };
    node.locked = true;
    setStatus(`${node.label}: locked.`);
  } else {
    node.locked = false;
    setStatus(`${node.label}: drifting.`);
  }
}
