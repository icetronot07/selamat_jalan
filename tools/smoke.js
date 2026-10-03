/* Selamat Jalan — headless flow smoke test (no browser, no build step).
   Run:  node tools/smoke.js
   Loads the real js/data.js | store.js | screens.js | report.js | ride.js in a
   VM, stubs only the DOM-facing SR.ui / SR.MapView bits, then drives the report
   and ride flows end to end, plus the traffic-risk layer (dangerous junctions,
   heavy-vehicle zones, the day/rush/night rescoring and both traffic alerts).
   Exit code 0 = every check passed.                                           */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
}

/* ---------- fake DOM ---------- */
const els = {};
function makeEl(sel) {
  return {
    sel, _html: '', textContent: '', className: '', value: '', disabled: false, hidden: false,
    offsetWidth: 1, _attrs: {},
    classList: {
      _s: {},
      toggle(c, on) { this._s[c] = (on === undefined) ? !this._s[c] : !!on; },
      add(c) { this._s[c] = true; }, remove(c) { this._s[c] = false; }, contains(c) { return !!this._s[c]; }
    },
    getAttribute(k) { return this._attrs[k] == null ? null : this._attrs[k]; },
    setAttribute(k, v) { this._attrs[k] = String(v); },
    focus() {}, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; },
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); }
  };
}
function h$(sel) { if (!els[sel]) els[sel] = makeEl(sel); return els[sel]; }
function h$$() { return []; }

const handlers = [], toasts = [];
function hOn(root, sel, evt, fn) { handlers.push({ root, sel, evt, fn }); }
function fire(sel, attrs, root) {
  const el = { getAttribute: k => (k in attrs ? attrs[k] : null), classList: { toggle() {}, add() {}, remove() {} }, focus() {}, setAttribute() {} };
  let n = 0;
  handlers.forEach(h => { if (h.sel === sel && (!root || h.root === root)) { h.fn({ target: el }, el); n++; } });
  return n;
}
const timers = []; let tid = 0;
function hSetTimeout(fn, ms) { tid++; timers.push({ id: tid, fn, ms: ms || 0 }); return tid; }
function hClearTimeout(id) { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); }
function runTimers() { timers.sort((a, b) => a.ms - b.ms); while (timers.length) timers.shift().fn(); }
const intervals = [];
function hSetInterval(fn) { intervals.push(fn); return intervals.length; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
const miniCalls = [];

/* ---------- sandbox ---------- */
const sandbox = { console, esc, Date, Math, JSON, Object, Array, String, Number, Boolean, RegExp, Error, Promise,
  setTimeout: hSetTimeout, clearTimeout: hClearTimeout, setInterval: hSetInterval, clearInterval() {} };
sandbox.window = sandbox;
const ctx = vm.createContext(sandbox);

['data.js', 'store.js', 'screens.js', 'report.js', 'ride.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });
});
const SR = ctx.SR;

SR.ui = {
  $: h$, $$: h$$, esc, on: hOn, frag: function () { return {}; },
  toast(m) { toasts.push(m); },
  openOverlay(n) { SR.store.patch({ overlay: n }); },
  closeOverlay() { SR.store.patch({ overlay: null }); },
  showTab(n) { SR.store.patch({ tab: n }); },
  openSheet() {}, closeSheet() {}, clock() {}, pinHTML() { return '<span class="pin"></span>'; },
  /* mirrors the real ui.js thresholds so the route cards render in the VM */
  scoreColor(s) { return s >= 8 ? '#067A40' : s >= 6.5 ? '#B57A00' : '#E5342A'; }
};
SR.MapView = {
  init() {}, render() {}, redraw() {}, onHazard() {}, projector() {},
  miniInto(el, opts) { miniCalls.push(opts || {}); return { W: 390, H: 400, layer: {} }; }
};

console.log('\n[1] module surface');
ok('SR.report.open is a function', typeof SR.report.open === 'function');
ok('SR.report.init is a function', typeof SR.report.init === 'function');
ok('SR.ride.start is a function', typeof SR.ride.start === 'function');
ok('SR.ride.init is a function', typeof SR.ride.init === 'function');

