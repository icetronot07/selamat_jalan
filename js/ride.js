/* ============================================================
   Selamat Jalan — ride mode (dark, glanceable, high contrast)
   Simulated navigation along the selected route with spoken-style
   hazard alerts pulled from SR.ALERT_TEXT.
   ============================================================ */
window.SR = window.SR || {};

(function () {
  'use strict';

  function $(sel) { return SR.ui.$(sel); }
  function esc(s) { return SR.ui.esc(s); }
  function set(sel, txt) { const el = $(sel); if (el) el.textContent = txt; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  const R = {
    timer: null, alertTimer: null, on: false, ended: false,
    p: 0, tick: 0, muted: false, speed: 44, lastAlert: '',
    dest: null, bundle: null, poly: [], marks: [], hit: {}, alerts: 0,
    /* traffic risk: junctions + lorry zones on the chosen line, and every
       cue (hazard / junction / zone) ordered by distance along the route */
    junc: [], zones: [], cues: [], kinds: { hazard: 0, junction: 0, zone: 0 }
  };

  /* ---------------- polyline maths ---------------- */
  function segLen(a, b) {
    const dy = a[0] - b[0], dx = (a[1] - b[1]) * 0.86;
    return Math.sqrt(dy * dy + dx * dx);
  }

  function polyLen(poly) {
    let t = 0;
    for (let i = 1; i < poly.length; i++) t += segLen(poly[i - 1], poly[i]);
    return t || 1;
  }

  /* the point at fraction f (0..1) along the polyline */
  function at(poly, f) {
    const total = polyLen(poly);
    let want = total * Math.min(1, Math.max(0, f)), run = 0;
    for (let i = 1; i < poly.length; i++) {
      const l = segLen(poly[i - 1], poly[i]);
      if (run + l >= want || i === poly.length - 1) {
        const r = l ? (want - run) / l : 0;
        return [
          poly[i - 1][0] + (poly[i][0] - poly[i - 1][0]) * r,
          poly[i - 1][1] + (poly[i][1] - poly[i - 1][1]) * r
        ];
      }
      run += l;
    }
    return poly[poly.length - 1];
  }

  /* how far along the route (0..1) is this pin? -> when to warn the rider */
  function along(poly, ll) {
    const total = polyLen(poly);
    let best = 0, bd = Infinity, run = 0;
    for (let i = 1; i < poly.length; i++) {
      const a = poly[i - 1], b = poly[i];
      const dx = b[1] - a[1], dy = b[0] - a[0];
      const len2 = dx * dx + dy * dy || 1e-9;
      let t = ((ll[1] - a[1]) * dx + (ll[0] - a[0]) * dy) / len2;
      t = Math.min(1, Math.max(0, t));
      const d = Math.pow(ll[0] - (a[0] + dy * t), 2) + Math.pow(ll[1] - (a[1] + dx * t), 2);
      if (d < bd) { bd = d; best = (run + segLen(a, b) * t) / total; }
      run += segLen(a, b);
    }
    return Math.min(1, best);
  }

  /* ---------------- screen shell ---------------- */
  function shell() {
    return '<div class="ride">' +
      '<div class="ride__top">' +
        '<div class="ride__nav">' +
          '<div class="ride__arrow" id="ride-turn-ico">\u2191</div>' +
          '<div class="ride__instr">' +
            '<b id="ride-turn">Setting off\u2026</b>' +
            '<em id="ride-sub"></em>' +
          '</div>' +
        '</div>' +
        '<div class="ride__stats">' +
          '<span class="rstat"><b id="ride-speed">--</b><em>km/h</em></span>' +
          '<span class="rstat"><b id="ride-left">--</b><em>km left</em></span>' +
          '<span class="rstat"><b id="ride-eta">--:--</b><em>arrive</em></span>' +
        '</div>' +
      '</div>' +
      '<div class="ride__map" id="ride-map">' +
        '<div class="ride__legend" style="z-index:9"><i></i><span id="ride-legend"></span></div>' +
        '<div class="alert" id="ride-alert">' +
          '<span class="alert__ico" id="alert-ico"></span>' +
          '<span style="flex:1 1 auto;min-width:0">' +
            '<b id="alert-title"></b>' +
            '<em id="alert-body"></em>' +
          '</span>' +
        '</div>' +
      '</div>' +
      '<div class="ride__bottom">' +
        '<button class="ride__mini" type="button" id="ride-mute" data-rideact="mute" aria-label="Hazard alerts">' +
          SR.ICONS.alert + '<span>Alerts</span>' +
        '</button>' +
        '<button class="btn ride__end" type="button" data-rideact="end">End ride</button>' +
      '</div>' +
      '<div id="ride-sum"></div>' +
    '</div>';
  }

  /* ---------------- turns, cues + stats ---------------- */
  function kmLeft() { return (R.bundle.route.dist * (1 - R.p)).toFixed(1); }

  /* every cue the rider should be warned about, ordered along the route */
  function cuesFor(poly, marks, junc, zones) {
    const out = [];
    marks.forEach(function (m) {
      out.push({ key: 'h:' + m.h.id, kind: 'hazard', at: m.at, h: m.h, tone: m.h.sev });
    });
    junc.forEach(function (j) {
      out.push({
        key: 'j:' + j.id, kind: 'junction', at: along(poly, j.ll), j: j,
        tone: j.kind === 'blackspot' ? 'high' : 'med'
      });
    });
    zones.forEach(function (z) {
      const a = along(poly, z.ll[0]), b = along(poly, z.ll[z.ll.length - 1]);
      out.push({ key: 'z:' + z.id, kind: 'zone', at: Math.min(a, b), z: z, tone: 'med' });
    });
    return out.sort(function (x, y) { return x.at - y.at; });
  }

  function nextCue() {
    for (let i = 0; i < R.cues.length; i++) if (!R.hit[R.cues[i].key]) return R.cues[i];
    return null;
  }

  function cueLabel(c) {
    if (c.kind === 'junction') return 'a busy junction';
    if (c.kind === 'zone') return 'a lorry zone';
    return SR.type(c.h.type).label.toLowerCase();
  }

  /* "2 hazards \u00b7 2 junctions \u00b7 1 lorry zone on this route" */
  function cueSummary() {
    const parts = [SR.plural(R.marks.length, 'hazard', 'hazards')];
    if (R.junc.length) parts.push(SR.plural(R.junc.length, 'junction', 'junctions'));
    if (R.zones.length) parts.push(SR.plural(R.zones.length, 'lorry zone', 'lorry zones'));
    return parts.join(' \u00b7 ') + ' on this route';
  }

  function leg() {
    const d = R.dest, b = R.bundle, via = d.via || b.route.note;
    const ahead = nextCue();
    const watch = ahead ? cueLabel(ahead) + ' in ' + meters(ahead) : 'the next junction';

    if (R.p >= 0.985) {
      return { ico: '\u2691', text: 'Arriving at ' + d.to, sub: 'Destination on your left \u00b7 ' + kmLeft() + ' km' };
    }
    if (R.p < 0.09) {
      return { ico: '\u2191', text: 'Head out of ' + d.from, sub: 'via ' + d.via + ' \u00b7 ' + kmLeft() + ' km to go' };
    }
    if (R.p < 0.45) {
      return { ico: '\u21B1', text: 'Keep left onto ' + via, sub: 'Watch for ' + watch + ' \u00b7 ' + kmLeft() + ' km left' };
    }
    if (R.p < 0.75) {
      return { ico: '\u2197', text: 'Continue on ' + via, sub: 'Watch for ' + watch + ' \u00b7 ' + b.route.label + ' route' };
    }
    return { ico: '\u2196', text: 'Turn right towards ' + d.to, sub: kmLeft() + ' km left \u00b7 arriving soon' };
  }

  function meters(m) { return Math.max(50, Math.round(R.bundle.route.dist * 1000 * (m.at - R.p) / 25) * 25) + ' m'; }

  /* ---------------- hazard / junction / zone alerts ---------------- */
  /* Build the rider-facing copy for any cue. The traffic copy lives in
     SR.ALERT_TEXT.junction / .zone, so all alerts stay hand-authored. */
  function alertCopy(cue, m) {
    const dstr = 'about ' + m + ' m';
    if (cue.kind === 'junction') {
      const c = SR.ALERT_TEXT.junction;
      return {
        ico: SR.ICONS.junction,
        title: c.title.replace('{d}', dstr),
        body: c.body.replace('{nm}', cue.j.name + ' \u00b7 ' + cue.j.crashes + ' rider crashes'),
        tone: cue.tone
      };
    }
    if (cue.kind === 'zone') {
      const c = SR.ALERT_TEXT.zone;
      return {
        ico: SR.ICONS.lorry,
        title: c.title.replace('{d}', dstr),
        body: c.body.replace('{nm}', cue.z.name + ' \u00b7 ' + cue.z.lorries + ' lorries an hour'),
        tone: cue.tone
      };
    }
    const h = cue.h, t = SR.type(h.type);
    const copy = SR.ALERT_TEXT[h.type] || { title: 'Hazard ahead in {d}', body: 'Take care \u2014 hazard reported on this road' };
    const sev = h.sev === 'high' ? 'high' : (h.sev === 'med' ? 'moderate' : 'low');
    return {
      ico: t.icon,
      title: copy.title.replace('{d}', dstr),
      body: copy.body.replace('{sev}', sev).replace('{d}', dstr),
      tone: h.sev
    };
  }

  function showAlert(cue, m) {
    const a = alertCopy(cue, m);
    const el = $('#ride-alert');
    if (!el) return;
    $('#alert-ico').innerHTML = a.ico;
    set('#alert-title', a.title);
    set('#alert-body', a.body);
    el.className = 'alert' + (a.tone === 'high' ? '' : (a.tone === 'med' ? ' alert--warn' : ' alert--info'));
    void el.offsetWidth;                 /* force reflow so the slide-in plays */
    el.classList.add('is-on');
    R.alerts++;
    R.kinds[cue.kind] = (R.kinds[cue.kind] || 0) + 1;
    R.lastAlert = cue.key;
    clearTimeout(R.alertTimer);
    R.alertTimer = setTimeout(function () { el.classList.remove('is-on'); }, 3600);
  }

  function checkAlerts() {
    if (R.muted) return;
    for (let i = 0; i < R.cues.length; i++) {
      const c = R.cues[i];
      if (R.hit[c.key] || R.lastAlert === c.key) continue;
      /* warn a little before the cue, and a moment after passing it */
      if (R.p >= c.at - 0.14 && R.p <= c.at + 0.02) {
        R.hit[c.key] = true;
        showAlert(c, Math.max(50, Math.round(R.bundle.route.dist * 1000 * (c.at - R.p) / 25) * 25));
        return;
      }
    }
  }

  /* ---------------- painting ---------------- */
  function paint() {
    const b = R.bundle, rider = at(R.poly, R.p);
    const mins = Math.max(0, Math.round(b.route.time * (1 - R.p)));
    const eta = new Date(Date.now() + mins * 60000);
    const ins = leg();

    set('#ride-speed', String(R.speed));
    set('#ride-left', (b.route.dist * (1 - R.p)).toFixed(1));
    set('#ride-eta', pad(eta.getHours()) + ':' + pad(eta.getMinutes()));
    set('#ride-turn', ins.text);
    set('#ride-sub', ins.sub);
    set('#ride-turn-ico', ins.ico);
    set('#ride-legend', cueSummary());

    SR.MapView.miniInto($('#ride-map'), {
      dark: true, labels: false, smallPins: true, pad: 0.16, tappable: false,
      route: [{ poly: R.poly, tone: b.key === 'fastest' ? 'fast' : 'safe', selected: true }],
      pins: R.marks.map(function (m) { return m.h; }),
      junctions: R.junc,
      zones: R.zones,
      rider: rider,
      ends: { from: R.poly[0], to: R.poly[R.poly.length - 1] }
    });
  }

  /* ---------------- the ride loop ---------------- */
  function step() {
    if (!R.on) return;
    R.tick++;
    R.p = Math.min(1, R.p + 0.03 + (R.tick % 4) * 0.004);
    R.speed = 40 + Math.round(15 * Math.abs(Math.sin(R.tick / 3.1)));
    R.muted = !SR.store.get().alertsOn;
    checkAlerts();
    paint();
    if (R.p >= 1) endRide();
  }

  /* ---------------- start / stop ---------------- */
  function start() {
    stop();

    let d = SR.store.currentDestination();
    let b = SR.store.selectedBundle();
    if (!d || !b) {
      SR.store.patch({ destinationId: SR.DESTINATIONS[0].id, selectedRoute: 'safest' });
      d = SR.store.currentDestination();
      b = SR.store.selectedBundle();
    }

    R.dest = d;
    R.bundle = b;
    R.poly = (b.route.poly || []).slice();
    R.marks = SR.store.resolveHazardIds(b.route.hazards).map(function (h) {
      return { h: h, at: along(R.poly, h.ll) };
    }).sort(function (x, y) { return x.at - y.at; });
    R.junc = SR.store.resolveJunctionIds(b.route.junctions);
    R.zones = SR.store.resolveZoneIds(b.route.zones);
    R.cues = cuesFor(R.poly, R.marks, R.junc, R.zones);
    R.p = 0; R.tick = 0; R.hit = {}; R.alerts = 0; R.lastAlert = '';
    R.kinds = { hazard: 0, junction: 0, zone: 0 };
    R.speed = 44; R.ended = false; R.muted = !SR.store.get().alertsOn;

    $('#s-ride').innerHTML = shell();
    $('#ride-sum').innerHTML = '';
    SR.ui.openOverlay('ride');
    if ($('#ride-mute')) $('#ride-mute').classList.toggle('is-off', R.muted);
    R.on = true;

    paint();
    R.timer = setInterval(step, 1400);
    SR.ui.toast('Ride mode \u00b7 ' + b.route.label + ' route \u00b7 ' + cueSummary(), 2200);
  }

  function stop() {
    clearInterval(R.timer);
    clearTimeout(R.alertTimer);
    R.timer = null;
    R.alertTimer = null;
    R.on = false;
    const sum = $('#ride-sum');
    if (sum) sum.innerHTML = '';
    if (SR.store.get().overlay === 'ride') SR.ui.closeOverlay();
  }

  /* ---------------- ride summary ---------------- */
  /* what the rider was actually warned about on the way */
  function alertTally() {
    const k = R.kinds || {}, bits = [];
    if (k.hazard) bits.push(SR.plural(k.hazard, 'hazard alert', 'hazard alerts'));
    if (k.junction) bits.push(SR.plural(k.junction, 'junction alert', 'junction alerts'));
    if (k.zone) bits.push(SR.plural(k.zone, 'lorry-zone alert', 'lorry-zone alerts'));
    if (!bits.length) return '';
    return '<p>' + esc(bits.join(' \u00b7 ')) + '</p>';
  }

  function endRide() {
    if (R.ended) return;
    R.ended = true;
    clearInterval(R.timer);
    R.timer = null;
    R.on = false;

    const b = R.bundle, mins = Math.max(1, Math.round(b.route.time * R.p));
    const km = (b.route.dist * R.p).toFixed(1);
    const el = $('#ride-sum');
    if (!el) return;

    el.innerHTML = '<div class="ride__sheet">' +
      '<div class="ride__sum">' +
        '<h2>Ride complete</h2>' +
        '<p>' + esc(R.dest.short) + ' \u00b7 ' + esc(b.route.label) + ' route, ' + km + ' km of safe riding in the ' +
          esc(SR.store.timeOfDay().label.toLowerCase()) + '.</p>' +
        alertTally() +
        '<div class="rig">' +
          '<span class="rstat"><b>' + km + '</b><em>km ridden</em></span>' +
          '<span class="rstat"><b>' + mins + '</b><em>minutes</em></span>' +
          '<span class="rstat"><b>' + R.alerts + '</b><em>alerts</em></span>' +
        '</div>' +
        '<button class="btn btn--green btn--block" type="button" data-ride="report">Report a hazard on this road</button>' +
        '<button class="btn btn--ghost btn--block" type="button" data-ride="done" style="margin-top:10px">Done</button>' +
      '</div>' +
    '</div>';
  }

  /* ---------------- wiring ---------------- */
  function wire() {
    SR.ui.on('#s-ride', '[data-rideact]', 'click', function (e, el) {
      const act = el.getAttribute('data-rideact');
      if (act === 'mute') {
        const next = !SR.store.get().alertsOn;
        SR.store.patch({ alertsOn: next });
        R.muted = !next;
        el.classList.toggle('is-off', R.muted);
        SR.ui.toast(next ? 'Hazard alerts on' : 'Hazard alerts muted', 1400);
        return;
      }
      if (act === 'end') endRide();
    });

    SR.ui.on('#s-ride', '[data-ride]', 'click', function (e, el) {
      const act = el.getAttribute('data-ride');
      if (act === 'report') {
        const spot = R.poly.length ? at(R.poly, Math.max(0.02, R.p)) : null;
        const road = R.bundle ? R.bundle.dest.via : '';
        const area = R.bundle ? R.bundle.dest.to : 'Ipoh';
        stop();
        SR.report.open({ road: road, area: area, ll: spot, sev: 'high' });
        return;
      }
      if (act === 'done') stop();
    });
  }

  let bound = false;

  function init() {
    if (bound) return;
    bound = true;
    wire();
  }

  SR.ride = { init: init, start: start, stop: stop, state: R };

})();
