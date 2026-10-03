/* ============================================================
   Selamat Jalan — small DOM / navigation helpers
   ============================================================ */
window.SR = window.SR || {};

(function () {
  'use strict';

  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function frag(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content;
  }

  /* ---------- screens ---------- */
  const TAB_SCREENS = { map: '#s-map', reports: '#s-reports', profile: '#s-profile' };
  const OVERLAY_SCREENS = { report: '#s-report', ride: '#s-ride', detail: '#s-detail' };

  let overlayTimer = null;

  function showTab(name) {
    Object.keys(TAB_SCREENS).forEach(function (k) {
      $(TAB_SCREENS[k]).classList.toggle('is-active', k === name);
    });
    $$('.tab').forEach(function (b) {
      const on = b.getAttribute('data-tab') === name;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    SR.store.patch({ tab: name });
  }

  function openOverlay(name) {
    if (overlayTimer) { clearTimeout(overlayTimer); overlayTimer = null; }
    const el = $(OVERLAY_SCREENS[name]);
    if (!el) return;
    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');
    /* force layout so the transition runs from the "closed" position */
    void el.offsetWidth;
    el.classList.add('is-active');
    $('#tabbar').hidden = true;
    SR.store.patch({ overlay: name });
  }

  function closeOverlay() {
    const name = SR.store.get().overlay;
    if (!name) return;
    const el = $(OVERLAY_SCREENS[name]);
    el.classList.remove('is-active');
    el.setAttribute('aria-hidden', 'true');
    $('#tabbar').hidden = false;
    SR.store.patch({ overlay: null });
    overlayTimer = setTimeout(function () { el.hidden = true; overlayTimer = null; }, 320);
  }

  /* ---------- sheets ---------- */
  const SHEETS = { dest: '#sheet-dest', route: '#sheet-route' };
  let sheetTimer = null;

  function openSheet(which, html) {
    const id = SHEETS[which];
    const el = $(id);
    if (!el) return;
    if (sheetTimer) { clearTimeout(sheetTimer); sheetTimer = null; }
    /* close any other sheet first */
    $$('.sheet').forEach(function (s) { if (s !== el) { s.classList.remove('is-open'); s.hidden = true; } });
    el.innerHTML = html;
    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');
    void el.offsetWidth;
    el.classList.add('is-open');
    const bd = $('#backdrop');
    bd.hidden = false;
    void bd.offsetWidth;
    bd.classList.add('is-on');
    SR.store.patch({ sheet: which });
  }

  function closeSheet() {
    const which = SR.store.get().sheet;
    if (!which) return;
    const el = $(SHEETS[which]);
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    const bd = $('#backdrop');
    bd.classList.remove('is-on');
    sheetTimer = setTimeout(function () { el.hidden = true; bd.hidden = true; sheetTimer = null; }, 340);
    SR.store.patch({ sheet: null });
  }

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(msg, ms) {
    const t = $('#toast');
    t.innerHTML = msg;
    t.hidden = false;
    void t.offsetWidth;
    t.classList.add('is-on');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('is-on');
      toastTimer = setTimeout(function () { t.hidden = true; }, 300);
    }, ms || 2200);
  }

  /* ---------- misc ---------- */
  function on(root, sel, evt, fn) {
    const base = (typeof root === 'string') ? $(root) : root;
    if (!base) return;
    base.addEventListener(evt, function (e) {
      const hit = e.target.closest ? e.target.closest(sel) : null;
      if (hit && base.contains(hit)) fn(e, hit);
    });
  }

  function clock() {
    const d = new Date();
    const h = d.getHours() % 12 || 12;
    const m = String(d.getMinutes()).padStart(2, '0');
    $('#clock').textContent = h + ':' + m;
  }
  setInterval(clock, 20000);

  /* hazard pin markup shared by both map backends */
  function pinHTML(h, opts) {
    opts = opts || {};
    const t = SR.type(h.type);
    const dark = t.id === 'gravel';
    return '<div class="pinwrap">' +
      (opts.label ? '<span class="pin__label">' + esc(h.road.replace(/\s*\(.*\)/, '')) + '</span>' : '') +
      '<span class="pin' + (opts.small ? ' pin--sm' : '') + (opts.sel ? ' pin--sel' : '') + '" ' +
      'style="background:' + t.color + ';color:' + (dark ? '#3B3000' : '#fff') + '">' + t.icon + '</span></div>';
  }

  SR.ui = {
    $: $, $$: $$, esc: esc, frag: frag,
    showTab: showTab, openOverlay: openOverlay, closeOverlay: closeOverlay,
    openSheet: openSheet, closeSheet: closeSheet, toast: toast,
    on: on, clock: clock, pinHTML: pinHTML,
    scoreColor: function (s) { return s >= 8 ? '#067A40' : s >= 6.5 ? '#B57A00' : '#E5342A'; }
  };

  document.addEventListener('DOMContentLoaded', clock);
})();
