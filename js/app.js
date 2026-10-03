/* ============================================================
   Selamat Jalan — boot + app-shell wiring
   Loaded last; starts the map backend, the screens and the
   overlays, then patches the shell (tabs, backdrop, esc key).
   ============================================================ */
window.SR = window.SR || {};

(function () {
  'use strict';

  function $(sel) { return SR.ui.$(sel); }
  let booted = false;

  function wireShell() {
    /* bottom tab bar */
    SR.ui.on('#tabbar', '.tab', 'click', function (e, el) {
      SR.ui.showTab(el.getAttribute('data-tab'));
    });

    /* tapping the dim layer shuts whatever sheet is open */
    const bd = $('#backdrop');
    if (bd) bd.addEventListener('click', function () { SR.ui.closeSheet(); });

    /* esc closes the top-most layer — handy while presenting on a laptop */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (SR.store.get().sheet) { SR.ui.closeSheet(); return; }
      if (SR.store.get().overlay) SR.ui.closeOverlay();
    });

    /* a hazard pin on the map opens its detail card */
    SR.MapView.onHazard(function (h) { SR.screens.openHazard(h); });

    /* re-draw the map whenever you come back to that tab
       (Leaflet needs the container visible to size itself) */
    SR.store.on('change', function (parts) {
      if (parts && parts.tab === 'map') SR.screens.renderMap();
    });
  }

  function boot() {
    if (booted) return;
    booted = true;

    SR.report.init();
    SR.ride.init();
    SR.MapView.init($('#map'));
    SR.screens.init();
    wireShell();

    SR.ui.clock();
    SR.screens.renderMap();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  SR.app = { boot: boot, ready: function () { return booted; } };
})();
