import { colorForItemRef, colorToHex, isPlacementHighlighted, setPlacementHighlighted } from './cartons.js';

const panel = document.getElementById( 'carton-info' );

let onViewCarton = () => {};
let onShowAll = () => {};
let savedListScrollTop = 0;
const savedOpenCartonIndexes = new Set();

function saveListUiState() {
  if ( !panel ) {
    return;
  }

  savedListScrollTop = panel.scrollTop;
  savedOpenCartonIndexes.clear();
  panel.querySelectorAll( 'details.carton-info-entry[open]' ).forEach( ( entry ) => {
    savedOpenCartonIndexes.add( Number( entry.dataset.cartonIndex ) );
  } );
}

function restoreListScroll() {
  if ( !panel ) {
    return;
  }

  const top = savedListScrollTop;
  requestAnimationFrame( () => {
    panel.scrollTop = top;
  } );
}

export function initCartonInfo( handlers ) {
  onViewCarton = handlers.onViewCarton;
  onShowAll = handlers.onShowAll;
  bindCartonInfoEvents();
}

function placementStartIndex( cartons, cartonIndex ) {
  let start = 0;
  for ( let i = 0; i < cartonIndex; i++ ) {
    start += cartons[ i ].placements?.length ?? 0;
  }
  return start;
}

function rejectItemsHtml( rejects ) {
  return rejects.map( ( reject ) => {
    return `
      <li class="placement-info-item">
        <span class="placement-info-text">
          <span class="placement-info-ref">${ reject.item_ref }</span>
          <span class="placement-info-label">
            ${ reject.reason_code }
            </br>
            ${ reject.message }
          </span>
        </span>
      </li>
    `;
  } ).join( '' );
}

function rejectsSectionHtml( rejects ) {
  return `
    <span class="carton-info-heading"><strong>Rejected Items</strong></span>
    ${ rejects.length > 0
      ? `<ul class="placement-info-list">${ rejectItemsHtml( rejects ) }</ul>`
      : '<p class="placement-info-empty">No Rejected Items</p>'
    }
  `;
}

function placementItemsHtml( placements, startIndex ) {
  return placements.map( ( placement, offset ) => {
    const placementIndex = startIndex + offset;
    const colorHex = colorToHex( colorForItemRef( placement.item_ref ) );
    const checked = isPlacementHighlighted( placementIndex ) ? 'checked' : '';
    return `
      <li class="placement-info-item">
        <input
          type="checkbox"
          class="placement-highlight-toggle"
          data-placement-index="${ placementIndex }"
          ${ checked }
          aria-label="Highlight ${ placement.item_ref }"
        >
        <span class="placement-swatch" style="background-color: ${ colorHex }" aria-hidden="true"></span>
        <span class="placement-info-text">
          <span class="placement-info-ref">${ placement.item_ref }</span>
          <span class="placement-info-label">
            ${ placement.label }
            </br>Weight: ${ ( placement.mass / 1000 ).toFixed( 3 ) } kg
            </br> ${ placement.tags.length > 0
              ? `<ul class="placement-info-tags">${ placement.tags.map( ( tag ) => {
                return `
                  <li>${ tag }</li>
                `;
              } ).join( '' ) }</ul>`
              : ''
            }
          </span>
        </span>
      </li>
    `;
  } ).join( '' );
}

function cartonHeadingHtml( carton ) {
  const [ x, y, z ] = carton.inner_dims;
  return `
    <span class="carton-info-main">
      <span class="carton-info-heading">
        <span class="carton-info-id"><strong>${ carton.carton_id }</strong></span>
        ${ carton.sku }
      </span>
      <span class="carton-info-dims">
        ${ x } × ${ y } × ${ z } mm
        </br>
        Total Weight: ${ ( carton.contents_mass / 1000 ).toFixed( 3 ) } kg
      </span>
    </span>
  `;
}

function cartonContentsHtml( placements, startIndex ) {
  return placements.length > 0
    ? `<ul class="placement-info-list">${ placementItemsHtml( placements, startIndex ) }</ul>`
    : '<p class="placement-info-empty">No placements</p>';
}

