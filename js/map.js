/* ============================================================
   Selamat Jalan — map view
   Two backends behind one tiny API:
     · Leaflet + OpenStreetMap (when the CDN + tiles are reachable)
     · a hand-drawn SVG "fake map" of Ipoh (offline / blocked tiles)
   ============================================================ */
window.SR = window.SR || {};

(function () {
  'use strict';

  const IPOH_LL = [4.5975, 101.0901];

  const C = {
    light: {
      bg: '#E8EDF2', park: '#D8E6D5', hill: '#C9DCC4', water: '#B7D4EE',
      case: '#C7D0DA', road: '#FFFFFF', roadMain: '#FFFFFF',
      label: '#5A6577', area: '#37455A', areaHalo: 'rgba(255,255,255,.85)',
      safe: '#0FA958', fast: '#93A0B0', halo: 'rgba(255,255,255,.92)',
      zone: '#B26A00'
    },
    dark: {
      bg: '#0E1620', park: '#12251C', hill: '#152A1F', water: '#153351',
      case: '#1E2A36', road: '#243341', roadMain: '#2B3B4B',
      label: '#8EA2B6', area: '#A9BBCD', areaHalo: 'rgba(8,12,17,.8)',
      safe: '#22C55E', fast: '#6B7C8F', halo: 'rgba(9,14,20,.85)',
      zone: '#F0A020'
    }
  };

  let container = null;
  let backend = 'none';
  let lmap = null, lRoutes = null, lMarks = null, lEnds = null, lPin = null, lZones = null, lJunc = null;
  let statusEl = null, tileCount = 0, fallbackTimer = null, hatchSeq = 0;
  let state = { hazards: [], routes: [], ends: null, pin: null, labels: true, junctions: [], zones: [] };
  let hazardHandler = null;
  let resizeBound = false;

  /* ---------------- projection (degrees, aspect-corrected) ---------------- */
  function projector(lls, pad, W, H) {
    pad = (pad == null) ? 0.08 : pad;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    (lls || []).forEach(function (ll) {
      if (!ll) return;
      if (ll[0] < minLat) minLat = ll[0];
      if (ll[0] > maxLat) maxLat = ll[0];
      if (ll[1] < minLng) minLng = ll[1];
      if (ll[1] > maxLng) maxLng = ll[1];
    });
    if (!isFinite(minLat)) { minLat = IPOH_LL[0]; maxLat = IPOH_LL[0]; minLng = IPOH_LL[1]; maxLng = IPOH_LL[1]; }

    const cLat = (minLat + maxLat) / 2, cLng = (minLng + maxLng) / 2;
    let spanLat = Math.max(maxLat - minLat, 0.006);
    let spanLng = Math.max(maxLng - minLng, 0.006);
    const aspect = Math.max(W, 1) / Math.max(H, 1);
    if (spanLng / spanLat < aspect) spanLng = spanLat * aspect; else spanLat = spanLng / aspect;
    spanLat *= 1 + pad * 2; spanLng *= 1 + pad * 2;

    const v = { s: cLat - spanLat / 2, n: cLat + spanLat / 2, w: cLng - spanLng / 2, e: cLng + spanLng / 2 };
    return {
      view: v,
      fn: function (ll) {
        return { x: (ll[1] - v.w) / (v.e - v.w) * W, y: (v.n - ll[0]) / (v.n - v.s) * H };
      }
    };
  }

  function ipohCorners() { return [[4.726, 101.027], [4.516, 101.152]]; }

  /* ---------------- terrain decoration for the fake map ---------------- */
  const PARKS = [
    { ll: [4.6062, 101.0985], rx: 30, ry: 20 },
    { ll: [4.5900, 101.1135], rx: 26, ry: 22 },
    { ll: [4.6400, 101.1120], rx: 24, ry: 18 },
    { ll: [4.5755, 101.0600], rx: 22, ry: 18 }
  ];
  const HILLS = [
    { ll: [4.6300, 101.0455], rx: 26, ry: 54, rot: -12 },
    { ll: [4.5730, 101.0390], rx: 24, ry: 30, rot: 10 },
    { ll: [4.5450, 101.1470], rx: 30, ry: 26, rot: -18 }
  ];

  function pathOf(poly, P) {
    let d = '';
    poly.forEach(function (ll, i) {
      const p = P(ll);
      d += (i ? ' L ' : 'M ') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
    });
    return d;
  }

  /* bends straight authoring polylines slightly so they read as roads */
  function bend(poly) {
    if (poly.__bent) return poly.__bent;
    const out = [poly[0]];
    for (let i = 1; i < poly.length - 1; i++) {
      const a = poly[i - 1], b = poly[i], n = poly[i + 1];
      const dx = n[1] - a[1], dy = n[0] - a[0];
      const len = Math.hypot(dx, dy) || 1;
      out.push([b[0] + (dx / len) * 0.11, b[1] - (dy / len) * 0.11]);
    }
    out.push(poly[poly.length - 1]);
    poly.__bent = out;
    return out;
  }

  /* ---------------- fake map painter ---------------- */
  function drawFake(target, opts) {
    opts = opts || {};
    const W = Math.max(target.clientWidth || 390, 120);
    const H = Math.max(target.clientHeight || 420, 120);
    const c = opts.dark ? C.dark : C.light;
    const roads = opts.roads === false ? [] : SR.FAKE_ROADS;
    /* one hatch pattern per map instance — several fake maps share the page */
    const hatchId = 'srHatch' + (++hatchSeq);
    const zoneW = 15;

    let pts = [];
    (opts.route || []).forEach(function (item) { (item.poly || item).forEach(function (p) { pts.push(p); }); });
    (opts.pins || []).forEach(function (h) { pts.push(h.ll); });
    if (opts.pin) pts.push(opts.pin);
    if (opts.rider) pts.push(opts.rider);
    if (opts.ends) { pts.push(opts.ends.from); pts.push(opts.ends.to); }
    (opts.zones || []).forEach(function (z) { (z.ll || []).forEach(function (p) { pts.push(p); }); });
    (opts.junctions || []).forEach(function (j) { if (j.ll) pts.push(j.ll); });
    if (!pts.length) pts = ipohCorners();

    const pr = projector(pts, opts.pad == null ? 0.11 : opts.pad, W, H);
    const P = pr.fn;

    /* heavy-vehicle zones: a soft band under the roads, hatch over them */
    const zoneD = (opts.zones || []).map(function (z) { return { id: z.id, d: pathOf(z.ll, P) }; });

    let inner = '';
    HILLS.forEach(function (h) {
      const p = P(h.ll);
      inner += '<ellipse cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" rx="' + h.rx + '" ry="' + h.ry +
        '" fill="' + c.hill + '" transform="rotate(' + h.rot + ' ' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')"/>';
    });
    PARKS.forEach(function (h) {
      const p = P(h.ll);
      inner += '<ellipse cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" rx="' + h.rx + '" ry="' + h.ry + '" fill="' + c.park + '"/>';
    });
    if (opts.water !== false) {
      inner += '<path d="' + pathOf(SR.FAKE_WATER.ll, P) + '" fill="none" stroke="' + c.water +
        '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="' + (opts.dark ? '.85' : '.75') + '"/>';
    }
    zoneD.forEach(function (z) {
      inner += '<path class="fakemap__zone fakemap__zone--soft" data-zone="' + z.id + '" d="' + z.d +
        '" fill="none" stroke="' + c.zone + '" stroke-width="' + zoneW + '" stroke-linecap="butt" stroke-linejoin="round" opacity="' +
        (opts.dark ? '.22' : '.16') + '"/>';
    });
    roads.forEach(function (r) {
      inner += '<path d="' + pathOf(r.ll, P) + '" fill="none" stroke="' + c.case + '" stroke-width="' + (r.w + 2.2) +
        '" stroke-linecap="round" stroke-linejoin="round"/>';
    });
    roads.forEach(function (r) {
      inner += '<path d="' + pathOf(r.ll, P) + '" fill="none" stroke="' + (r.w >= 4 ? c.roadMain : c.road) +
        '" stroke-width="' + r.w + '" stroke-linecap="round" stroke-linejoin="round"/>';
    });
    /* the hatch sits on top of the road so the zone reads as an overlay */
    zoneD.forEach(function (z) {
      inner += '<path class="fakemap__zone fakemap__zone--hatch" data-zone="' + z.id + '" d="' + z.d +
        '" fill="none" stroke="url(#' + hatchId + ')" stroke-width="' + zoneW + '" stroke-linecap="butt" stroke-linejoin="round" opacity=".85"/>';
    });

    (opts.route || []).forEach(function (item) {
      const poly = item.poly || item, tone = item.tone || 'safe', sel = item.selected !== false;
      const d = pathOf(bend(poly.slice()), P);
      if (tone === 'safe') {
        inner += '<path d="' + d + '" fill="none" stroke="' + c.halo + '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
        inner += '<path d="' + d + '" fill="none" stroke="' + c.safe + '" stroke-width="' + (sel ? 5.4 : 4) +
          '" stroke-linecap="round" stroke-linejoin="round" opacity="' + (sel ? 1 : '.55') + '"/>';
      } else {
        inner += '<path d="' + d + '" fill="none" stroke="' + c.halo + '" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>';
        inner += '<path d="' + d + '" fill="none" stroke="' + c.fast + '" stroke-width="' + (sel ? 4.6 : 3.4) +
          '" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="' + (sel ? '11 7' : '7 7') +
          '" opacity="' + (sel ? 1 : '.6') + '"/>';
      }
    });

    const svg = '<svg class="fakemap__svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><pattern id="' + hatchId + '" patternUnits="userSpaceOnUse" width="9" height="9" patternTransform="rotate(38)">' +
        '<path d="M0 0V9" stroke="' + c.zone + '" stroke-width="4" opacity=".85"/></pattern></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="' + c.bg + '"/>' + inner + '</svg>';

    let labels = '';
    if (opts.labels !== false) {
      roads.forEach(function (r) {
        if (r.w < 4) return;
        const p = P(r.ll[Math.floor(r.ll.length / 2)]);
        if (p.x < -40 || p.x > W + 40 || p.y < -20 || p.y > H + 20) return;
        labels += '<span class="flabel" style="left:' + p.x.toFixed(1) + 'px;top:' + p.y.toFixed(1) +
          'px;color:' + c.label + '">' + SR.ui.esc(r.name) + '</span>';
      });
      SR.FAKE_AREAS.forEach(function (a) {
        const p = P(a.ll);
        if (p.x < -30 || p.x > W + 30 || p.y < -14 || p.y > H + 14) return;
        labels += '<span class="flabel flabel--area" style="left:' + p.x.toFixed(1) + 'px;top:' + p.y.toFixed(1) +
          'px;color:' + c.area + ';text-shadow:0 1px 0 ' + c.areaHalo + ',0 0 6px ' + c.areaHalo + '">' + SR.ui.esc(a.n) + '</span>';
      });
    }

    let marks = '';
    /* black markers for the dangerous junctions — context for the pins,
       not a detail card of their own, so they are not interactive */
    (opts.junctions || []).forEach(function (j) {
      const p = P(j.ll);
      marks += '<div class="fakemap__mk fakemap__mk--junction" data-junction="' + j.id + '" style="left:' +
        Math.max(6, Math.min(W - 6, p.x)).toFixed(1) + 'px;top:' + Math.max(6, Math.min(H - 6, p.y)).toFixed(1) +
        'px" title="' + SR.ui.esc(j.name) + '" aria-label="Dangerous junction: ' + SR.ui.esc(j.name) + ' · ' +
        j.crashes + ' rider crashes"><span class="juncpin">' + SR.ICONS.junction + '</span></div>';
    });
    (opts.pins || []).forEach(function (h) {
      const p = P(h.ll);
      const left = Math.max(6, Math.min(W - 6, p.x)), top = Math.max(6, Math.min(H - 6, p.y));
      marks += '<div class="fakemap__mk" data-hazard="' + h.id + '" style="left:' + left.toFixed(1) + 'px;top:' + top.toFixed(1) +
        'px" role="button" tabindex="0" aria-label="' + SR.ui.esc(SR.type(h.type).label + ' on ' + h.road) + '">' +
        SR.ui.pinHTML(h, { small: opts.smallPins, label: opts.labels !== false && h.sev === 'high' && !opts.smallPins }) + '</div>';
    });
    if (opts.ends) {
      [['from', ''], ['to', ' map-end--to']].forEach(function (pair) {
        const p = P(opts.ends[pair[0]]);
        marks += '<div class="fakemap__mk" style="left:' + p.x.toFixed(1) + 'px;top:' + p.y.toFixed(1) + 'px">' +
          '<span class="map-end' + pair[1] + '"></span></div>';
      });
    }
    if (opts.pin) {
      const p = P(opts.pin);
      marks += '<div class="fakemap__mk" style="left:' + p.x.toFixed(1) + 'px;top:' + p.y.toFixed(1) + 'px">' +
        '<span class="pin" style="background:#E5342A;color:#fff">' + SR.ICONS.pin + '</span></div>';
    }
    if (opts.rider) {
      const p = P(opts.rider);
      marks += '<div class="fakemap__mk" id="fake-rider" style="left:' + p.x.toFixed(1) + 'px;top:' + p.y.toFixed(1) + 'px"><span class="rider-dot"></span></div>';
    }

    const old = target.querySelector('.fakemap');
    const wrap = document.createElement('div');
    wrap.className = 'fakemap';
    wrap.innerHTML = svg + '<div class="fakemap__layer">' + labels + marks + (opts.extraHTML || '') + '</div>';
    if (old) target.replaceChild(wrap, old); else target.appendChild(wrap);

    return { W: W, H: H, proj: P, layer: wrap.querySelector('.fakemap__layer'), wrap: wrap };
  }

  /* tap / click on a hazard pin (works for both backends) */
  function bindPins(root) {
    root.addEventListener('click', function (e) {
      const mk = e.target.closest('.fakemap__mk[data-hazard]');
      if (mk && hazardHandler) hazardHandler(SR.hazard(mk.getAttribute('data-hazard')));
    });
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const mk = e.target.closest('.fakemap__mk[data-hazard]');
      if (mk && hazardHandler) { e.preventDefault(); hazardHandler(SR.hazard(mk.getAttribute('data-hazard'))); }
    });
  }
  /* ---------------- leaflet backend ---------------- */
  function hasLeaflet() { return !!(window.L && window.L.map); }

  function iconFor(h, opts) {
    opts = opts || {};
    return L.divIcon({
      className: 'sr-icon',
      html: SR.ui.pinHTML(h, opts),
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  }

  function leafletRender() {
    lRoutes.clearLayers(); lMarks.clearLayers(); lEnds.clearLayers(); lZones.clearLayers(); lJunc.clearLayers();
    /* heavy-vehicle zones: a translucent band plus a hatched dashed line.
       An explicit SVG renderer keeps the overlay crisp (and inspectable)
       even though the map prefers canvas for the mass of markers. */
    if (state.zones && state.zones.length) {
      const zoneRenderer = L.svg();
      state.zones.forEach(function (z) {
        L.polyline(z.ll, {
          renderer: zoneRenderer, className: 'zone-line zone-line--soft', color: '#B26A00',
          weight: 15, opacity: 0.18, lineCap: 'butt', interactive: false
        }).addTo(lZones);
        L.polyline(z.ll, {
          renderer: zoneRenderer, className: 'zone-line zone-line--hatch', color: '#B26A00',
          weight: 15, opacity: 0.85, dashArray: '3 6', lineCap: 'butt', interactive: false
        }).addTo(lZones);
      });
    }
    (state.junctions || []).forEach(function (j) {
      L.marker(j.ll, {
        keyboard: false,
        interactive: false,
        title: j.name,
        icon: L.divIcon({
          className: 'sr-icon', iconSize: [26, 26], iconAnchor: [13, 13],
          html: '<span class="juncpin" title="' + SR.ui.esc(j.name) + '">' + SR.ICONS.junction + '</span>'
        })
      }).addTo(lJunc);
    });
    state.routes.forEach(function (r) {
      const safe = r.tone === 'safe', sel = r.selected !== false;
      L.polyline(r.poly, {
        color: safe ? '#0FA958' : '#93A0B0',
        weight: sel ? (safe ? 6 : 4.5) : (safe ? 4.5 : 3.5),
        opacity: sel ? 0.98 : 0.55,
        dashArray: safe ? null : (sel ? '12 8' : '8 8'),
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false
      }).addTo(lRoutes);
    });
    state.hazards.forEach(function (h) {
      L.marker(h.ll, { icon: iconFor(h, { small: !state.labels, label: state.labels && h.sev === 'high' }), keyboard: true, title: h.road })
        .on('click', function () { if (hazardHandler) hazardHandler(h); })
        .addTo(lMarks);
    });
    if (state.ends) {
      ['from', 'to'].forEach(function (k) {
        L.marker(state.ends[k], {
          interactive: false,
          icon: L.divIcon({ className: 'sr-icon', html: '<span class="map-end' + (k === 'to' ? ' map-end--to' : '') + '"></span>', iconSize: [18, 18], iconAnchor: [9, 9] })
        }).addTo(lEnds);
      });
    }
    if (state.pin) {
      L.marker(state.pin, {
        interactive: false,
        icon: L.divIcon({ className: 'sr-icon', html: '<span class="pin" style="background:#E5342A;color:#fff">' + SR.ICONS.pin + '</span>', iconSize: [34, 34], iconAnchor: [17, 17] })
      }).addTo(lEnds);
    }
  }

  function fitLeaflet() {
    let pts = [];
    state.routes.forEach(function (r) { pts = pts.concat(r.poly); });
    if (state.pin) pts.push(state.pin);
    if (state.rider) pts.push(state.rider);
    /* once a route is chosen, keep its junctions and lorry zones in frame */
    if (state.routes.length) {
      (state.zones || []).forEach(function (z) { (z.ll || []).forEach(function (p) { pts.push(p); }); });
      (state.junctions || []).forEach(function (j) { if (j.ll) pts.push(j.ll); });
    }
    if (state.ends && !pts.length) { pts.push(state.ends.from); pts.push(state.ends.to); }
    if (pts.length > 1) {
      lmap.fitBounds(L.latLngBounds(pts).pad(0.18), { animate: false });
    } else if (pts.length === 1) {
      lmap.setView(pts[0], 14, { animate: false });
    } else {
      lmap.setView(IPOH_LL, 12, { animate: false });
    }
  }

  function goFake(reason) {
    backend = 'fake';
    if (lmap) { try { lmap.remove(); } catch (e) { /* noop */ } lmap = null; }
    if (statusEl) { statusEl.hidden = false; statusEl.innerHTML = SR.ICONS.alert + '<span>' + reason + '</span>'; }
    render();
  }

  function initLeaflet() {
    backend = 'leaflet';
    if (statusEl) statusEl.hidden = true;
    lmap = L.map(container, {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
      minZoom: 10,
      maxZoom: 18
    }).setView(IPOH_LL, 12);
    lmap.attributionControl.setPrefix('');
    const layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    });
    layer.on('tileload', function () {
      tileCount++;
      if (tileCount === 1 && statusEl) statusEl.hidden = true;
    });
    layer.on('tileerror', function () {
      if (tileCount === 0) goFake('Map tiles blocked — using offline map');
    });
    layer.addTo(lmap);
    lRoutes = L.layerGroup().addTo(lmap);
    lEnds = L.layerGroup().addTo(lmap);
    lZones = L.layerGroup().addTo(lmap);
    lMarks = L.layerGroup().addTo(lmap);
    lJunc = L.layerGroup().addTo(lmap);
    fallbackTimer = setTimeout(function () {
      if (backend === 'leaflet' && tileCount < 2) goFake('Slow tiles — using offline map');
      fallbackTimer = null;
    }, 5000);
    render();
  }

  /* ---------------- public API ---------------- */
  function render(next) {
    if (next) state = Object.assign({}, state, next);
    if (backend === 'leaflet' && lmap) { leafletRender(); fitLeaflet(); return; }
    if (!container) return;
    drawFake(container, {
      pins: state.hazards,
      route: state.routes,
      ends: state.ends,
      junctions: state.junctions,
      zones: state.zones,
      pin: state.pin,
      labels: state.labels,
      smallPins: !state.labels,
      dark: state.dark
    });
  }

  function init(el) {
    container = el;
    statusEl = SR.ui.$('#map-status');
    /* keep hazard pins tappable even when we fall back to the local drawing */
    bindPins(container);
    if (hasLeaflet()) {
      try { initLeaflet(); } catch (e) { goFake('Offline map — using local drawing'); }
    } else {
      backend = 'fake';
      render();
    }
    if (!resizeBound) {
      resizeBound = true;
      window.addEventListener('resize', function () { if (backend === 'fake') render(); });
      window.addEventListener('orientationchange', function () { if (backend === 'fake') render(); });
    }
    return backend;
  }

  /* static snapshot map used by the sheets / ride / detail screens */
  function miniInto(el, opts) {
    opts = opts || {};
    const res = drawFake(el, opts);
    /* keep snapping pins tappable — unless the caller is mid-task (ride mode) */
    if (!res.layer.__bound) { res.layer.__bound = true; if (opts.tappable !== false) bindPins(res.layer); }
    return res;
  }

  /* redraw a previously built snapshot with a new set of options */
  function redraw(el, opts) { return drawFake(el, opts || {}); }

  SR.MapView = {
    init: init,
    render: render,
    miniInto: miniInto,
    redraw: redraw,
    projector: projector,
    onHazard: function (fn) { hazardHandler = fn; },
    onPin: bindPins,
    isOffline: function () { return backend === 'fake'; },
    backend: function () { return backend; }
  };

  /* __APPEND__ */
})();
