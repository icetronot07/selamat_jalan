/* ============================================================
   Selamat Jalan — real-browser boot check (dev only)

   Loads the app in headless Chrome/Edge, waits for the JS to run,
   then inspects the *post-render* DOM. Unlike tools/smoke.js (which
   stubs the DOM in a VM), this proves the real thing boots: all 10
   files parsed, Leaflet initialised, every screen painted, and the
   traffic-risk layers (junction pins + hatched lorry zones) drawn.

   Usage:
     node tools/domcheck.js                       (defaults to localhost)
     node tools/domcheck.js http://localhost/selamat_jln2/
     node tools/domcheck.js --shot preview.png    (also save a screenshot)
     node tools/domcheck.js --dump dom.html       (save the post-JS DOM)
     node tools/domcheck.js --shot t.png --size 700,470 --scale 2
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

const argv = process.argv.slice(2);
const shotIdx = argv.indexOf('--shot');
const shot = shotIdx > -1 ? argv[shotIdx + 1] : null;
const dumpIdx = argv.indexOf('--dump');
const dumpTo = dumpIdx > -1 ? argv[dumpIdx + 1] : null;
const sizeIdx = argv.indexOf('--size');
const winSize = sizeIdx > -1 ? argv[sizeIdx + 1] : '760,900';
const scaleIdx = argv.indexOf('--scale');
const scale = scaleIdx > -1 ? argv[scaleIdx + 1] : null;
const url = argv.find(function (a) { return /^https?:/.test(a); }) || 'http://localhost/selamat_jln2/';

const browser = CANDIDATES.find(function (p) { return fs.existsSync(p); });
if (!browser) {
  console.error('No Chrome/Edge found. Checked:\n  ' + CANDIDATES.join('\n  '));
  process.exit(2);
}

let passed = 0, failed = 0;
function check(label, ok, extra) {
  if (ok) { passed++; console.log('  PASS  ' + label + (extra ? '  (' + extra + ')' : '')); }
  else { failed++; console.log('  FAIL  ' + label + (extra ? '  (' + extra + ')' : '')); }
}

/* sources read from the real project, never hard-coded */
const dataSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
const screensSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'screens.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
const typeStart = dataSrc.indexOf('HAZARD_TYPES = [');
const typeBlock = dataSrc.slice(typeStart, dataSrc.indexOf('];', typeStart));
const TYPE_COUNT = (typeBlock.match(/id:\s*'[a-z]+'/g) || []).length;

function run(extraArgs) {
  return spawnSync(browser, [
    '--headless=old',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    /* per-run profile: a reused one would serve stale index.html / app.css
       from the disk cache and quietly pass the checks against old assets */
    '--user-data-dir=' + path.join(os.tmpdir(), 'selamatjalan-' + process.pid),
    '--virtual-time-budget=9000',
    '--window-size=' + winSize
  ].concat(scale ? ['--force-device-scale-factor=' + scale] : [])
   .concat(extraArgs), { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 90000 });
}

console.log('Selamat Jalan — real-browser boot check');
console.log('browser: ' + browser);
console.log('url    : ' + url + '\n');

const res = run(['--dump-dom', url]);
if (res.error) { console.error('launch failed: ' + res.error.message); process.exit(2); }

const dom = res.stdout || '';
const n = function (re) { return (dom.match(re) || []).length; };

if (dumpTo) {
  const p = path.resolve(process.cwd(), dumpTo);
  fs.writeFileSync(p, dom);
  console.log('[dump] wrote ' + p);
}

console.log('[dom] ' + dom.length + ' bytes after JS');

console.log('\n[1] library + map');
check('Leaflet initialised', /leaflet-container/.test(dom));
check('attribution present', /leaflet-control-attribution/.test(dom));
check('tiles pane mounted', n(/leaflet-tile-pane/) > 0, n(/leaflet-tile-pane/) + ' panes');
check('marker/overlay panes mounted', n(/leaflet-zoom-animated|leaflet-overlay-pane/) > 0);
check('custom controls used instead of leaflet zoom', /id="btn-recenter"/.test(dom) && /id="btn-labels"/.test(dom));

console.log('\n[2] shell');
/* the app name lives in exactly two user-visible places: the <title> and the
   status-bar label (uppercased by CSS, so the markup keeps normal casing) */
const docTitle = (dom.match(/<title>([^<]*)<\/title>/) || ['', ''])[1];
const midRule = (css.match(/\.statusbar__mid\{[^}]*\}/) || ['(no .statusbar__mid rule)'])[0];
check('brand: <title> is "Selamat Jalan"', /^Selamat Jalan\b/.test(docTitle), docTitle || 'no <title> found');
check('brand: status-bar label is "Selamat Jalan"', /class="statusbar__mid">Selamat Jalan</.test(dom) && /text-transform:uppercase/.test(midRule), 'uppercased via CSS');
check('phone frame', /class="phone/.test(dom));
check('tabbar with 3 tabs', n(/class="tab[ "]/g) === 3, n(/class="tab[ "]/g) + ' tabs');
check('report FAB', /class="fab/.test(dom));
check('backdrop + 2 sheets in DOM', /id="backdrop"/.test(dom) && /id="sheet-dest"/.test(dom) && /id="sheet-route"/.test(dom));
check('map status node', /id="map-status"/.test(dom));

console.log('\n[3] screens painted by js');
check('legend chips match SR.HAZARD_TYPES', n(/class="chip[" ]/g) === TYPE_COUNT && n(/data-type="/g) === TYPE_COUNT, n(/class="chip[" ]/g) + '/' + TYPE_COUNT + ' chips');
check('reports list rendered', n(/class="rep[ "]/g) > 0, n(/class="rep[ "]/g) + ' rows');
check('reports subtitle no longer 0 sent', !/0 sent · 0 fixed/.test(dom));
check('profile stats rendered', n(/class="stat[ "]/g) > 0, n(/class="stat[ "]/g) + ' stats');
check('rider badge card', /class="card" id="profile-badge"/.test(dom));

