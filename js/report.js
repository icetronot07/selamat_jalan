/* ============================================================
   Selamat Jalan — report flow
   3 steps (type → details → confirm) then a simulated send to
   JKR Perak / MBI Ipoh. The ticket is added to My reports.
   ============================================================ */
window.SR = window.SR || {};

(function () {
  'use strict';

  function $(sel) { return SR.ui.$(sel); }
  function esc(s) { return SR.ui.esc(s); }
  function toast(m, ms) { SR.ui.toast(m, ms); }

  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const SEVS = [
    { id: 'low', label: 'Low', note: 'Annoying', col: '#0FA958' },
    { id: 'med', label: 'Moderate', note: 'Risky', col: '#B57A00' },
    { id: 'high', label: 'High', note: 'Dangerous', col: '#E5342A' }
  ];

  /* ---------------- small helpers ---------------- */
  function today() {
    const d = new Date();
    return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
  }

  function clean(name) { return String(name || '').replace(/\s*\(.*\)\s*/, '').trim().toLowerCase(); }

  function roadInfo(name) {
    const c = clean(name);
    if (!c) return null;
    for (let i = 0; i < SR.ROADS.length; i++) {
      const r = SR.ROADS[i], rn = clean(r.name);
      if (rn === c || c.indexOf(rn) === 0 || rn.indexOf(c) === 0) return r;
    }
    return null;
  }

  function codeOf(name) {
    const m = /\(([^)]+)\)/.exec(String(name || ''));
    return m ? m[1] : null;
  }

  /* which part of town is this pin in? (nearest fake-map label) */
  function guessArea(ll) {
    let best = 'Ipoh', bd = Infinity;
    SR.FAKE_AREAS.forEach(function (a) {
      const d = Math.abs(a.ll[0] - ll[0]) + Math.abs(a.ll[1] - ll[1]);
      if (d < bd) { bd = d; best = a.n; }
    });
    return best;
  }

  /* the rider's pin: a little way along the route they are riding */
  function riderPin() {
    const b = SR.store.selectedBundle();
    if (b && b.route.poly && b.route.poly.length > 3) {
      const p = b.route.poly[3];
      return [p[0] + 0.0006, p[1] - 0.0005];
    }
    const d = SR.store.currentDestination();
    return d ? [d.fromLL[0], d.fromLL[1]] : [4.5975, 101.0901];
  }

  /* ---------------- draft ---------------- */
  const D = {
    stage: 'form',          // form | sending | sent
    step: 0,                // 0 type · 1 details · 2 confirm
    type: '', road: '', landmark: '', note: '', sev: 'high',
    photo: false, ll: null, area: 'Ipoh', ticket: null, auth: 'JKR',
    rep: null, timers: []
  };

  function reset() {
    D.stage = 'form'; D.step = 0; D.type = ''; D.road = ''; D.landmark = '';
    D.note = ''; D.sev = 'high'; D.photo = false; D.ll = null; D.area = 'Ipoh';
    D.ticket = null; D.auth = 'JKR'; D.rep = null;
  }

  function clearTimers() {
    D.timers.forEach(function (t) { clearTimeout(t); });
    D.timers = [];
  }

  function authOf() { return SR.roadAuthority(D.road); }

  /* ---------------- step markup ---------------- */
  function flowbar(title) {
    return '<div class="flowbar">' +
      '<button class="iconbtn iconbtn--soft" type="button" data-act="flow-close" aria-label="Close">✕</button>' +
      '<h1>' + esc(title) + '</h1>' +
      '<span class="flowbar__step">Step ' + (D.step + 1) + ' of 3</span>' +
    '</div>';
  }

  function stepsBar() {
    return '<div class="steps">' + [0, 1, 2].map(function (i) {
      return '<i class="' + (i <= D.step ? 'is-on' : '') + '"></i>';
    }).join('') + '</div>';
  }

  function stepType() {
    const tiles = SR.HAZARD_TYPES.slice(0, 6).map(function (t) {
      return '<button class="type' + (D.type === t.id ? ' is-sel' : '') + '" type="button" data-type="' + t.id +
        '" style="color:' + t.color + '">' +
        '<span class="type__ico" style="background:' + t.color + '">' + t.icon + '</span>' +
        '<b>' + esc(t.label) + '</b></button>';
    }).join('');
    const last = SR.HAZARD_TYPES[6];
    return '<p class="step-lead">What\u2019s wrong?</p>' +
      '<p class="step-sub">Pick the closest match — details come next.</p>' +
      '<div class="typegrid">' + tiles +
        '<button class="type type--wide' + (D.type === last.id ? ' is-sel' : '') + '" type="button" data-type="' + last.id +
          '" style="color:' + last.color + '">' +
          '<span class="type__ico" style="background:' + last.color + '">' + last.icon + '</span>' +
          '<span style="flex:1 1 auto;display:flex;flex-direction:column;gap:4px;align-items:flex-start">' +
            '<b style="text-align:left">' + esc(last.label) + '</b>' +
            '<span class="field__hint" style="margin-top:0">' + esc(last.tip) + '</span>' +
          '</span>' +
          '<span class="dest__go" aria-hidden="true">›</span>' +
        '</button>' +
      '</div>' +
      '<p class="proto-tag">Reports go to JKR Perak or MBI Ipoh — whoever owns the road.</p>';
  }

  function segOpts() {
    return SEVS.map(function (s) {
      return '<button class="seg__opt' + (D.sev === s.id ? ' is-sel' : '') + '" type="button" data-sev="' + s.id +
        '" style="color:' + s.col + '">' + s.label + '<em>' + s.note + '</em></button>';
    }).join('');
  }

  function shotHTML() {
    if (!D.photo) {
      return '<div class="field"><em>Photo <span style="font-weight:700;text-transform:none;color:#9AA6B4">(optional)</span></em>' +
        '<button class="shot" type="button" data-act="photo">' +
          '<span class="shot__cam">' + SR.ICONS.camera + '</span>' +
          '<span>Tap to attach a photo</span>' +
        '</button></div>';
    }
    const t = SR.type(D.type || 'pothole');
    const cls = t.id === 'flooding' ? 'flood' : t.id;
    return '<div class="field"><em>Photo attached</em>' +
      '<button class="shot shot--done" type="button" data-act="photo" aria-label="Remove photo">' +
        '<span class="photo photo--' + cls + '" style="display:block;height:100%;margin:0;border-radius:18px"></span>' +
        '<span class="photo__badge">Demo photo · tap to remove</span>' +
      '</button></div>';
  }

  function locHTML() {
    const ll = D.ll || riderPin();
    return '<div class="locbox">' +
      '<span class="locbox__pin">' + SR.ICONS.pin + '</span>' +
      '<span style="flex:1 1 auto;min-width:0">' +
        '<b>' + esc(D.road || 'Dropped pin') + '</b>' +
        '<em>' + esc(D.area) + ' · ' + ll[0].toFixed(4) + ', ' + ll[1].toFixed(4) + ' · GPS \u00b18 m</em>' +
        '<button class="locbox__change" type="button" data-act="pin">Adjust pin on map</button>' +
      '</span>' +
    '</div>';
  }

  function stepDetails() {
    const a = SR.authority(authOf());
    const t = D.type ? SR.type(D.type) : null;
    return '<p class="step-lead">Hazard details</p>' +
      '<p class="step-sub">' + (t ? esc(t.label) + ' \u00b7 ' : '') + 'the more the crew knows, the faster the fix.</p>' +
      '<div class="field"><em>Road or street</em>' +
        '<input id="f-road" type="text" value="' + esc(D.road) + '" placeholder="e.g. Jalan Lahat (FT240)" autocomplete="off" />' +
        '<span class="field__hint" id="f-owner">Owner detected: <b style="color:' + a.color + '">' + esc(a.name) + '</b> \u2014 routed automatically</span>' +
      '</div>' +
      '<div class="field"><em>Nearest landmark <span style="font-weight:700;text-transform:none;color:#9AA6B4">(optional)</span></em>' +
        '<input id="f-landmark" type="text" value="' + esc(D.landmark) + '" placeholder="e.g. opposite SMK Gunung Rapat" autocomplete="off" />' +
      '</div>' +
      '<div class="field"><em>How bad is it?</em><div class="seg">' + segOpts() + '</div></div>' +
      '<div class="field"><em>Note for the crew</em>' +
        '<textarea id="f-note" placeholder="Describe the hazard: size, position in the lane, how riders are hit.">' + esc(D.note) + '</textarea>' +
      '</div>' +
      shotHTML() + locHTML();
  }

  function stepConfirm() {
    const t = SR.type(D.type || 'pothole');
    const a = SR.authority(authOf());
    const pillCls = D.sev === 'high' ? 'pill--red' : (D.sev === 'med' ? 'pill--amber' : 'pill--green');
    return '<p class="step-lead">Ready to send</p>' +
      '<p class="step-sub">Check the details \u2014 this goes straight to the road owner.</p>' +
      '<div class="minipin" id="flow-map"></div>' +
      '<div class="review">' +
        SR.screens.row('Hazard', '<b style="color:' + t.color + '">' + esc(t.label) + '</b>') +
        SR.screens.row('Road', esc(D.road || 'Rider pin')) +
        SR.screens.row('Area', esc(D.area) + (D.landmark ? ' \u00b7 ' + esc(D.landmark) : '')) +
        SR.screens.row('Risk', '<span class="pill ' + pillCls + '">' + SR.screens.sevLabel(D.sev) + '</span>') +
        SR.screens.row('Photo', D.photo ? 'Attached (demo)' : 'None') +
        SR.screens.row('Routed to', '<span class="authtag">' + esc(a.name) + '</span>') +
      '</div>' +
      '<p class="step-sub" style="margin:14px 0 0">' + esc(a.email) + '<br />' + esc(a.sla) + '</p>' +
      '<p class="proto-tag">JKR / MBI integration is simulated in this prototype.</p>';
  }

  function footHTML() {
    if (D.step === 0) {
      return '<div class="flowfoot">' +
        '<button class="btn btn--green btn--block" type="button" data-act="next"' +
          (D.type ? '' : ' disabled') + '>Continue</button></div>';
    }
    const back = '<button class="btn btn--ghost" type="button" data-act="back">Back</button>';
    if (D.step === 1) {
      return '<div class="flowfoot">' + back +
        '<button class="btn btn--green btn--block" type="button" data-act="next">Review report</button></div>';
    }
    return '<div class="flowfoot">' + back +
      '<button class="btn btn--green btn--block" type="button" data-act="send" id="send-btn">Send to ' +
        esc(SR.authority(authOf()).short) + '</button></div>';
  }

  function formHTML() {
    const titles = ['Report a hazard', 'Hazard details', 'Confirm &amp; send'];
    const body = D.step === 0 ? stepType() : (D.step === 1 ? stepDetails() : stepConfirm());
    return flowbar(titles[D.step]) + stepsBar() +
      '<div class="flowbody" style="top:86px">' + body + '</div>' + footHTML();
  }

  /* ---------------- sending + success ---------------- */
  function sendingHTML() {
    const a = SR.authority(D.auth);
    return flowbar('Sending\u2026') + stepsBar() +
      '<div class="loading">' +
        '<span class="spinner"></span>' +
        '<b>Sending to ' + esc(a.name) + '</b>' +
        '<p>Packing the photo, GPS fix and rider details. Keep this open for a moment.</p>' +
        '<span class="loadsteps">' +
          '<span class="is-on"><i></i>Report packed</span>' +
          '<span><i></i>Posting to the ' + esc(a.short) + ' aduan system</span>' +
          '<span><i></i>Getting your ticket number</span>' +
        '</span>' +
      '</div>';
  }

  function sentHTML() {
    const r = D.rep, a = SR.authority(r.auth), t = SR.type(r.type);
    return '<div class="success">' +
      '<span class="tick">' + SR.ICONS.check + '</span>' +
      '<h2>Report sent</h2>' +
      '<p>' + esc(a.name) + ' has your report. Field-crew updates show up on the Reports tab.</p>' +
      '<div class="ticketbox">' +
        '<em>Your ticket</em><b>' + esc(r.ticket) + '</b>' +
        '<span class="pill pill--amber">Awaiting acknowledgement</span>' +
        '<p class="authtag" style="margin-top:11px">' + esc(a.email) + '</p>' +
      '</div>' +
      SR.screens.authBlock(r.auth, a.sla) +
      '<div class="review" style="text-align:left">' +
        SR.screens.row('Hazard', esc(t.label) + ' \u00b7 ' + esc(SR.screens.sevLabel(D.sev))) +
        SR.screens.row('Location', esc(r.road) + (r.area ? ' \u00b7 ' + esc(r.area) : '')) +
        SR.screens.row('Reference', esc(r.ref)) +
        SR.screens.row('Submitted', esc(r.submitted)) +
      '</div>' +
      '<button class="btn btn--green btn--block" type="button" data-act="view-reports" style="margin-top:16px">View my reports</button>' +
      '<button class="btn btn--ghost btn--block" type="button" data-act="flow-close" style="margin-top:10px">Back to map</button>' +
      '<p class="proto-tag" style="margin-top:14px">Prototype \u2014 no real report was filed.</p>' +
    '</div>';
  }

  /* ---------------- render ---------------- */
  function render() {
    const el = $('#s-report');
    if (!el) return;
    el.innerHTML = D.stage === 'form' ? formHTML() : (D.stage === 'sending' ? sendingHTML() : sentHTML());
    if (D.stage === 'form') {
      syncOwner();
      if (D.step === 2) paintMini();
    }
  }

  function paintMini() {
    const el = $('#flow-map');
    if (!el) return;
    SR.MapView.miniInto(el, { pin: D.ll || riderPin(), labels: false, smallPins: true, pad: 0.24 });
  }

  /* keep the "who owns this road" hint + send button in sync while typing */
  function syncOwner() {
    const a = SR.authority(authOf());
    const hint = $('#f-owner');
    if (hint) {
      hint.innerHTML = 'Owner detected: <b style="color:' + a.color + '">' + esc(a.name) +
        '</b> \u2014 routed automatically';
    }
    const send = $('#send-btn');
    if (send) send.textContent = 'Send to ' + a.short;
  }

  /* ---------------- send simulation ---------------- */
  function markLoadSteps(n) {
    const list = SR.ui.$$('#s-report .loadsteps span');
    list.forEach(function (s, i) { s.classList.toggle('is-on', i <= n); });
  }

  function buildReport() {
    const auth = authOf();
    const info = roadInfo(D.road);
    const code = codeOf(D.road);
    const t = SR.type(D.type || 'pothole');
    return {
      id: 'mine-' + Date.now(),
      mine: true,
      auth: auth,
      type: t.id,
      stage: 0,
      ticket: SR.nextTicket(auth),
      road: D.road || 'Unnamed stretch',
      area: D.area || (info ? info.area : 'Ipoh'),
      ll: [D.ll[0], D.ll[1]],
      submitted: today(),
      updated: today(),
      confirms: 1,
      note: D.note || ('Rider reported a ' + t.label.toLowerCase() + ' at this spot.'),
      ref: code ? code + ' \u00b7 rider pin' : (D.landmark || 'Rider pin \u00b7 GPS \u00b18 m')
    };
  }

  function finish() {
    D.rep = buildReport();
    D.ticket = D.rep.ticket;
    SR.store.addReport(D.rep);
    D.stage = 'sent';
    render();
  }

  function send() {
    D.auth = authOf();
    D.stage = 'sending';
    render();
    D.timers.push(setTimeout(function () { markLoadSteps(1); }, 620));
    D.timers.push(setTimeout(function () { markLoadSteps(2); }, 1180));
    D.timers.push(setTimeout(finish, 1800));
  }

  /* ---------------- wiring ---------------- */
  function wire() {
    const root = '#s-report';

    SR.ui.on(root, '[data-type]', 'click', function (e, el) {
      D.type = el.getAttribute('data-type');
      SR.ui.$$('.type', $('#s-report')).forEach(function (b) {
        b.classList.toggle('is-sel', b.getAttribute('data-type') === D.type);
      });
      const next = SR.ui.$('#s-report [data-act="next"]');
      if (next) next.disabled = !D.type;
    });

    SR.ui.on(root, '[data-sev]', 'click', function (e, el) {
      D.sev = el.getAttribute('data-sev');
      SR.ui.$$('.seg__opt', $('#s-report')).forEach(function (b) {
        b.classList.toggle('is-sel', b === el);
      });
    });

    SR.ui.on(root, '#f-road', 'input', function (e, el) { D.road = el.value; syncOwner(); });
    SR.ui.on(root, '#f-landmark', 'input', function (e, el) { D.landmark = el.value; });
    SR.ui.on(root, '#f-note', 'input', function (e, el) { D.note = el.value; });

    SR.ui.on(root, '[data-act]', 'click', function (e, el) {
      const act = el.getAttribute('data-act');

      if (act === 'flow-close') { close(); return; }
      if (act === 'back') { if (D.step > 0) D.step--; render(); return; }
      if (act === 'send') { send(); return; }
      if (act === 'view-reports') { close(); SR.ui.showTab('reports'); return; }

      if (act === 'next') {
        if (D.step === 0 && !D.type) { toast('Pick the closest hazard type', 1500); return; }
        if (D.step === 1 && !D.road) {
          const f = $('#f-road');
          if (f) f.focus();
          toast('Add the road so we can route it', 1800);
          return;
        }
        if (D.step < 2) { D.step++; render(); }
        return;
      }

      if (act === 'photo') {
        D.photo = !D.photo;
        render();
        toast(D.photo ? 'Demo photo attached' : 'Photo removed', 1200);
        return;
      }

      if (act === 'pin') {
        const p = D.ll || riderPin();
        D.ll = [p[0] + 0.0007, p[1] + 0.0009];
        D.area = guessArea(D.ll);
        render();
        toast('Pin moved \u2014 ' + D.area, 1400);
      }
    });
  }

  /* ---------------- public API ---------------- */
  function close() {
    clearTimers();
    SR.ui.closeOverlay();
    reset();
  }

  function open(prefill) {
    clearTimers();
    reset();
    const o = prefill || {};
    if (o.type) D.type = o.type;
    if (o.road) D.road = o.road;
    if (o.landmark) D.landmark = o.landmark;
    if (o.sev) D.sev = o.sev;
    D.ll = o.ll ? [o.ll[0], o.ll[1]] : riderPin();
    D.area = o.area || guessArea(D.ll);
    D.step = o.type ? 1 : 0;
    render();
    SR.ui.openOverlay('report');
  }

  let bound = false;

  function init() {
    if (bound) return;
    bound = true;
    wire();
  }

  SR.report = { init: init, open: open, close: close, send: send, reset: reset };

})();