function cartonEntryHtml( carton, cartonIndex, startIndex, { showIsolateButton, collapsible, open } ) {
  const placements = carton.placements ?? [];
  const isolateButton = showIsolateButton
    ? `<button type="button" class="carton-action-btn carton-isolate-btn" data-carton-index="${ cartonIndex }" aria-label="Isolate ${ carton.carton_id }">Isolate</button>`
    : '';

  if ( !collapsible ) {
    return `
      <article class="carton-info-entry carton-info-entry-isolated">
        <div class="carton-info-summary">
          ${ cartonHeadingHtml( carton ) }
        </div>
        ${ cartonContentsHtml( placements, startIndex ) }
      </article>
    `;
  }

  return `
    <details class="carton-info-entry" data-carton-index="${ cartonIndex }" ${ open ? 'open' : '' }>
      <summary class="carton-info-summary">
        ${ cartonHeadingHtml( carton ) }
        <span class="carton-entry-actions">
          ${ isolateButton }
          <span class="carton-action-btn carton-expand-btn" aria-hidden="true">
            <span class="carton-expand-label">Expand</span>
            <span class="carton-collapse-label">Collapse</span>
          </span>
        </span>
      </summary>
      ${ cartonContentsHtml( placements, startIndex ) }
    </details>
  `;
}

export function updateCartonInfoUI( cartons, rejects, focusedCartonIndex = null ) {
  if ( !panel ) {
    return;
  }

  if ( cartons.length === 0 ) {
    panel.innerHTML = `
      <p class="carton-info-empty">No cartons in this solution.</p>
      </br>
      ${ rejectsSectionHtml( rejects ) }
    `;
    return;
  }

  const isolated = focusedCartonIndex !== null;
  const showIsolateButtons = cartons.length > 1 && !isolated;
  const cartonIndexes = isolated
    ? [ focusedCartonIndex ]
    : cartons.map( ( _, index ) => index );

  let content = '';
  if ( isolated ) {
    content += `
      <div class="carton-focus-bar">
        <button type="button" class="carton-action-btn carton-back-btn" aria-label="Back to all cartons">Back</button>
      </div>
    `;
  }

  content += cartonIndexes.map( ( cartonIndex ) => {
    return cartonEntryHtml(
      cartons[ cartonIndex ],
      cartonIndex,
      placementStartIndex( cartons, cartonIndex ),
      {
        showIsolateButton: showIsolateButtons,
        collapsible: !isolated,
        open: savedOpenCartonIndexes.has( cartonIndex ),
      },
    );
  } ).join( '' );

  content += `
    </br>
    ${ rejectsSectionHtml( rejects ) }
  `;

  panel.innerHTML = content;
}

export function renderCartonInfoError( error ) {
  if ( !panel ) {
    return;
  }

  panel.innerHTML = `
    <h1>Error: ${ error.status == 404 ? `File Not Found` : `Failure to Load` }</h1>
    </br>
    <p>Please return and try again</p>
  `;
}

function bindCartonInfoEvents() {
  if ( !panel || panel.dataset.eventsBound === 'true' ) {
    return;
  }
  panel.dataset.eventsBound = 'true';

  panel.addEventListener( 'pointerdown', ( event ) => {
    if ( event.target.closest( '.carton-isolate-btn, .carton-back-btn' ) ) {
      event.preventDefault();
      event.stopPropagation();
    }
  } );

  panel.addEventListener( 'click', ( event ) => {
    const isolateButton = event.target.closest( '.carton-isolate-btn' );
    if ( isolateButton ) {
      event.preventDefault();
      event.stopPropagation();
      saveListUiState();
      onViewCarton( Number( isolateButton.dataset.cartonIndex ) );
      panel.scrollTop = 0;
      requestAnimationFrame( () => {
        panel.scrollTop = 0;
      } );
      return;
    }

    const backButton = event.target.closest( '.carton-back-btn' );
    if ( backButton ) {
      event.preventDefault();
      event.stopPropagation();
      onShowAll();
      restoreListScroll();
    }
  } );

  panel.addEventListener( 'change', ( event ) => {
    const toggle = event.target;
    if ( !( toggle instanceof HTMLInputElement ) || !toggle.classList.contains( 'placement-highlight-toggle' ) ) {
      return;
    }
    setPlacementHighlighted( Number( toggle.dataset.placementIndex ), toggle.checked );
  } );
}