console.log('\n[4] map layers bound to the store');
check('hazard + destination markers', n(/sr-icon/g) > 0, n(/sr-icon/g) + ' markers');
check('no "Reporting unavailable" fallback', !/Reporting unavailable/i.test(dom));
/* Leaflet's own panes sit at z-index 200-700, so the app's overlay must be a
   sibling of the map container, and the container must create a stacking
   context - otherwise the tiles paint over the search bar / chips / FAB. */
function nestingDepth(html, outerId, innerId) {
  const a = html.indexOf('id="' + outerId + '"');
  const b = html.indexOf('id="' + innerId + '"');
  if (a < 0 || b < 0 || b < a) return null;
  const seg = html.slice(a, b);
  return (seg.match(/<div/g) || []).length - (seg.match(/<\/div>/g) || []).length;
}
const pillDepth = nestingDepth(dom, 'map', 'map-status');
check('#map-status is a sibling of #map, not inside Leaflet', pillDepth === 0, pillDepth === null ? 'not found' : 'depth ' + pillDepth);
check('Leaflet owns the #map container', /class="[^"]*leaflet-container[^"]*"[^>]*id="map"/.test(dom));
const mapRule = (css.match(/\.map\{[^}]*\}/) || ['(no .map rule)'])[0];
check('.map traps Leaflet panes in a stacking context', /z-index\s*:/.test(mapRule), mapRule.trim());

const errs = (res.stderr || '').split(/\r?\n/).filter(function (l) {
  return /Uncaught|TypeError|ReferenceError|SyntaxError at|is not a function|is not defined/.test(l);
});
console.log('\n[5] console errors');
check('no uncaught js errors', errs.length === 0, errs.length ? errs[0] : 'clean');
errs.slice(0, 5).forEach(function (l) { console.log('        ' + l.trim()); });

/* the traffic-risk layer: counts come from the mock data, the pixels from
   the booted DOM, so a rename or an un-wired map layer fails the gate */
function blockOf(src, marker) {
  const at = src.indexOf(marker);
  return at < 0 ? '' : src.slice(at, src.indexOf('];', at));
}
const juncBlock = blockOf(dataSrc, 'DANGEROUS_JUNCTIONS = [');
const JUNC_COUNT = (juncBlock.match(/id:\s*'j\d+'/g) || []).length;
const zoneBlock = blockOf(dataSrc, 'LORRY_ZONES = [');
const ZONE_COUNT = (zoneBlock.match(/id:\s*'z\d+'/g) || []).length;
const ZONE_SEGS = (zoneBlock.match(/ll:\s*\[\s*\[/g) || []).length;
const TIME_IDS = (blockOf(dataSrc, 'TIMES = [').match(/id:\s*'(day|rush|night)'/g) || [])
  .map(function (s) { return s.split("'")[1]; });

console.log('\n[6] traffic risk layer');
check('mock data has a full set of dangerous junctions', JUNC_COUNT >= 8 && JUNC_COUNT <= 12, JUNC_COUNT + ' junctions');
check('mock data has heavy-vehicle zone segments', ZONE_COUNT >= 2 && ZONE_SEGS >= ZONE_COUNT,
  ZONE_COUNT + ' zones / ' + ZONE_SEGS + ' road segments');
check('mock data offers day / rush / night', TIME_IDS.join(',') === 'day,rush,night', TIME_IDS.join(','));
check('junction markers painted on the map', n(/juncpin/g) >= JUNC_COUNT, n(/juncpin/g) + ' junction icons');
check('hatched heavy-vehicle overlay drawn', /fakemap__zone|zone-line/.test(dom));
check('route card shows road + traffic scores', /road condition/.test(screensSrc) && /traffic risk/.test(screensSrc));
check('route card counts junctions + lorry roads',
  /dangerous junction/.test(screensSrc) && /heavy-vehicle road/.test(screensSrc));
check('time-of-day selector built from SR.TIMES', /seg--time/.test(screensSrc) && /data-time=/.test(screensSrc));
check('junction pin + zone hatch styles exist', /\.juncpin\{/.test(css) && /repeating-linear-gradient/.test(css));

if (shot) {
  const out = path.resolve(process.cwd(), shot);
  const img = run(['--screenshot=' + out, url]);
  const okShot = fs.existsSync(out) && fs.statSync(out).size > 2000;
  console.log('\n[7] screenshot');
  check('saved ' + out, okShot, okShot ? Math.round(fs.statSync(out).size / 1024) + ' KB' : (img.stderr || '').slice(0, 120));
}

console.log('\n--- ' + passed + ' passed, ' + failed + ' failed ---');
process.exit(failed ? 1 : 0);
