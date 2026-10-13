import * as THREE from 'three';

import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/*
 * Every placement in the solution JSON carries an `orientation` code (0-5) but
 * the solver doesn't document, anywhere in this repo, which physical rotation
 * each code represents. So this is NOT a decoded "this way up" instruction —
 * it's a stable visual key: each code always points the same direction, so
 * two items sharing a code look identical, and all six codes are visually
 * distinct from one another. That's enough to make orientation visible in the
 * UI, which previously showed nothing. If your solver's encoding turns out to
 * be a specific axis-permutation convention, replace the six vectors below
 * with the real directions and everything downstream keeps working as-is.
 */
const ORIENTATION_DIRECTIONS = [
  new THREE.Vector3( 1, 0, 0 ),   // orientation 0
  new THREE.Vector3( -1, 0, 0 ),  // orientation 1
  new THREE.Vector3( 0, 1, 0 ),   // orientation 2
  new THREE.Vector3( 0, -1, 0 ),  // orientation 3
  new THREE.Vector3( 0, 0, 1 ),   // orientation 4
  new THREE.Vector3( 0, 0, -1 ),  // orientation 5
];

const ARROW_COLOR = 0xd7263d;

function createOrientationLabel( orientation ) {
  const element = document.createElement( 'div' );
  element.className = 'label orientation-label';
  element.textContent = `Orientation ${ orientation }`;
  return new CSS2DObject( element );
}

/* Builds an arrow + text label, in the placement mesh's local space (origin = box
 * centre), pointing in the direction keyed to `orientation`. Hidden by default —
 * the caller toggles `.visible` on the returned group. */
export function createOrientationMarker( orientation, width, height, depth ) {
  const direction = ORIENTATION_DIRECTIONS[ orientation ] ?? ORIENTATION_DIRECTIONS[ 0 ];
  const length = Math.max( Math.min( width, height, depth ) * 0.6, 2 );
  const headLength = Math.min( length * 0.35, 1.2 );
  const headWidth = headLength * 0.6;

  const group = new THREE.Group();
  group.add( new THREE.ArrowHelper( direction, new THREE.Vector3(), length, ARROW_COLOR, headLength, headWidth ) );

  const label = createOrientationLabel( orientation );
  label.position.copy( direction ).multiplyScalar( length + 0.6 );
  group.add( label );

  group.visible = false;
  return group;
}
