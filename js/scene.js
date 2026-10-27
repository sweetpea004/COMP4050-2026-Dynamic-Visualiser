import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

/* Scene */
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8eef5);

/* Camera */
export const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(4, 3, 5);
camera.lookAt(0, 0, 0);

/* Canvas and Renderers */
export const canvas = document.getElementById('visualiser-canvas');

if (!canvas) {
  throw new Error('Canvas element #visualiser-canvas not found');
}

export const renderer = new THREE.WebGLRenderer({ canvas });

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio || 1, 2)
);

export const labelRenderer = new CSS2DRenderer();

labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.overflow = 'hidden';

document.body.appendChild(labelRenderer.domElement);

/* Touch Controls */
export const controls = new OrbitControls(
  camera,
  renderer.domElement
);

controls.enableRotate = true;

controls.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN
};

/* Keep orbit centred along the carton row */
const rowOrbitCentre = new THREE.Vector3();
let constrainOrbitToRow = false;

function constrainOrbitTargetToRow() {
  if (!constrainOrbitToRow) {
    return;
  }

  const dy = rowOrbitCentre.y - controls.target.y;
  const dz = rowOrbitCentre.z - controls.target.z;

  controls.target.y = rowOrbitCentre.y;
  controls.target.z = rowOrbitCentre.z;

  camera.position.y += dy;
  camera.position.z += dz;
}

/* Lighting */
const ambientLight = new THREE.AmbientLight(
  0xffffff,
  0.6
);

scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(
  0xffffff,
  1.2
);

directionalLight.position.set(5, 8, 4);
scene.add(directionalLight);

/* Platform */
const platformMaterial = new THREE.MeshStandardMaterial({
  color: 0xb8c2cc
});

let platform = null;

const PLATFORM_OFFSET = 0.05;

export function updatePlatformFromBounds(box) {
  const padding = 10;

  let width = 100;
  let depth = 100;
  let centreX = 0;
  let centreZ = 0;
  let floorY = 0;

  if (!box.isEmpty()) {
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());

    width = size.x + padding * 2;
    depth = size.z + padding * 2;

    centreX = centre.x;
    centreZ = centre.z;

    floorY = box.min.y - PLATFORM_OFFSET;
  }

  if (platform) {
    platform.geometry.dispose();
  } else {
    platform = new THREE.Mesh(
      undefined,
      platformMaterial
    );

    platform.rotation.x = -Math.PI / 2;
    scene.add(platform);
  }

  platform.geometry = new THREE.PlaneGeometry(
    width,
    depth
  );

  platform.position.set(
    centreX,
    floorY,
    centreZ
  );
}

/* Field of view calculation */
function limitingFieldOfView(aspect) {
  const vertical = THREE.MathUtils.degToRad(
    camera.fov
  );

  const horizontal = 2 * Math.atan(
    Math.tan(vertical / 2) * aspect
  );

  return Math.min(vertical, horizontal);
}

/* Frame camera around all visible cartons */
export function frameCameraOnObject(object, cartons) {
  const box = new THREE.Box3().setFromObject(object);

  if (box.isEmpty()) {
    return;
  }

  const centre = box.getCenter(
    new THREE.Vector3()
  );

  const sphere = box.getBoundingSphere(
    new THREE.Sphere()
  );

  const radius = Math.max(sphere.radius, 0.5);

  const limitingFov = limitingFieldOfView(
    camera.aspect
  );

  // Allow extra space for the information panel on desktop
  const framingMultiplier =
  window.innerWidth > 768 && cartons.length === 1
    ? 1.8
    : 1.15;
const distance =
  radius / Math.sin(limitingFov / 2) * framingMultiplier;

  const direction = new THREE.Vector3(
    0.85,
    0.65,
    0.85
  ).normalize();

  camera.position
    .copy(centre)
    .addScaledVector(direction, distance);

  camera.near = Math.max(
    0.1,
    distance / 1000
  );

  camera.far = Math.max(
    1000,
    distance + radius * 3
  );

  camera.updateProjectionMatrix();

  controls.target.copy(centre);
  rowOrbitCentre.copy(centre);

  constrainOrbitToRow = true;

  controls.update();
}

/* Fit platform and camera to selected cartons */
export function fitViewToObject(object, cartons) {
  const box = new THREE.Box3().setFromObject(object);

  updatePlatformFromBounds(box);
  frameCameraOnObject(object, cartons);
}

/* Responsive resizing */
function resizeView() {
  const bounds = canvas.getBoundingClientRect();

  const width = Math.max(
    1,
    Math.round(bounds.width)
  );

  const height = Math.max(
    1,
    Math.round(bounds.height)
  );

  const nextAspect = width / height;
  const oldAspect = camera.aspect;

  // Preserve the camera viewing direction.
  if (
    oldAspect > 0 &&
    Math.abs(nextAspect - oldAspect) > 0.0001
  ) {
    const oldFov = limitingFieldOfView(
      oldAspect
    );

    const nextFov = limitingFieldOfView(
      nextAspect
    );

    const scale =
      Math.sin(oldFov / 2) /
      Math.sin(nextFov / 2);

    const offset = camera.position
      .clone()
      .sub(controls.target);

    camera.position
      .copy(controls.target)
      .addScaledVector(offset, scale);
  }

  camera.aspect = nextAspect;
  camera.updateProjectionMatrix();

  // Match the renderers to the actual canvas area.
  renderer.setSize(width, height, false);

  labelRenderer.setSize(width, height);

  labelRenderer.domElement.style.left =
    `${bounds.left + window.scrollX}px`;

  labelRenderer.domElement.style.top =
    `${bounds.top + window.scrollY}px`;

  controls.update();
}

/* Render Loop */
function animate() {
  controls.update();
  constrainOrbitTargetToRow();

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

export function startRenderLoop() {
  renderer.setAnimationLoop(animate);
}

/* Handle window resizing */
window.addEventListener('resize', resizeView);

/* Handle canvas layout changes */
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(resizeView).observe(canvas);
}

/* Set initial size */
resizeView();