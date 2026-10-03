/* ============================================================
   Selamat Jalan — tiny in-memory store (no localStorage, no backend)
   ============================================================ */
window.SR = window.SR || {};

(function () {
  'use strict';

  const listeners = {};

  const hidden = {};
  SR.HAZARD_TYPES.forEach(function (t) { hidden[t.id] = false; });

  const state = {
    /* navigation */
    tab: 'map',                 // map | reports | profile
    overlay: null,              // report | ride | detail | null
    detailId: null,
    sheet: null,                // which sheet is open

    /* map + routing */
    destinationId: null,
    selectedRoute: 'safest',
    rain: false,
    timeOfDay: 'day',           // day | rush | night
    hidden: hidden,
    labels: true,

    /* reports (mutable during the session) */
    reports: SR.SAMPLE_REPORTS.map(function (r) { return Object.assign({}, r); }),
    draft: null,                // report flow working copy
    lastTicket: null,

    /* profile */
    profile: { confirmed: 18, safeKm: 1840, since: 2019 },
    alertsOn: true
  };

  function get() { return state; }

  function patch(parts) {
    Object.keys(parts).forEach(function (k) { state[k] = parts[k]; });
    emit('change', parts);
  }

  function on(evt, fn) {
    listeners[evt] = listeners[evt] || [];
    listeners[evt].push(fn);
    return function off() {
      listeners[evt] = listeners[evt].filter(function (f) { return f !== fn; });
    };
  }

  function emit(evt, data) {
    (listeners[evt] || []).forEach(function (fn) { fn(data); });
  }

  /* ---------- selectors ---------- */

  function currentDestination() {
    return state.destinationId ? SR.dest(state.destinationId) : null;
  }

  /* One route's metrics: the hand-authored day values, overridden by the
     time of day, then by the rain toggle. The overall safety score is
     always derived from the two component scores, so it cannot drift. */
  function metricBundle(d, key, rain, timeId) {
    const time = (timeId == null ? state.timeOfDay : timeId) || 'day';
    const alt = (d.time && d.time[time] && d.time[time][key]) || {};
    const base = Object.assign({}, d[key], alt);
    if (rain == null ? state.rain : rain) Object.assign(base, (d.rain && d.rain[key]) || {});
    base.roadScore = Number(base.roadScore) || 0;
    base.trafficScore = Number(base.trafficScore) || 0;
    base.score = SR.combineScore(base.roadScore, base.trafficScore);
    base.junctions = base.junctions || [];
    base.zones = base.zones || [];
    return base;
  }

  function routeStates() {
    const d = currentDestination();
    if (!d) return null;
    const time = state.timeOfDay || 'day';
    const fastest = metricBundle(d, 'fastest');
    const safest = metricBundle(d, 'safest');
    /* the safest line is re-drawn for the rain, then for the time of day */
    const tSafe = (d.time && d.time[time] && d.time[time].safest) || {};
    const rainSafe = (state.rain && d.rain && d.rain.safest) || {};
    fastest.poly = d.fastest.poly;
    safest.poly = rainSafe.poly || tSafe.poly || d.safest.poly;
    return { dest: d, fastest: fastest, safest: safest, time: time };
  }

  function selectedBundle() {
    const r = routeStates();
    if (!r) return null;
    const b = state.selectedRoute === 'fastest' ? r.fastest : r.safest;
    return { dest: r.dest, route: b, key: state.selectedRoute };
  }

  function visibleHazards() {
    return SR.HAZARDS.filter(function (h) { return !state.hidden[h.type]; });
  }

  function resolveHazardIds(ids) {
    return (ids || []).map(function (id) { return SR.hazard(id); }).filter(Boolean);
  }

  function resolveJunctionIds(ids) {
    return (ids || []).map(function (id) { return SR.junction(id); }).filter(Boolean);
  }

  function resolveZoneIds(ids) {
    return (ids || []).map(function (id) { return SR.lorryZone(id); }).filter(Boolean);
  }

  /* the dangerous junctions + lorry zones a route actually crosses */
  function trafficOf(route) {
    return {
      junctions: resolveJunctionIds(route && route.junctions),
      zones: resolveZoneIds(route && route.zones)
    };
  }

  function timeOfDay() { return SR.timeInfo(state.timeOfDay); }

  /* counters used on the Reports tab + Profile */
  function reportStats() {
    const mine = state.reports.filter(function (r) { return r.mine; });
    const fixed = mine.filter(function (r) { return r.stage >= 3; }).length;
    const open = mine.length - fixed;
    const confirms = mine.reduce(function (a, r) { return a + (r.confirms || 0); }, 0);
    return { total: mine.length, fixed: fixed, open: open, confirms: confirms };
  }

  function findReport(id) {
    for (let i = 0; i < state.reports.length; i++) if (state.reports[i].id === id) return state.reports[i];
    return null;
  }

  /* add a freshly submitted report to the top of My reports */
  function addReport(rep) {
    state.reports.unshift(rep);
    state.lastTicket = rep;
    emit('change', { reports: true });
    emit('submitted', rep);
    return rep;
  }

  SR.store = {
    get: get, patch: patch, on: on, emit: emit,
    currentDestination: currentDestination,
    routeStates: routeStates,
    selectedBundle: selectedBundle,
    metricBundle: metricBundle,
    visibleHazards: visibleHazards,
    resolveHazardIds: resolveHazardIds,
    resolveJunctionIds: resolveJunctionIds,
    resolveZoneIds: resolveZoneIds,
    trafficOf: trafficOf,
    timeOfDay: timeOfDay,
    reportStats: reportStats,
    findReport: findReport,
    addReport: addReport
  };
})();
