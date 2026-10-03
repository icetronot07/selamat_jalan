/* ============================================================
   Selamat Jalan — screens: map tab, route comparison, reports, profile
   ============================================================ */
window.SR = window.SR || {};

(function () {
  'use strict';

  function $(sel) { return SR.ui.$(sel); }
  function esc(s) { return SR.ui.esc(s); }
  function toast(m, ms) { SR.ui.toast(m, ms); }

  const RAIN_ICON = '🌧️';

  /* ---------------- hazard legend chips ---------------- */
  function renderChips() {
    const hidden = SR.store.get().hidden;
    $('#legend').innerHTML = SR.HAZARD_TYPES.map(function (t) {
      const off = !!hidden[t.id];
      return '<button class="chip' + (off ? ' is-off' : '') + '" type="button" data-type="' + t.id +
        '" aria-pressed="' + (!off ? 'true' : 'false') + '"><i style="background:' + t.color + '"></i>' + esc(t.label) + '</button>';
    }).join('');
  }

  /* ---------------- route + map state ---------------- */
  function routeLayers() {
    const r = SR.store.routeStates();
    if (!r) return { routes: [], ends: null, title: '' };
    const sel = SR.store.get().selectedRoute;
    return {
      routes: [
        { poly: r.fastest.poly, tone: 'fast', selected: sel === 'fastest' },
        { poly: r.safest.poly, tone: 'safe', selected: sel === 'safest' }
      ],
      ends: { from: r.dest.fromLL, to: r.dest.toLL },
      title: r.dest.short
    };
  }

  function renderMap() {
    const s = SR.store.get();
    const rl = routeLayers();
    $('#map-tag').textContent = s.destinationId ? 'To ' + rl.title.split('→').pop().trim() + ' · Ipoh' : 'Ipoh · Perak';
    $('#where-label').textContent = s.destinationId ? rl.title : 'Search Ipoh, Perak';
    SR.MapView.render({
      hazards: SR.store.visibleHazards(),
      routes: rl.routes,
      ends: rl.ends,
      junctions: SR.DANGEROUS_JUNCTIONS,
      zones: SR.LORRY_ZONES,
      labels: s.labels,
      frameAll: !s.destinationId
    });
  }

  /* ---------------- destination sheet ---------------- */
  function openDestSheet() {
    const cur = SR.store.get().destinationId;
    const rows = SR.DESTINATIONS.map(function (d) {
      return '<button class="dest' + (cur === d.id ? ' is-hi' : '') + '" type="button" data-dest="' + d.id + '">' +
        '<span class="dest__ico">' + SR.ICONS.moto + '</span>' +
        '<span class="dest__col">' +
          '<b>' + esc(d.from) + ' → ' + esc(d.to) + '</b>' +
          '<em>' + esc(d.via) + '</em>' +
          '<span class="dest__meta">' +
            '<span class="pill pill--grey">' + d.km + ' km</span>' +
            '<span class="pill pill--green">' + d.etaSafe + ' min safest</span>' +
            '<span class="pill pill--red">' + esc(d.tag) + '</span>' +
          '</span>' +
        '</span>' +
        '<span class="dest__go">›</span>' +
      '</button>';
    }).join('');

    SR.ui.openSheet('dest',
      '<div class="sheet__grab"></div>' +
      '<div class="sheet__head">' +
        '<div><h2>Where to?</h2><p>Demo destinations around Ipoh, Perak</p></div>' +
        '<button class="iconbtn iconbtn--soft" type="button" data-act="close-sheet" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="sheet__body">' + rows + '</div>');
  }

  function pickDestination(id) {
    SR.store.patch({ destinationId: id, selectedRoute: 'safest' });
    SR.ui.closeSheet();
    renderMap();
    setTimeout(function () { openRouteSheet(); }, 200);
  }

  /* route comparison sheet */

  function scoreCls(s) { return s >= 8 ? 'metric--good' : s >= 6.5 ? 'metric--warn' : 'metric--danger'; }

  function routeCard(kind, r, sel, rec) {
    const isFast = kind === 'fastest';
    const hazCls = r.hazHits >= 6 ? 'metric--danger' : r.hazHits >= 3 ? 'metric--warn' : 'metric--good';
    const nj = (r.junctions || []).length, nz = (r.zones || []).length;
    return '<button class="rcard rcard--' + (isFast ? 'fast' : 'safe') + (sel ? ' is-sel' : '') +
        '" type="button" data-route="' + kind + '">' +
      '<span class="rcard__top">' +
        '<span class="rcard__swatch"></span>' +
        '<span class="rcard__name">' + esc(r.label) + ' <em>' + esc(r.note) + '</em></span>' +
        (rec ? '<span class="rcard__rec">Recommended</span>' : '') +
      '</span>' +
      '<span class="rcard__metrics">' +
        '<span class="metric"><b>' + r.time + '</b><em>min</em></span>' +
        '<span class="metric metric--good"><b>' + r.dist.toFixed(1) + '</b><em>km</em></span>' +
        '<span class="metric ' + hazCls + '"><b>' + r.hazHits + '</b><em>hazard spots</em></span>' +
      '</span>' +
      /* the two halves of the safety score: road surface vs traffic */
      '<span class="rcard__scores">' +
        '<span class="metric ' + scoreCls(r.roadScore) + '"><b>' + r.roadScore.toFixed(1) + '</b><em>road condition</em></span>' +
        '<span class="metric ' + scoreCls(r.trafficScore) + '"><b>' + r.trafficScore.toFixed(1) + '</b><em>traffic risk</em></span>' +
      '</span>' +
      '<span class="rcard__risk">' +
        '<span class="pill pill--dark">' + SR.plural(nj, 'dangerous junction', 'dangerous junctions') + '</span>' +
        '<span class="pill pill--hatch">' + (nz ? SR.plural(nz, 'heavy-vehicle road', 'heavy-vehicle roads') : 'no heavy-vehicle roads') + '</span>' +
      '</span>' +
      '<span class="scorebar"><i style="width:' + (r.score * 10) + '%;background:' + SR.ui.scoreColor(r.score) + '"></i></span>' +
      '<span class="scoreline"><span>Safety score · road 60% + traffic 40%</span><b>' + r.score.toFixed(1) + '/10</b></span>' +
    '</button>';
  }

  function whyBlock(r, rain) {
    if (r.why && r.why.length) {
      return '<div class="why' + (rain ? ' why--rain' : '') + '">' +
        '<h3>' + (rain ? 'Wet-weather reasoning' : 'Why this is safer — road and traffic') + '</h3><ul>' +
        r.why.map(function (w, i) { return '<li><i>' + (i + 1) + '</i>' + esc(w) + '</li>'; }).join('') +
      '</ul></div>';
    }
    const items = (r.hazards || []).slice(0, 3).map(function (id) {
      const h = SR.hazard(id);
      return h ? '<li><i>!</i>' + esc(SR.type(h.type).label) + ' on ' + esc(h.road) + '</li>' : '';
    }).join('');
    if (!items) return '';
    return '<div class="why why--rain"><h3>Hazards this route still crosses</h3><ul>' + items + '</ul></div>';
  }

  function timeSeg(t) {
    return '<div class="seg seg--time" id="time-seg" role="group" aria-label="Time of day">' +
      SR.TIMES.map(function (x) {
        return '<button class="seg__opt' + (x.id === t ? ' is-sel' : '') + '" type="button" data-time="' + x.id +
          '" aria-pressed="' + (x.id === t ? 'true' : 'false') + '">' + esc(x.label) + '<em>' + esc(x.note) + '</em></button>';
      }).join('') + '</div>';
  }

  function routeSheetHTML() {
    const r = SR.store.routeStates();
    const sel = SR.store.get().selectedRoute;
    const rain = SR.store.get().rain;
    const time = SR.timeInfo(r.time);
    const qj = (r.fastest.junctions || []).length, qz = (r.fastest.zones || []).length;
    const sub = rain
      ? 'Wet-weather routing on — floods and slick hills avoided'
      : time.label + ' · ' + SR.plural(qj, 'junction', 'junctions') + ' and ' +
        SR.plural(qz, 'lorry road', 'lorry roads') + ' on the quick way';

    return '<div class="sheet__grab"></div>' +
      '<div class="sheet__head">' +
        '<div><h2>' + esc(r.dest.from) + ' → ' + esc(r.dest.to) + '</h2><p>' + esc(sub) + '</p></div>' +
        '<button class="iconbtn iconbtn--soft" type="button" data-act="close-sheet" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="sheet__body">' +
        '<div class="minipin" id="sheet-map"></div>' +
        '<div class="mapkey">' +
          '<span><i class="juncpin juncpin--key" aria-hidden="true"></i>Dangerous junction</span>' +
          '<span><i class="hatchkey" aria-hidden="true"></i>Heavy-vehicle zone</span>' +
        '</div>' +
        '<div class="timerow">' +
          '<span class="timerow__ico" aria-hidden="true">🕘</span>' +
          '<span class="timerow__col"><b>Time of day</b><em>' + esc(time.risk) + '</em></span>' +
        '</div>' +
        timeSeg(r.time) +
        '<label class="rainrow' + (rain ? ' is-on' : '') + '" for="rain-toggle">' +
          '<span class="rainrow__ico" aria-hidden="true">' + RAIN_ICON + '</span>' +
          '<span class="rainrow__col"><b>Raining right now</b><em>Prefer dry roads and lit stretches</em></span>' +
          '<input type="checkbox" class="switch" id="rain-toggle"' + (rain ? ' checked' : '') + ' />' +
        '</label>' +
        routeCard('fastest', r.fastest, sel === 'fastest', false) +
        routeCard('safest', r.safest, sel === 'safest', true) +
        whyBlock(sel === 'fastest' ? r.fastest : r.safest, rain && sel === 'safest') +
        '<p class="proto-tag">Hazard data is simulated · JKR / MBI routing is a mock-up</p>' +
      '</div>' +
      '<div class="sheet__foot">' +
        '<button class="btn btn--ghost" type="button" data-act="change-dest">Change</button>' +
        '<button class="btn btn--green btn--block" type="button" data-act="start-ride">' +
          '<span aria-hidden="true">▶</span> Start ride</button>' +
      '</div>';
  }

  function drawSheetMap() {
    const el = $('#sheet-map');
    if (!el) return;
    const rl = routeLayers();
    const b = SR.store.selectedBundle();
    const tf = SR.store.trafficOf(b && b.route);
    SR.MapView.miniInto(el, {
      route: rl.routes,
      ends: rl.ends,
      pins: SR.store.visibleHazards(),
      junctions: tf.junctions,
      zones: tf.zones,
      labels: false,
      smallPins: true,
      pad: 0.13
    });
  }

  function renderRouteSheet(keepScroll) {
    const el = $('#sheet-route');
    const oldBody = el.querySelector('.sheet__body');
    const st = keepScroll && oldBody ? oldBody.scrollTop : 0;
    el.innerHTML = routeSheetHTML();
    const body = el.querySelector('.sheet__body');
    if (body) body.scrollTop = st;
    drawSheetMap();
  }

  function openRouteSheet() {
    if (!SR.store.selectedBundle()) return;
    SR.ui.openSheet('route', routeSheetHTML());
    drawSheetMap();
  }

  /* ---------------- my reports ---------------- */
  const STAGE_PILL = ['pill--red', 'pill--grey', 'pill--amber', 'pill--green'];

  function timeline(stage) {
    return '<span class="timeline">' + SR.STAGES.map(function (s, i) {
      const cls = i < stage ? 'is-done' : (i === stage ? (stage === SR.STAGES.length - 1 ? 'is-done' : 'is-now') : '');
      return '<span class="tl ' + cls + '"><span class="tl__dot"></span><span class="tl__cap">' + esc(s) + '</span></span>';
    }).join('') + '</span>';
  }

  function repCard(r) {
    const t = SR.type(r.type);
    return '<button class="rep" type="button" data-report="' + r.id + '">' +
      '<span class="rep__top">' +
        '<span class="rep__ico" style="background:' + t.color + '">' + t.icon + '</span>' +
        '<span class="rep__col">' +
          '<b>' + esc(t.label) + ' — ' + esc(r.road) + '</b>' +
          '<em>' + esc(r.area) + ' · sent ' + esc(r.submitted) + '</em>' +
          '<span class="rep__meta">' +
            '<span class="rep__ticket">' + esc(r.ticket) + '</span>' +
            '<span class="pill ' + STAGE_PILL[r.stage] + '">' + esc(SR.stageLabel(r.stage)) + '</span>' +
            '<span class="pill pill--grey">' + r.confirms + ' confirms</span>' +
            (r.stage === 0 ? '<span class="rep__new">Just sent</span>' : '') +
          '</span>' +
        '</span>' +
      '</span>' + timeline(r.stage) +
    '</button>';
  }

  function renderReports() {
    const st = SR.store.reportStats();
    $('#reports-sub').textContent = st.total + ' sent · ' + st.fixed + ' fixed · ' + st.confirms + ' confirmations';
    const badge = $('#tab-badge');
    badge.textContent = st.open;
    badge.hidden = st.open === 0;
    const list = SR.store.get().reports;
    $('#reports-list').innerHTML = list.length
      ? list.map(repCard).join('')
      : '<p class="empty">No reports yet.<br />See a hazard? Tap the red button to send one to JKR or MBI.</p>';
  }

  /* ---------------- shared detail bits ---------------- */
  const PHOTO_CLS = { flooding: 'flood' };

  function photo(type, badge) {
    return '<div class="photo photo--' + (PHOTO_CLS[type] || type) + '">' +
      '<span class="photo__badge">' + esc(badge) + '</span></div>';
  }

  function row(k, v) {
    return '<span class="reviewrow"><span class="reviewrow__k">' + esc(k) + '</span><span class="reviewrow__v">' + v + '</span></span>';
  }

  function sevLabel(sev) { return sev === 'high' ? 'High' : sev === 'med' ? 'Moderate' : 'Low'; }

  function authBlock(authId, extra) {
    const a = SR.authority(authId);
    return '<div class="sentto">' +
      '<span class="sentto__ico" style="background:' + a.color + ';font-size:11px;font-weight:900;letter-spacing:.5px">' + esc(a.short) + '</span>' +
      '<div><b>' + esc(a.name) + '</b><em>' + esc(extra || a.scope) + '</em></div>' +
    '</div>';
  }

  /* ---------------- hazard detail ---------------- */
  function openHazard(h) {
    if (!h) return;
    const t = SR.type(h.type);
    const a = SR.authority(h.authority);
    SR.store.patch({ detailId: h.id, detailKind: 'hazard' });
    /* coming from a pin inside a sheet? drop the sheet so the card is visible */
    if (SR.store.get().sheet) SR.ui.closeSheet();
    const near = SR.HAZARDS.filter(function (x) {
      return Math.abs(x.ll[0] - h.ll[0]) < 0.014 && Math.abs(x.ll[1] - h.ll[1]) < 0.014;
    });

    $('#s-detail').innerHTML =
      '<div class="scroll">' +
        '<div class="detail-head" style="padding:10px 0 12px">' +
          '<button class="backbtn" type="button" data-act="close-detail" aria-label="Back">‹</button>' +
          '<div><h1>' + esc(t.label) + '</h1><p>' + esc(h.road) + ' · ' + esc(h.area) + '</p></div>' +
        '</div>' +
        photo(h.type, 'Riders reported this ' + esc(h.age) + ' ago') +
        '<div class="minipin" id="detail-map"></div>' +
        '<div class="review">' +
          row('Risk level', '<span class="pill ' + (h.sev === 'high' ? 'pill--red' : 'pill--amber') + '">' + sevLabel(h.sev) + '</span>') +
          row('Confirmed by', '<b>' + h.confirms + '</b> riders') +
          row('Handled by', '<span style="color:' + a.color + ';font-weight:800">' + esc(a.name) + '</span>') +
          row('Coordinates', h.ll[0].toFixed(4) + ', ' + h.ll[1].toFixed(4)) +
        '</div>' +
        '<div class="card"><h2 class="card__title">What riders report</h2><p>' + esc(h.note) + '</p></div>' +
        '<div class="btnrow">' +
          '<button class="btn btn--outline" type="button" data-act="confirm-hazard" data-id="' + h.id + '">' +
            SR.ICONS.check + 'Still there</button>' +
          '<button class="btn btn--red" type="button" data-act="report-this" data-hazard="' + h.id + '">' +
            SR.ICONS.camera + 'Add mine</button>' +
        '</div>' +
      '</div>';

    SR.ui.openOverlay('detail');
    SR.MapView.miniInto($('#detail-map'), { pins: near, labels: false, smallPins: true, pad: 0.22 });
  }

  /* ---------------- report detail ---------------- */
  function openReport(id) {
    const r = SR.store.findReport(id);
    if (!r) return;
    const t = SR.type(r.type);
    const a = SR.authority(r.auth);
    SR.store.patch({ detailId: r.id, detailKind: 'report' });

    $('#s-detail').innerHTML =
      '<div class="scroll">' +
        '<div class="detail-head" style="padding:10px 0 12px">' +
          '<button class="backbtn" type="button" data-act="close-detail" aria-label="Back">‹</button>' +
          '<div><h1>' + esc(r.ticket) + '</h1><p>' + esc(t.label) + ' · ' + esc(r.road) + '</p></div>' +
        '</div>' +
        photo(r.type, 'Sent ' + esc(r.submitted)) +
        '<div class="card"><h2 class="card__title">Progress</h2>' + timeline(r.stage) + '</div>' +
        authBlock(r.auth, a.email + ' · ' + a.sla) +
        '<div class="review">' +
          row('Local reference', '<b>' + esc(r.ref || r.area) + '</b>') +
          row('Road owner', '<span style="color:' + a.color + ';font-weight:800">' + esc(a.short) + '</span>') +
          row('Last update', esc(r.updated)) +
          row('Confirmed by', '<b>' + r.confirms + '</b> riders') +
        '</div>' +
        '<div class="minipin" id="detail-map"></div>' +
        '<div class="card"><h2 class="card__title">Your note</h2><p>' + esc(r.note) + '</p></div>' +
        '<div class="btnrow">' +
          '<button class="btn btn--outline" type="button" data-act="confirm-report" data-id="' + r.id + '">' +
            SR.ICONS.check + 'Still there</button>' +
          '<button class="btn btn--dark" type="button" data-act="share-report" data-id="' + r.id + '">Share ticket</button>' +
        '</div>' +
      '</div>';

    SR.ui.openOverlay('detail');
    const near = SR.HAZARDS.filter(function (x) {
      return Math.abs(x.ll[0] - r.ll[0]) < 0.014 && Math.abs(x.ll[1] - r.ll[1]) < 0.014;
    });
    SR.MapView.miniInto($('#detail-map'), { pins: near, labels: false, smallPins: true, pad: 0.22 });
  }

  /* ---------------- profile ---------------- */
  function renderProfile() {
    const s = SR.store.get();
    const st = SR.store.reportStats();
    const confirmed = st.confirms + s.profile.confirmed;
    const rank = confirmed >= 60 ? 'Gold' : confirmed >= 30 ? 'Silver' : 'Bronze';

    $('#profile-stats').innerHTML =
      '<div class="stat"><b>' + st.total + '</b><em>Reports sent</em></div>' +
      '<div class="stat"><b>' + confirmed + '</b><em>Confirmations</em></div>' +
      '<div class="stat stat--wide">' +
        '<span class="stat__ico" aria-hidden="true">🛣️</span>' +
        '<span class="stat__txt"><b>' + s.profile.safeKm.toLocaleString() + ' km</b><em>Ridden on safest routes</em></span>' +
      '</div>';

    $('#profile-badge').innerHTML =
      '<div class="badgebox">' +
        '<div class="medal"><i><b>' + confirmed + '</b><span>CONFIRMS</span></i></div>' +
        '<h3>' + rank + ' Road Guardian</h3>' +
        '<p>' + s.profile.safeKm.toLocaleString() + ' km logged on safe routes since ' + s.profile.since +
        '. Riders confirmed ' + st.confirms + ' of your reports.</p>' +
      '</div>';

    $('#set-rain').checked = !!s.rain;
    $('#set-alerts').checked = !!s.alertsOn;
  }

  /* ---------------- toggles + sheet actions ---------------- */
  function toggleRain(next) {
    const val = (typeof next === 'boolean') ? next : !SR.store.get().rain;
    SR.store.patch({ rain: val });
    renderMap();
    if (SR.store.get().sheet === 'route') renderRouteSheet(true);
    $('#set-rain').checked = val;
    toast(val ? 'Wet-weather routing on' : 'Wet-weather routing off', 1600);
  }

  /* day / rush hour / night — re-scores the routes and can re-draw the safe line */
  function pickTime(id) {
    if (SR.store.get().timeOfDay === id) return;
    SR.store.patch({ timeOfDay: id });
    renderMap();
    if (SR.store.get().sheet === 'route') renderRouteSheet(true);
    const b = SR.store.selectedBundle();
    toast(SR.timeInfo(id).label + ' · ' + b.route.label.toLowerCase() + ' route now ' + b.route.score.toFixed(1) + '/10', 1800);
  }

  function toggleLabels() {
    const val = !SR.store.get().labels;
    SR.store.patch({ labels: val });
    renderMap();
    toast(val ? 'Hazard labels on' : 'Hazard labels off', 1300);
  }

  function detailAct(el) {
    const act = el.getAttribute('data-act');
    if (act === 'close-detail') { SR.ui.closeOverlay(); return; }

    if (act === 'confirm-hazard') {
      const h = SR.hazard(el.getAttribute('data-id'));
      if (!h) return;
      h.confirms++;
      toast('Thanks — ' + h.confirms + ' riders now confirm this spot', 1800);
      openHazard(h);
      return;
    }

    if (act === 'report-this') {
      const h = SR.hazard(el.getAttribute('data-hazard'));
      SR.ui.closeOverlay();
      SR.report.open(h ? { type: h.type, road: h.road, area: h.area, ll: h.ll, sev: h.sev } : {});
      return;
    }

    if (act === 'confirm-report') {
      const r = SR.store.findReport(el.getAttribute('data-id'));
      if (!r) return;
      r.confirms++;
      SR.store.emit('change', { reports: true });
      toast('Confirmation sent to ' + SR.authority(r.auth).short, 1700);
      openReport(r.id);
      return;
    }

    if (act === 'share-report') {
      const r = SR.store.findReport(el.getAttribute('data-id'));
      if (r) toast('Ticket link copied — ' + r.ticket, 2000);
    }
  }

  /* ---------------- wiring ---------------- */
  function init() {
    renderChips();
    renderReports();
    renderProfile();
    $('#btn-labels').classList.toggle('is-on', !!SR.store.get().labels);

    /* map screen */
    $('#btn-where').addEventListener('click', openDestSheet);
    $('#btn-recenter').addEventListener('click', function () {
      if (SR.store.get().destinationId) {
        renderMap();
        toast('Re-centred on your route', 1400);
      } else {
        renderMap();
        toast('Showing all of Ipoh, Perak', 1400);
      }
    });
    $('#btn-labels').addEventListener('click', toggleLabels);
    $('#btn-report').addEventListener('click', function () { SR.report.open(); });
    $('#btn-report-2').addEventListener('click', function () { SR.report.open(); });

    SR.ui.on('#legend', '.chip', 'click', function (e, el) {
      const id = el.getAttribute('data-type');
      const hidden = SR.store.get().hidden;
      hidden[id] = !hidden[id];
      renderChips();
      renderMap();
      toast(SR.type(id).label + (hidden[id] ? ' hidden' : ' shown') + ' on the map', 1400);
    });

    SR.ui.on('#reports-list', '.rep', 'click', function (e, el) {
      openReport(el.getAttribute('data-report'));
    });

    /* sheets */
    SR.ui.on('#sheet-dest', '[data-dest]', 'click', function (e, el) {
      pickDestination(el.getAttribute('data-dest'));
    });
    SR.ui.on('#sheet-dest', '[data-act="close-sheet"]', 'click', function () { SR.ui.closeSheet(); });
    SR.ui.on('#sheet-route', '[data-act="close-sheet"]', 'click', function () { SR.ui.closeSheet(); });
    SR.ui.on('#sheet-route', '[data-act="change-dest"]', 'click', function () { openDestSheet(); });
    SR.ui.on('#sheet-route', '[data-act="start-ride"]', 'click', function () {
      SR.ui.closeSheet();
      setTimeout(function () { SR.ride.start(); }, 200);
    });
    SR.ui.on('#sheet-route', '[data-route]', 'click', function (e, el) {
      SR.store.patch({ selectedRoute: el.getAttribute('data-route') });
      renderRouteSheet(true);
      renderMap();
      const b = SR.store.selectedBundle();
      toast(b.route.label + ' route · ' + b.route.time + ' min', 1500);
    });
    SR.ui.on('#sheet-route', '#rain-toggle', 'change', function () { toggleRain(); });
    SR.ui.on('#sheet-route', '[data-time]', 'click', function (e, el) { pickTime(el.getAttribute('data-time')); });

    /* overlays */
    SR.ui.on('#s-detail', '[data-act]', 'click', function (e, el) { detailAct(el); });

    /* profile switches */
    $('#set-rain').addEventListener('change', function (e) { toggleRain(e.target.checked); });
    $('#set-alerts').addEventListener('change', function (e) {
      SR.store.patch({ alertsOn: e.target.checked });
      toast(e.target.checked ? 'Hazard alerts on' : 'Hazard alerts muted', 1400);
    });
    $('#set-dark').addEventListener('change', function (e) {
      toast(e.target.checked ? 'Ride mode: dark theme' : 'Ride mode: light theme', 1500);
    });

    /* keep the tabs in sync with session data */
    SR.store.on('change', function () {
      renderReports();
      renderProfile();
      renderChips();
      $('#btn-labels').classList.toggle('is-on', !!SR.store.get().labels);
    });
  }

  SR.screens = {
    init: init,
    renderMap: renderMap,
    renderChips: renderChips,
    renderReports: renderReports,
    renderProfile: renderProfile,
    renderRouteSheet: renderRouteSheet,
    openDestSheet: openDestSheet,
    openRouteSheet: openRouteSheet,
    openHazard: openHazard,
    openReport: openReport,
    toggleRain: toggleRain,
    pickTime: pickTime,
    /* shared building blocks reused by the report flow + ride mode */
    row: row,
    sevLabel: sevLabel,
    photo: photo,
    authBlock: authBlock,
    timeline: timeline
  };
})();