SR.report.init();
SR.ride.init();
SR.screens.init();
ok('report wiring registered handlers', handlers.some(h => h.sel === '[data-act]'));
ok('screens wiring registered handlers', handlers.some(h => h.root === '#s-detail'));

console.log('\n[2] report flow - hazard prefill (JKR road)');
const before = SR.store.reportStats().total;
SR.report.open({ type: 'pothole', road: 'Jalan Lahat (FT240)', area: 'Menglembu', sev: 'high', ll: [4.5862, 101.0521] });
let html = h$('#s-report').innerHTML;
ok('overlay opened', SR.store.get().overlay === 'report');
ok('lands on details step', /Hazard details/.test(html) && /Step 2 of 3/.test(html));
ok('owner hint names JKR', /JKR Perak/.test(html));
ok('road prefilled', /value="Jalan Lahat \(FT240\)"/.test(html));
ok('severity preselected high', /data-sev="high"[^>]*is-sel/.test(html) || /is-sel[^>]*data-sev="high"/.test(html));

console.log('\n[3] step 1 -> review step');
ok('continue handler fires', fire('[data-act]', { 'data-act': 'next' }) > 0);
html = h$('#s-report').innerHTML;
ok('review step shown', /Ready to send/.test(html) && /Step 3 of 3/.test(html));
ok('send button routed to JKR', /Send to JKR/.test(html));
ok('confirm lists the routing', /Routed to/.test(html) && /JKR Perak/.test(html));
ok('confirm mini-map drawn', miniCalls.length === 1 && Array.isArray(miniCalls[0].pin));

console.log('\n[4] send -> ticket');
ok('send handler fires', fire('[data-act]', { 'data-act': 'send' }) > 0);
ok('sending screen shown', /Sending to JKR Perak/.test(h$('#s-report').innerHTML) && /loadsteps/.test(h$('#s-report').innerHTML));
runTimers();
html = h$('#s-report').innerHTML;
ok('success screen shown', /Report sent/.test(html) && /tick/.test(html));
ok('ticket rendered', /JKR-2026-\d{6}/.test(html), (html.match(/JKR-2026-\d+/) || [''])[0]);
ok('stored in My reports', SR.store.reportStats().total === before + 1);
const newRep = SR.store.get().reports[0];
ok('report is mine + routed JKR', newRep.mine === true && newRep.auth === 'JKR' && newRep.stage === 0);
ok('report keeps the pin', newRep.ll[0] === 4.5862 && newRep.ll[1] === 101.0521);
ok('report ref uses road code', /FT240/.test(newRep.ref), newRep.ref);

console.log('\n[5] report flow - unknown town road (MBI)');
SR.report.open({ type: 'flooding', road: 'Jalan Foo Bar', sev: 'med', ll: [4.6, 101.09] });
html = h$('#s-report').innerHTML;
ok('owner hint names MBI', /Majlis Bandaraya Ipoh/.test(html));
fire('[data-act]', { 'data-act': 'next' });
ok('send button routed to MBI', /Send to MBI/.test(h$('#s-report').innerHTML));
fire('[data-act]', { 'data-act': 'send' });
runTimers();
ok('MBI ticket issued', /MBI-2026-\d{6}/.test(h$('#s-report').innerHTML));
ok('MBI report stored', SR.store.get().reports[0].auth === 'MBI');
SR.report.close();
ok('close resets the overlay', SR.store.get().overlay === null);

console.log('\n[6] report flow - blank start, guard rails');
SR.report.open();
html = h$('#s-report').innerHTML;
ok('starts on type step', /Step 1 of 3/.test(html) && /typegrid/.test(html));
ok('continue starts disabled', /data-act="next" disabled/.test(html));
fire('[data-act]', { 'data-act': 'next' });
ok('cannot skip without a type', /typegrid/.test(h$('#s-report').innerHTML));
fire('[data-type]', { 'data-type': 'fog' });
fire('[data-act]', { 'data-act': 'next' });
ok('moves to details after picking a type', /Hazard details/.test(h$('#s-report').innerHTML));
fire('[data-act]', { 'data-act': 'next' });
ok('blocks send without a road', /Hazard details/.test(h$('#s-report').innerHTML));
fire('[data-act]', { 'data-act': 'photo' });
ok('photo toggle works', /Demo photo/.test(h$('#s-report').innerHTML));
fire('[data-act]', { 'data-act': 'pin' });
ok('pin adjust moves + relabels the area', /locbox/.test(h$('#s-report').innerHTML));
SR.report.close();

