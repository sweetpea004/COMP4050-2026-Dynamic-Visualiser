import {
  canvas,
  fitViewToObject,
  scene,
  startRenderLoop,
} from './js/scene.js';
import { buildCartonGroups, resetCartonBuildState, setCartonGroupVisible } from './js/cartons.js';
import { initCartonInfo, renderCartonInfoError, updateCartonInfoUI } from './js/cartonInfo.js';
import { loadSceneData, solutionSource } from './js/solution.js';

startRenderLoop();

let cartonGroups = [];
let cartonsGroup = null;
let loadedCartons = [];
let loadedRejects = [];
let focusedCartonIndex = null;

function visibleCartonObject() {
  if ( focusedCartonIndex === null ) {
    return cartonsGroup;
  }
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

  updateCartonInfoUI( loadedCartons, loadedRejects, focusedCartonIndex );
}

function viewCarton( cartonIndex ) {
  focusedCartonIndex = cartonIndex;
  refreshCartonView();
}

function showAllCartons() {
  focusedCartonIndex = null;
  refreshCartonView();
}

initCartonInfo( {
  onViewCarton: viewCarton,
  onShowAll: showAllCartons,
} );

function buildSceneFromData( data ) {
  resetCartonBuildState();
  focusedCartonIndex = null;

  if ( cartonsGroup ) {
    scene.remove( cartonsGroup );
  }

  loadedCartons = data.cartons ?? [];
  loadedRejects = data.rejects ?? [];

  const built = buildCartonGroups( loadedCartons );
  cartonsGroup = built.cartonsGroup;
  cartonGroups = built.cartonGroups;
  scene.add( cartonsGroup );

  refreshCartonView();
}

const jsonFileName = solutionSource( canvas );
loadSceneData( jsonFileName )
  .then( buildSceneFromData )
  .catch( ( error ) => {
    console.error( error );
    renderCartonInfoError( error );
  } );
