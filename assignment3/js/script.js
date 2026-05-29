/*
Assignment 3 design commentary, written as code comments so it remains attached to
the prototype itself:

The chosen context for this browser prototype is a small harbor observatory exhibit
called Harbor Sky Calibration. The exhibit imagines that visitors are helping align
an instrument that translates waterfront beacon lights into a night-sky
constellation. I chose this context because it naturally supports a drag
interaction: calibration is a physical, spatial task, and dragging a point across a
field feels closer to tuning a real instrument than pressing a normal button would.
The brief asks for one focused browser interaction rather than a complete website,
so the whole screen is dedicated to the interactive surface. The header, progress
meter, and two icon controls are intentionally secondary; they frame the experience
without turning it into a conventional content page.

The visual style follows the observatory context. The palette uses deep night
values as a base, but it avoids relying on only one blue tone. Cyan, amber, rose,
and green appear as beacon colors because harbor equipment, instrument panels, and
signal lamps often communicate state through contrasting colored light. The bottom
of the canvas includes a quiet waterfront silhouette, which anchors the artwork in
the chosen setting while keeping the actual task clear. I avoided external images,
fonts, and code libraries so the project meets the assignment rules and can be
published as a simple GitHub Pages folder. Every star, target, building, wave, and
beam is drawn procedurally by this script, so there are no media sources to cite.

Usability depends on feedback being layered rather than explained by a long block
of text. The draggable nodes are brighter and larger than the background stars.
When a pointer hovers over a node, the node gains a ring and the cursor changes,
which suggests that it can be moved. While dragging, guide lines connect the user's
current point to the target and nearby successful targets glow more strongly. When
the user releases close enough to a target, the node snaps into place, locks, and
updates the progress meter. The snap threshold is deliberately forgiving because an
exhibit or art prototype should reward exploration rather than require pixel-perfect
precision. The hint button reveals the complete target constellation for visitors
who want a more explicit puzzle state, while the default view keeps the targets
subtle enough to feel like discovery.

The implementation is tailored to the browser. Canvas allows the visual field to
scale fluidly across desktop and mobile screens without importing a drawing
library. Pointer events unify mouse, touch, and pen input, so the same drag code
works on laptops and phones. The resize handler redraws using devicePixelRatio so
the beacons remain sharp on high-density displays. A small keyboard fallback is
also included: when the canvas has focus, space selects the next unlocked beacon
and arrow keys nudge the active beacon. This fallback does not replace the main
drag concept, but it makes the prototype less brittle for users who cannot or do
not want to use a pointer device. ARIA live text reports state changes without
requiring a separate instruction panel.

If this prototype became part of a larger project, the main advantage would be the
clarity of its interaction model. Dragging spatial objects into alignment could
extend into an educational constellation builder, a museum kiosk, or a narrative
game mechanic. The strongest challenge would be maintaining accessibility and
semantic structure as the canvas scene grows. Canvas is excellent for rich visual
feedback, but it does not expose each drawn object to assistive technology by
default. A production version would likely pair the canvas with DOM controls or a
structured object list so every beacon has a true accessible name, state, and
control. Another challenge would be authoring more levels without hard-coding each
target. A data format for constellations, target tolerances, labels, and feedback
copy would let curators or designers expand the experience without editing the
engine. Performance should remain manageable for this small scene, but a larger
version with particle effects, audio, or many moving objects would need stricter
profiling and options for reduced motion. Even with those challenges, the core
benefit is strong: a single browser gesture creates a clear loop of intent, visual
response, correction, and reward.
*/

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