console.log('\n[7] ride mode');
const reportsAfter = SR.store.reportStats().total;
SR.ride.start();
html = h$('#s-ride').innerHTML;
ok('ride shell rendered', /ride__top/.test(html) && /End ride/.test(html));
ok('ride overlay open', SR.store.get().overlay === 'ride');
ok('auto-picked a destination', !!SR.store.get().destinationId);
ok('rider drawn on the ride map', miniCalls[miniCalls.length - 1].rider.length === 2);
ok('hazards plotted on the route', SR.ride.state.marks.length > 0, 'marks=' + SR.ride.state.marks.length);
ok('dark map used', miniCalls[miniCalls.length - 1].dark === true);
ok('ride map pins are not tappable', miniCalls[miniCalls.length - 1].tappable === false);
ok('interval started', intervals.length === 1);

let alerted = false; const speeds = {}, alertsSeen = [];
for (let i = 0; i < 45; i++) {
  intervals[0]();
  speeds[h$('#ride-speed').textContent] = 1;
  if (h$('#ride-alert').classList.contains('is-on')) {
    alerted = true;
    alertsSeen.push(h$('#alert-title').textContent + ' | ' + h$('#alert-body').textContent);
  }
}
ok('speed readout updates', Object.keys(speeds).length > 2, Object.keys(speeds).join(','));
ok('turn banner has copy', h$('#ride-turn').textContent.length > 8, h$('#ride-turn').textContent);
ok('eta looks like a time', /^\d\d:\d\d$/.test(h$('#ride-eta').textContent), h$('#ride-eta').textContent);
ok('km-left readout is numeric', /^\d+\.\d$/.test(h$('#ride-left').textContent), h$('#ride-left').textContent);
ok('hazard alert fired', alerted || SR.ride.state.muted, 'alerts=' + SR.ride.state.alerts);
ok('alert used ALERT_TEXT copy', h$('#alert-title').textContent.length > 6, JSON.stringify(h$('#alert-title').textContent));
ok('ride tracks the junctions on the line', SR.ride.state.junc.length === 2, 'junctions=' + SR.ride.state.junc.length);
ok('ride tracks the lorry zones on the line', SR.ride.state.zones.length === 1, 'zones=' + SR.ride.state.zones.length);
ok('cue list = hazards + junctions + lorry zones',
  SR.ride.state.cues.length === SR.ride.state.marks.length + SR.ride.state.junc.length + SR.ride.state.zones.length,
  SR.ride.state.cues.length + ' cues');
ok('cues are ordered along the route', SR.ride.state.cues.every((c, i, a) => i === 0 || a[i - 1].at <= c.at));
ok('junction alert fires before a busy junction', alertsSeen.some(s => /Busy junction ahead/.test(s)), alertsSeen.length + ' alerts');
ok('junction alert warns about turning cars', alertsSeen.some(s => /Watch for turning cars/i.test(s)));
ok('lorry-zone alert fires on entering the zone', alertsSeen.some(s => /Lorry zone/.test(s)));
ok('lorry-zone alert warns about blind spots', alertsSeen.some(s => /stay out of blind spots/i.test(s)));
ok('ride legend names the junctions + lorry zones',
  /junctions/.test(h$('#ride-legend').textContent) && /lorry zone/.test(h$('#ride-legend').textContent),
  h$('#ride-legend').textContent);

