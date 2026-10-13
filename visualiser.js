import {
  canvas,
  fitViewToObject,
  scene,
  startRenderLoop,
} from './js/scene.js';
import {
  buildCartonGroups,
  resetCartonBuildState,
  setCartonGroupVisible,
  setOrientationMarkersVisible,
} from './js/cartons.js';
import { initCartonInfo, renderCartonInfoError, updateCartonInfoUI } from './js/cartonInfo.js';
import { loadSceneData, solutionSource } from './js/solution.js';
import { initPortalActions } from './js/portalActions.js';

startRenderLoop();

/** Carton Groups vs Single Carton */
let cartonGroups = [];
let cartonsGroup = null;
let loadedCartons = [];
let loadedRejects = [];
let focusedCartonIndex = null;
let loadedOrderId = null;
let orientationVisible = false;

function visibleCartonObject() {
  // Show all cartons grouped
  if ( focusedCartonIndex === null ) {
    return cartonsGroup;
  }

  // one carton selected
  return cartonGroups[ focusedCartonIndex ];
}

function visibleCartons() {
  if ( focusedCartonIndex === null ) {
    return loadedCartons;
  }
  return [ loadedCartons[ focusedCartonIndex ] ];
}

function refreshCartonView() {
  cartonGroups.forEach( ( group, index ) => {
    setCartonGroupVisible( group, focusedCartonIndex === null || index === focusedCartonIndex );
  } );

  const object = visibleCartonObject();
  if ( object ) {
    fitViewToObject( object, visibleCartons() );
  }

  updateCartonInfoUI( loadedCartons, loadedRejects, focusedCartonIndex, orientationVisible );
}

function viewCarton( cartonIndex ) {
  focusedCartonIndex = cartonIndex;
  refreshCartonView();
}

function showAllCartons() {
  focusedCartonIndex = null;
  refreshCartonView();
}

function toggleOrientation( visible ) {
  orientationVisible = visible;
  setOrientationMarkersVisible( visible );
}

initCartonInfo( {
  onViewCarton: viewCarton,
  onShowAll: showAllCartons,
  onToggleOrientation: toggleOrientation,
} );

const portalActions = initPortalActions( {
  canvas,
  getOrderId: () => loadedOrderId,
} );

function buildSceneFromData( data ) {
  resetCartonBuildState();
  focusedCartonIndex = null;

  if ( cartonsGroup ) {
    scene.remove( cartonsGroup );
  }

  /** Scene Data */
  loadedCartons = data.cartons ?? [];
  loadedRejects = data.rejects ?? [];
  loadedOrderId = data.order_id ?? null;

  const built = buildCartonGroups( loadedCartons );
  cartonsGroup = built.cartonsGroup;
  cartonGroups = built.cartonGroups;
  scene.add( cartonsGroup );
  setOrientationMarkersVisible( orientationVisible );

  refreshCartonView();
}

const jsonFileName = solutionSource( canvas );
loadSceneData( jsonFileName )
  .then( buildSceneFromData )
  .catch( ( error ) => {
    console.error( error );
    renderCartonInfoError( error );
    portalActions?.setEnabled( false );
  } );