console.log('\n[8] ride -> report handoff + end ride');
fire('[data-rideact]', { 'data-rideact': 'mute' });
ok('mute toggle patches the store', SR.store.get().alertsOn === false);
fire('[data-rideact]', { 'data-rideact': 'mute' });
for (let i = 0; i < 45; i++) intervals[0]();
ok('ride auto-ends at the destination', /Ride complete/.test(h$('#ride-sum').innerHTML));
ok('ride summary has stats', /km ridden/.test(h$('#ride-sum').innerHTML) && /alerts/.test(h$('#ride-sum').innerHTML));
fire('[data-ride]', { 'data-ride': 'report' });
ok('ride hands off to the report flow', SR.store.get().overlay === 'report');
ok('handoff asks what is wrong first', /Step 1 of 3/.test(h$('#s-report').innerHTML));
fire('[data-type]', { 'data-type': 'pothole' });
fire('[data-act]', { 'data-act': 'next' });
const via = SR.dest(SR.store.get().destinationId).via;
const dest = SR.dest(SR.store.get().destinationId);
const reV = new RegExp('value="' + via.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"');
ok('handoff prefills the road', reV.test(h$('#s-report').innerHTML), via);
ok('handoff prefills the area + pin', h$('#s-report').innerHTML.indexOf(dest.to + ' \u00b7 ') > -1 && /GPS \u00b18 m/.test(h$('#s-report').innerHTML), dest.to);
SR.report.close();
ok('no reports filed by the ride itself', SR.store.reportStats().total === reportsAfter);

console.log('\n[10] hazard detail card (map pin tap)');
SR.store.patch({ sheet: 'route' });
const hz = SR.HAZARDS[0];
SR.screens.openHazard(hz);
ok('detail card rendered', /detail-head/.test(h$('#s-detail').innerHTML) && /Handled by/.test(h$('#s-detail').innerHTML));
ok('detail overlay + id tracked', SR.store.get().overlay === 'detail' && SR.store.get().detailId === hz.id);
ok('detail map snapshot drawn', miniCalls[miniCalls.length - 1].pins.length > 0, 'pins=' + miniCalls[miniCalls.length - 1].pins.length);
ok('detail card reports the owner', h$('#s-detail').innerHTML.indexOf(esc(SR.authority(hz.authority).name)) > -1, SR.authority(hz.authority).name);
SR.screens.openHazard(null);
ok('null hazard is ignored', SR.store.get().detailId === hz.id);
fire('[data-act]', { 'data-act': 'close-detail' }, '#s-detail');
ok('back button closes the card', SR.store.get().overlay === null);
SR.store.patch({ sheet: null });

console.log('\n[11] data helpers used by the flows');
ok('roadAuthority knows federal roads', SR.roadAuthority('Jalan Gopeng (FT1)') === 'JKR');
ok('roadAuthority defaults town roads to MBI', SR.roadAuthority('Jalan Foo') === 'MBI');
ok('types all have alert copy', SR.HAZARD_TYPES.every(t => !!SR.ALERT_TEXT[t.id]));
ok('junction + lorry-zone alerts have copy',
  /\{d\}/.test(SR.ALERT_TEXT.junction.title) && /turning cars/i.test(SR.ALERT_TEXT.junction.body) &&
  /\{d\}/.test(SR.ALERT_TEXT.zone.title) && /blind spots/i.test(SR.ALERT_TEXT.zone.body));
ok('destinations carry polylines', SR.DESTINATIONS.every(d => d.fastest.poly.length > 2 && d.safest.poly.length > 2));

console.log('\n[12] traffic risk layer + time of day');
ok('mock data has a full set of dangerous junctions', SR.DANGEROUS_JUNCTIONS.length >= 8 && SR.DANGEROUS_JUNCTIONS.length <= 12,
  SR.DANGEROUS_JUNCTIONS.length + ' junctions');
ok('junctions sit around Ipoh', SR.DANGEROUS_JUNCTIONS.every(j => j.ll[0] > 4.5 && j.ll[0] < 4.72 && j.ll[1] > 101 && j.ll[1] < 101.2));
ok('every junction carries a kind + crash count',
  SR.DANGEROUS_JUNCTIONS.every(j => /^(blackspot|busy|unsignalised)$/.test(j.kind) && j.crashes > 0));
ok('heavy-vehicle zones are road segments', SR.LORRY_ZONES.length >= 2 && SR.LORRY_ZONES.every(z => z.ll.length >= 2 && z.lorries > 0),
  SR.LORRY_ZONES.length + ' zones');
ok('time selector offers day / rush / night', SR.TIMES.map(t => t.id).join(',') === 'day,rush,night');
ok('junction line reads "N dangerous junctions, M heavy-vehicle roads"',
  SR.trafficLine(3, 2) === '3 dangerous junctions · 2 heavy-vehicle roads', SR.trafficLine(3, 2));

/* the headline score must always be the 60/40 blend of its two halves */
let blend = true, badBlend = '';
SR.DESTINATIONS.forEach(d => ['fastest', 'safest'].forEach(k => ['day', 'rush', 'night'].forEach(t => [false, true].forEach(rain => {
  const b = SR.store.metricBundle(d, k, rain, t);
  const inRange = b.roadScore >= 0 && b.roadScore <= 10 && b.trafficScore >= 0 && b.trafficScore <= 10;
  if (!inRange || b.score !== SR.combineScore(b.roadScore, b.trafficScore)) {
    blend = false;
    badBlend = d.id + '/' + k + '/' + t + '/rain=' + rain + ' (' + b.roadScore + '+' + b.trafficScore + '=' + b.score + ')';
  }
}))));
const combos = SR.DESTINATIONS.length * 2 * 3 * 2;
ok('safety score = 60% road + 40% traffic (' + combos + ' route/time/rain combos)', blend, badBlend);

/* every junction / zone a route claims must resolve to real mock data */
let refs = true, badRef = '';
SR.DESTINATIONS.forEach(d => ['fastest', 'safest'].forEach(k => ['day', 'rush', 'night'].forEach(t => {
  const b = SR.store.metricBundle(d, k, false, t);
  (b.junctions || []).forEach(id => { if (!SR.junction(id)) { refs = false; badRef = id + ' from ' + d.id + '/' + k + '/' + t; } });
  (b.zones || []).forEach(id => { if (!SR.lorryZone(id)) { refs = false; badRef = id + ' from ' + d.id + '/' + k + '/' + t; } });
})));
ok('routes only reference real junctions + lorry zones', refs, badRef);

/* the route sheet: two scores, the junction line, and the time selector */
SR.store.patch({ destinationId: 'bercham', selectedRoute: 'safest', timeOfDay: 'day', rain: false, sheet: 'route' });
const daySafe = SR.store.selectedBundle().route;
SR.screens.renderRouteSheet();
let sheetHTML = h$('#sheet-route').innerHTML;
ok('route sheet has a day/rush/night selector',
  /data-time="day"/.test(sheetHTML) && /data-time="rush"/.test(sheetHTML) && /data-time="night"/.test(sheetHTML));
ok('day is selected by default', /data-time="day"[^>]*is-sel|is-sel[^>]*data-time="day"/.test(sheetHTML));
ok('route card shows a road condition score', /road condition/.test(sheetHTML));
ok('route card shows a traffic risk score', /traffic risk/.test(sheetHTML));
ok('route card lists the junctions + lorry roads',
  /dangerous junctions/.test(sheetHTML) && /heavy-vehicle road/.test(sheetHTML),
  (sheetHTML.match(/\d+ dangerous junctions/g) || []).join(' / '));
ok('why-list mentions traffic', /blackspot|junction/i.test(sheetHTML) && /lorry/i.test(sheetHTML));
ok('sheet carries a junction + zone map key',
  /mapkey/.test(sheetHTML) && /juncpin/.test(sheetHTML) && /hatchkey/.test(sheetHTML));

ok('time-of-day handler is wired', fire('[data-time]', { 'data-time': 'rush' }, '#sheet-route') > 0);
ok('rush hour patches the store', SR.store.get().timeOfDay === 'rush');
const rushSafe = SR.store.selectedBundle().route;
sheetHTML = h$('#sheet-route').innerHTML;
ok('rush hour drops the traffic score', rushSafe.trafficScore < daySafe.trafficScore,
  daySafe.trafficScore + ' -> ' + rushSafe.trafficScore);
ok('rush hour drops the overall safety score', rushSafe.score < daySafe.score, daySafe.score + ' -> ' + rushSafe.score);
ok('rush hour makes the safe line slower', rushSafe.time > daySafe.time, daySafe.time + ' -> ' + rushSafe.time);
ok('sheet re-rendered with rush selected', /data-time="rush"[^>]*is-sel|is-sel[^>]*data-time="rush"/.test(sheetHTML));
ok('rush hour swaps in traffic reasoning', /lorry traffic|right turns/.test(sheetHTML));

SR.store.patch({ timeOfDay: 'night' });
const nightSafe = SR.store.selectedBundle().route;
ok('night re-draws the safest line', nightSafe.poly !== daySafe.poly);
ok('night crosses fewer junctions', nightSafe.junctions.length < daySafe.junctions.length,
  daySafe.junctions.length + ' -> ' + nightSafe.junctions.length);
ok('night road score reflects the dark', nightSafe.roadScore < daySafe.roadScore,
  daySafe.roadScore + ' -> ' + nightSafe.roadScore);
ok('sheet map gets the junction + zone layers',
  miniCalls[miniCalls.length - 1].junctions.length > 0 && miniCalls[miniCalls.length - 1].zones.length > 0);
SR.store.patch({ timeOfDay: 'day', sheet: null });

/* ride mode queues both traffic alerts on the current line */
SR.ride.start();
ok('ride queues junction + lorry-zone cues',
  SR.ride.state.cues.some(c => c.kind === 'junction') && SR.ride.state.cues.some(c => c.kind === 'zone'),
  SR.ride.state.cues.map(c => c.kind).join(','));
ok('ride map receives junctions + zones',
  miniCalls[miniCalls.length - 1].junctions.length > 0 && miniCalls[miniCalls.length - 1].zones.length > 0);
SR.ride.stop();

console.log('\n[13] demo destination: Station 18 -> Politeknik Ungku Omar');
const puo = SR.dest('puo');
ok('demo destination exists', puo.from === 'Station 18' && puo.to === 'Politeknik Ungku Omar',
  puo.from + ' -> ' + puo.to);
ok('the campus run crosses the new junctions + lorry roads',
  puo.fastest.junctions.indexOf('j09') > -1 && puo.safest.zones.indexOf('z06') > -1);
ok('rush hour is worse than day on the campus run',
  SR.store.metricBundle(puo, 'safest', false, 'rush').trafficScore < SR.store.metricBundle(puo, 'safest', false, 'day').trafficScore);
ok('night darkens the road score on the campus run',
  SR.store.metricBundle(puo, 'safest', false, 'night').roadScore < SR.store.metricBundle(puo, 'safest', false, 'day').roadScore);

/* every line handed to the map / ride mode must start on the origin pin and
   finish on the destination pin, in every weather + time combination */
function destLines(d) {
  const out = [d.fastest.poly, d.safest.poly];
  if (d.rain) {
    if (d.rain.fastest && d.rain.fastest.poly) out.push(d.rain.fastest.poly);
    if (d.rain.safest && d.rain.safest.poly) out.push(d.rain.safest.poly);
  }
  ['rush', 'night'].forEach(function (t) {
    const b = d.time && d.time[t];
    if (b && b.safest && b.safest.poly) out.push(b.safest.poly);
  });
  return out;
}
let endsOk = true, badLine = '';
SR.DESTINATIONS.forEach(function (d) {
  destLines(d).forEach(function (p) {
    const a = p[0], z = p[p.length - 1];
    if (p.length < 3 || a[0] !== d.fromLL[0] || a[1] !== d.fromLL[1] ||
        z[0] !== d.toLL[0] || z[1] !== d.toLL[1]) {
      endsOk = false;
      badLine = d.id + ' ' + JSON.stringify(a) + ' -> ' + JSON.stringify(z);
    }
  });
});
ok('every route line runs origin pin -> destination pin', endsOk, badLine);

console.log('\n--- ' + pass + ' passed, ' + fail + ' failed ---');
console.log('toasts: ' + toasts.slice(0, 4).join(' | '));
process.exit(fail ? 1 : 0);
