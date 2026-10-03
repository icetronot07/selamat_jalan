/* ============================================================
   Selamat Jalan — mock data
   Everything here is fake/demo data. No backend, no persistence.
   ============================================================ */
window.SR = window.SR || {};

(function () {
  'use strict';

  /* ---------------- hazard type icons (inline SVG, 24x24) ---------------- */
  const ICONS = {
    pothole: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.4 13.4c0-3.6 3.9-6 8.6-6s8.6 2.4 8.6 6c0 3-3.9 4.9-8.6 4.9s-8.6-1.9-8.6-4.9Z"/><path d="M9.2 13.7c1-.9 2.2-1.2 3.4-.8 1 .3 1.9.1 2.6-.6" opacity=".9"/></svg>',
    oil: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.4s6.1 6.7 6.1 10.8a6.1 6.1 0 0 1-12.2 0C5.9 9.1 12 2.4 12 2.4Zm2.2 12.9a2.9 2.9 0 0 1-2 2.4 2 2 0 0 0 2.9-1.1 2 2 0 0 0-.9-1.3Z" opacity=".92"/></svg>',
    gravel: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="7.4" cy="15.8" r="3.5"/><circle cx="14.2" cy="17.2" r="2.6"/><circle cx="16.2" cy="10.1" r="3.3"/><circle cx="9.1" cy="8.4" r="2.4"/></svg>',
    flooding: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M3 8.4c2-1.7 4-1.7 6 0s4 1.7 6 0 4-1.7 6 0"/><path d="M3 13.2c2-1.7 4-1.7 6 0s4 1.7 6 0 4-1.7 6 0"/><path d="M3 18c2-1.7 4-1.7 6 0s4 1.7 6 0 4-1.7 6 0"/></svg>',
    lighting: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0-3.4 10.9c.5.4.9 1 .9 1.6V16h5v-.5c0-.6.4-1.2.9-1.6A6 6 0 0 0 12 3Z"/><path d="M9.6 19h4.8M10.4 21.5h3.2"/></svg>',
    landslide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"><path d="M2 19.6 9 6.6l4 7 2.1-3.1L22 19.6Z"/><path d="M16.6 4.4h.01M19.8 8.2h.01M13.6 2.8h.01" stroke-width="2.6"/></svg>',
    fog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7.5h9.5M7.5 11.7h12M4 15.9h9.5M12.5 20h7.5"/></svg>',
    route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18.5" r="2.5"/><circle cx="18" cy="5.5" r="2.5"/><path d="M15.5 5.5H10A3.5 3.5 0 0 0 10 12.5h4.5a3.5 3.5 0 0 1 0 7h-4"/></svg>',
    junction: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.9" stroke-linecap="round"><path d="M12 2.6v4.6M12 16.8v4.6M2.6 12h4.6M16.8 12h4.6"/><path d="M5.2 5.2 8 8M18.8 5.2 16 8M5.2 18.8 8 16M18.8 18.8 16 16" stroke-width="1.6" opacity=".55"/></svg>',
    lorry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M1.9 6.4h10.5v8.6H1.9z"/><path d="M12.4 9.1h4.3l3.4 3v2.9h-7.7z"/><circle cx="6.4" cy="17.3" r="1.9"/><circle cx="16.4" cy="17.3" r="1.9"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 4h6l1.4 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.6L9 4Zm3 5.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Zm0 2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.5 5 5 10-11"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2 22.2 20.4H1.8L12 2.2Zm-1.2 6.5v6.2h2.4V8.7h-2.4Zm0 7.8v2.3h2.4v-2.3h-2.4Z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7.2 7.2 0 0 0-7.2 7.2C4.8 14.6 12 22.4 12 22.4s7.2-7.8 7.2-13.2A7.2 7.2 0 0 0 12 2Zm0 9.8a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2Z"/></svg>',
    moto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="4.6" cy="16.4" r="3.4"/><circle cx="19.4" cy="16.4" r="3.4"/><path d="M8 16.4h5.2l3-6.4h-3.4M13.6 10h4.2l1.6 6.4M10.4 10 9 7.4H6.8"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  /* ---------------- 7 hazard types ---------------- */
  const HAZARD_TYPES = [
    { id: 'pothole',   label: 'Pothole',              icon: ICONS.pothole,   color: '#E5342A', tip: 'Deep hole or broken surface' },
    { id: 'oil',       label: 'Oil spill',            icon: ICONS.oil,       color: '#F07B1B', tip: 'Diesel or engine oil slick' },
    { id: 'gravel',    label: 'Loose gravel',         icon: ICONS.gravel,    color: '#EDC412', tip: 'Sand, stones or loose chips' },
    { id: 'flooding',  label: 'Flooding',             icon: ICONS.flooding,  color: '#1E88E5', tip: 'Standing water on the road' },
    { id: 'lighting',  label: 'Poor lighting',        icon: ICONS.lighting,  color: '#8E44D0', tip: 'Unlit stretch or dead lamp' },
    { id: 'landslide', label: 'Landslide',            icon: ICONS.landslide, color: '#8A4B22', tip: 'Fallen earth, rock or tree' },
    { id: 'fog',       label: 'Fog / low visibility', icon: ICONS.fog,       color: '#7D8794', tip: 'Thick fog or haze' }
  ];

  /* ---------------- authorities (integration is simulated) ---------------- */
  const AUTHORITIES = {
    JKR: {
      id: 'JKR', short: 'JKR', name: 'JKR Perak', full: 'Jabatan Kerja Raya Perak',
      scope: 'Federal & state roads (FT / A routes)',
      email: 'aduan.jkrperak@jkr.gov.my', sla: 'Acknowledged within 3 working days',
      color: '#0B5BD3'
    },
    MBI: {
      id: 'MBI', short: 'MBI', name: 'Majlis Bandaraya Ipoh (MBI)', full: 'Majlis Bandaraya Ipoh',
      scope: 'Town & council roads inside Ipoh city',
      email: 'aduan@mbi.gov.my', sla: 'Acknowledged within 5 working days',
      color: '#1B7A45'
    }
  };

  /* ---------------- roads: who owns them ---------------- */
  const ROADS = [
    { name: 'Jalan Sultan Azlan Shah', area: 'Ipoh Garden', authority: 'MBI' },
    { name: 'Jalan Raja Permaisuri Bainun', area: 'Greentown', authority: 'MBI' },
    { name: 'Jalan Sultan Idris Shah', area: 'Ipoh Old Town', authority: 'MBI' },
    { name: 'Jalan Bercham', area: 'Bercham', authority: 'MBI' },
    { name: 'Jalan Gunung Rapat', area: 'Gunung Rapat', authority: 'MBI' },
    { name: 'Jalan Ipoh Garden', area: 'Ipoh Garden', authority: 'MBI' },
    { name: 'Jalan Tasek', area: 'Tasek', authority: 'MBI' },
    { name: 'Jalan Kuala Kangsar (FT1)', area: 'Tasek / Chemor', authority: 'JKR' },
    { name: 'Jalan Lahat (FT240)', area: 'Falim', authority: 'JKR' },
    { name: 'Jalan Menglembu (A190)', area: 'Menglembu', authority: 'JKR' },
    { name: 'Jalan Tambun (A13)', area: 'Tambun', authority: 'JKR' },
    { name: 'Jalan Gopeng (FT1)', area: 'Gunung Rapat', authority: 'JKR' },
    { name: 'Jalan Simpang Pulai (FT1)', area: 'Simpang Pulai', authority: 'JKR' },
    { name: 'Jalan Pasir Puteh', area: 'Station 18', authority: 'MBI' },
    { name: 'Jalan Raja Musa Mahadi', area: 'Gunung Rapat', authority: 'MBI' }
  ];

  /* ---------------- 18 hazards around Ipoh, Perak ---------------- */
  const HAZARDS = [
    { id: 'h01', type: 'pothole',   road: 'Jalan Sultan Azlan Shah',      area: 'Ipoh Garden',   ll: [4.6070, 101.1090], sev: 'high', age: '3 days',  confirms: 12, authority: 'MBI', note: 'Two deep potholes in the left lane; depth hidden by water.' },
    { id: 'h02', type: 'pothole',   road: 'Jalan Raja Permaisuri Bainun', area: 'Greentown',     ll: [4.6030, 101.0862], sev: 'med',  age: '1 week',  confirms: 6,  authority: 'MBI', note: 'Broken patch right where riders filter past traffic.' },
    { id: 'h03', type: 'oil',       road: 'Jalan Kuala Kangsar (FT1)',    area: 'Tasek',         ll: [4.6320, 101.1010], sev: 'high', age: '5 hours', confirms: 9,  authority: 'JKR', note: 'Diesel trail from a lorry across both lanes, very slick.' },
    { id: 'h04', type: 'gravel',    road: 'Jalan Lahat (FT240)',          area: 'Falim',         ll: [4.6000, 101.0653], sev: 'med',  age: '2 days',  confirms: 4,  authority: 'JKR', note: 'Loose chips left behind after patch works.' },
    { id: 'h05', type: 'pothole',   road: 'Jalan Lahat (FT240)',          area: 'Menglembu',     ll: [4.5862, 101.0521], sev: 'high', age: '2 weeks', confirms: 15, authority: 'JKR', note: 'Crater on the left edge — a front-wheel killer in the dark.' },
    { id: 'h06', type: 'flooding',  road: 'Jalan Bercham',                area: 'Bercham',       ll: [4.6350, 101.1232], sev: 'high', age: '4 days',  confirms: 8,  authority: 'MBI', note: 'Knee-deep after 40 minutes of rain, blocks the left lane.' },
    { id: 'h07', type: 'lighting',  road: 'Jalan Bercham',                area: 'Bercham',       ll: [4.6284, 101.1160], sev: 'med',  age: '3 weeks', confirms: 5,  authority: 'MBI', note: 'Six street lamps out along the industrial stretch.' },
    { id: 'h08', type: 'pothole',   road: 'Jalan Gopeng (FT1)',           area: 'Gunung Rapat',  ll: [4.5830, 101.1090], sev: 'med',  age: '6 days',  confirms: 7,  authority: 'JKR', note: 'Series of shallow potholes — the bike wobbles at 60 km/h.' },
    { id: 'h09', type: 'gravel',    road: 'Jalan Menglembu (A190)',       area: 'Menglembu',     ll: [4.5860, 101.0475], sev: 'high', age: '1 day',   confirms: 11, authority: 'JKR', note: 'Sand washed onto the road from a construction site.' },
    { id: 'h10', type: 'fog',       road: 'Jalan Simpang Pulai (FT1)',    area: 'Simpang Pulai', ll: [4.5480, 101.1420], sev: 'high', age: 'ongoing', confirms: 21, authority: 'JKR', note: 'Hill stretch fogged in from 6pm; visibility under 50 m.' },
    { id: 'h11', type: 'landslide', road: 'Jalan Simpang Pulai (FT1)',    area: 'Simpang Pulai', ll: [4.5432, 101.1372], sev: 'high', age: '1 day',   confirms: 17, authority: 'JKR', note: 'Small slope collapse near KM 21, one lane closed.' },
    { id: 'h12', type: 'gravel',    road: 'Jalan Simpang Pulai (FT1)',    area: 'Simpang Pulai', ll: [4.5388, 101.1330], sev: 'med',  age: '2 days',  confirms: 6,  authority: 'JKR', note: 'Gravel in the corners on the descent into Simpang Pulai.' },
    { id: 'h13', type: 'oil',       road: 'Jalan Tambun (A13)',           area: 'Tambun',        ll: [4.6180, 101.1340], sev: 'med',  age: '1 day',   confirms: 3,  authority: 'JKR', note: 'Oil patch at the junction exit, slippery when wet.' },
    { id: 'h14', type: 'pothole',   road: 'Jalan Sultan Azlan Shah',      area: 'Ipoh Garden',   ll: [4.6120, 101.1140], sev: 'high', age: '4 days',  confirms: 10, authority: 'MBI', note: 'Pothole mid-lane at the traffic-light approach.' },
    { id: 'h15', type: 'flooding',  road: 'Jalan Tambun (A13)',           area: 'Tambun',        ll: [4.6125, 101.1308], sev: 'high', age: '5 days',  confirms: 5,  authority: 'JKR', note: 'Low section floods fast in the afternoon storms.' },
    { id: 'h16', type: 'pothole',   road: 'Jalan Pasir Puteh',            area: 'Station 18',    ll: [4.5505, 101.0712], sev: 'high', age: '3 days',  confirms: 11, authority: 'MBI', note: 'Two broken patches on the left where the lorries turn into the lots.' },
    { id: 'h17', type: 'lighting',  road: 'Jalan Pasir Puteh',            area: 'Station 18',    ll: [4.5620, 101.0840], sev: 'med',  age: '2 weeks', confirms: 7,  authority: 'MBI', note: 'Four street lamps out on the climb out of Station 18.' },
    { id: 'h18', type: 'gravel',    road: 'Jalan Raja Musa Mahadi',       area: 'Gunung Rapat',  ll: [4.5868, 101.1216], sev: 'med',  age: '1 day',   confirms: 5,  authority: 'MBI', note: 'Loose gravel at the polytechnic gate where lorries cut the corner.' }
  ];

  /* ---------------- 10 dangerous junctions around Ipoh ----------------
     Road condition (potholes, oil, gravel) is only half the story for a
     rider — junctions and lorries cause most crashes. kind:
       · blackspot    = known crash cluster (3-year rider crash count)
       · busy         = heavy turning traffic, riders filter through it
       · unsignalised = no lights, no priority, riders get cut off
     turning/lorry flag what makes each one dangerous.                 */
  const DANGEROUS_JUNCTIONS = [
    { id: 'j01', name: 'Jalan Sultan Azlan Shah × Jalan Ipoh Garden', area: 'Ipoh Garden',  ll: [4.6130, 101.1180], kind: 'blackspot',    crashes: 14, turning: true,  lorry: false, note: 'Riders filtering past cars turning into the shop rows.' },
    { id: 'j02', name: 'Jalan Kuala Kangsar (FT1) × Jalan Tasek',     area: 'Tasek',        ll: [4.6320, 101.1010], kind: 'unsignalised', crashes: 9,  turning: true,  lorry: true,  note: 'Lorries pull out of the gravel yard across both lanes.' },
    { id: 'j03', name: 'Greentown roundabout (Jalan Raja Permaisuri Bainun)', area: 'Greentown', ll: [4.6030, 101.0862], kind: 'busy', crashes: 11, turning: true,  lorry: false, note: 'Four exits, no lane markings — riders get squeezed out.' },
    { id: 'j04', name: 'Jalan Bercham × Jalan Tasek industrial',      area: 'Bercham',      ll: [4.6290, 101.1210], kind: 'unsignalised', crashes: 8,  turning: true,  lorry: true,  note: 'Factory gates open straight onto the junction.' },
    { id: 'j05', name: 'Jalan Gopeng (FT1) × Jalan Gunung Rapat',     area: 'Gunung Rapat', ll: [4.5830, 101.1090], kind: 'unsignalised', crashes: 7,  turning: false, lorry: true,  note: 'Right turn across fast traffic coming off the hill.' },
    { id: 'j06', name: 'Jalan Lahat (FT240) × Jalan Falim',           area: 'Falim',        ll: [4.6000, 101.0653], kind: 'blackspot',    crashes: 12, turning: true,  lorry: true,  note: 'Quarry lorries and riders share one narrow turn pocket.' },
    { id: 'j07', name: 'Jalan Gopeng (FT1) × Sungai Raia',            area: 'Simpang Pulai', ll: [4.5560, 101.1270], kind: 'unsignalised', crashes: 6, turning: true,  lorry: true,  note: 'Lorries cross the descending lane to reach the quarry road.' },
    { id: 'j08', name: 'Meru Raya interchange (Lebuh Meru Raya)',     area: 'Meru Raya',    ll: [4.6650, 101.1080], kind: 'busy',         crashes: 5,  turning: true,  lorry: false, note: 'Slip-road merge where cars swing across for the shops.' },
    { id: 'j09', name: 'Jalan Pasir Puteh × Jalan Pengkalan Jaya',    area: 'Pasir Puteh',  ll: [4.5560, 101.0778], kind: 'busy',         crashes: 9, turning: true,  lorry: true,  note: 'Container lorries swing out across both lanes for the shop lots.' },
    { id: 'j10', name: 'Jalan Gopeng (FT1) × Jalan Raja Musa Mahadi', area: 'Gunung Rapat', ll: [4.5896, 101.1226], kind: 'unsignalised', crashes: 8, turning: true,  lorry: true,  note: 'Students turn across FT1 at the polytechnic gate.' }
  ];

  /* ---------------- heavy-vehicle zones (drawn hatched on the map) ----------
     ll is a short road segment (2-3 points) the riders actually ride.  */
  const LORRY_ZONES = [
    { id: 'z01', name: 'Jalan Kuala Kangsar (FT1) — Tasek to Chemor', road: 'Jalan Kuala Kangsar (FT1)', area: 'Tasek',        lorries: 120, peak: 'Rush hour', note: 'Cement and logging lorries climbing both ways.',  ll: [[4.6320, 101.1010], [4.6432, 101.1062], [4.6560, 101.1080]] },
    { id: 'z02', name: 'Jalan Bercham industrial stretch',            road: 'Jalan Bercham',             area: 'Bercham',      lorries: 80,  peak: 'Day',       note: 'Container lorries crossing the factory gates.',   ll: [[4.6290, 101.1210], [4.6350, 101.1232], [4.6420, 101.1270]] },
    { id: 'z03', name: 'Jalan Lahat (FT240) — Falim quarry run',      road: 'Jalan Lahat (FT240)',       area: 'Falim',        lorries: 150, peak: 'Rush hour', note: 'Quarry tippers through Falim from first light.',  ll: [[4.6000, 101.0653], [4.5940, 101.0600], [4.5862, 101.0521]] },
    { id: 'z04', name: 'Jalan Gopeng (FT1) — Gunung Rapat descent',   road: 'Jalan Gopeng (FT1)',        area: 'Gunung Rapat', lorries: 95,  peak: 'Night',     note: 'Lorries braking hard down the hill after dark.',  ll: [[4.5880, 101.0960], [4.5830, 101.1090], [4.5760, 101.1200]] },
    { id: 'z05', name: 'Jalan Pasir Puteh — Station 18 industrial run', road: 'Jalan Pasir Puteh',      area: 'Station 18',   lorries: 65, peak: 'Rush hour', note: 'Container and ready-mix lorries in and out of the shop lots.', ll: [[4.5505, 101.0712], [4.5560, 101.0778], [4.5620, 101.0840]] },
    { id: 'z06', name: 'Jalan Raja Musa Mahadi — PUO campus run',      road: 'Jalan Raja Musa Mahadi', area: 'Gunung Rapat', lorries: 55, peak: 'Day',       note: 'Campus buses and delivery lorries queue at the gate.',        ll: [[4.5846, 101.1132], [4.5868, 101.1186], [4.5892, 101.1232]] }
  ];

  /* ---------------- time of day: changes the safe route + both scores ----
     Each destination carries a `time` block that overrides the traffic
     numbers (and, at night, the safest polyline) for rush hour / night.  */
  const TIMES = [
    { id: 'day',   label: 'Day',       note: '10am – 4pm',    risk: 'Steady traffic and a dry surface — the easiest window.' },
    { id: 'rush',  label: 'Rush hour', note: '7–9am · 5–7pm', risk: 'Junctions and lorry runs are at their worst.' },
    { id: 'night', label: 'Night',     note: '8pm – 6am',     risk: 'Fewer cars, but potholes and unlit roads hide in the dark.' }
  ];

  /* ---------------- destinations + route options ----------------
     Route A ("fastest") = grey / Jalan X  · Route B ("safest") = green
     Metrics are hand-authored mock numbers; hazHits counts hazard spots
     (some clusters repeat, so hazHits >= hazards.length).
     Every route carries two scores out of 10 (higher = safer):
       roadScore    — surface and visibility (potholes, oil, gravel, lamps)
       trafficScore — junctions, heavy vehicles and speed
     The card's overall "safety score" is derived from both, never authored.
     junctions / zones list the dangerous junctions and heavy-vehicle roads
     the line crosses; the `time` block swaps them for rush hour and night. */
  const DESTINATIONS = [
    {
      id: 'bercham', from: 'Ipoh Old Town', to: 'Bercham',
      short: 'Old Town → Bercham', via: 'Jalan Sultan Azlan Shah',
      etaFast: 18, etaSafe: 23, km: 9.4, tag: 'Most potholes on route',
      fromLL: [4.5953, 101.0765], toLL: [4.6356, 101.1245],
      fastest: {
        key: 'fastest', label: 'Fastest', note: 'Jalan Sultan Azlan Shah',
        time: 18, dist: 9.4, roadScore: 4.2, trafficScore: 3.8, hazHits: 9, hazards: ['h01', 'h02', 'h06', 'h07', 'h14'],
        junctions: ['j01', 'j03', 'j04'], zones: ['z02'],
        poly: [[4.5953, 101.0765], [4.5978, 101.0812], [4.6006, 101.0870], [4.6038, 101.0950], [4.6070, 101.1032], [4.6112, 101.1112], [4.6190, 101.1180], [4.6282, 101.1222], [4.6356, 101.1245]]
      },
      safest: {
        key: 'safest', label: 'Safest', note: 'Avoids Ipoh Garden cluster',
        time: 23, dist: 11.1, roadScore: 8.6, trafficScore: 7.4, hazHits: 2, hazards: ['h02', 'h06'],
        junctions: ['j03', 'j04'], zones: ['z02'],
        why: ['Avoids 7 potholes on Jalan Sultan Azlan Shah', 'Skips the unlit Bercham stretch (6 lamps out)', 'Avoids the Ipoh Garden blackspot — riders cut off by turning cars', 'Only 2 dangerous junctions and one short lorry stretch'],
        poly: [[4.5953, 101.0765], [4.5989, 101.0804], [4.6012, 101.0860], [4.6003, 101.0928], [4.6032, 101.1008], [4.6104, 101.1050], [4.6142, 101.1124], [4.6202, 101.1240], [4.6288, 101.1272], [4.6356, 101.1245]]
      },
      rain: {
        fastest: { time: 21, dist: 9.4, roadScore: 3.4, trafficScore: 3.4, hazHits: 11, hazards: ['h01', 'h02', 'h06', 'h07', 'h14'] },
        safest: {
          time: 26, dist: 12.3, roadScore: 7.4, trafficScore: 6.6, hazHits: 3, hazards: ['h02', 'h07'],
          why: ['Avoids the flood-prone low section on Jalan Bercham', 'Stays off the steep Tasek hill climb', 'Avoids 7 potholes that hold standing water'],
          poly: [[4.5953, 101.0765], [4.5989, 101.0804], [4.6012, 101.0860], [4.6003, 101.0928], [4.6032, 101.1008], [4.6104, 101.1050], [4.6166, 101.1136], [4.6236, 101.1226], [4.6320, 101.1298], [4.6382, 101.1276], [4.6356, 101.1245]]
        },
        note: 'Wet-weather routing is on: hill roads and flood-prone low areas are avoided.'
      },

      /* time of day: only the traffic side moves with the clock (day = base) */
      time: {
        rush: {
          fastest: { time: 23, trafficScore: 2.6 },
          safest: {
            time: 29, trafficScore: 5.6,
            why: ['Avoids the Ipoh Garden blackspot — 14 rider crashes at the turn', 'Skips 2 unsignalised right turns where lorries cut across', 'Avoids Jalan Kuala Kangsar rush-hour lorry traffic', 'Avoids 7 potholes on Jalan Sultan Azlan Shah']
          }
        },
        night: {
          fastest: { time: 19, roadScore: 3.2, trafficScore: 4.4 },
          safest: {
            time: 25, roadScore: 8.2, trafficScore: 7.8, junctions: ['j04'], zones: ['z02'],
            why: ['Re-routes around the Greentown roundabout — the busiest night turn', 'Avoids the unlit middle stretch of Jalan Bercham (6 lamps out)', 'Only 1 dangerous junction on the run', 'Lorries are parked up, so one short blind-spot stretch'],
            poly: [[4.5953, 101.0765], [4.5972, 101.0822], [4.5978, 101.0890], [4.5990, 101.0958], [4.6024, 101.1022], [4.6088, 101.1062], [4.6156, 101.1140], [4.6236, 101.1198], [4.6318, 101.1222], [4.6356, 101.1245]]
          }
        }
      }
    },

    {
      id: 'meru', from: 'Ipoh Old Town', to: 'Meru Raya',
      short: 'Old Town → Meru Raya', via: 'Jalan Kuala Kangsar',
      etaFast: 22, etaSafe: 27, km: 10.8, tag: 'Oil spill on FT1',
      fromLL: [4.5953, 101.0765], toLL: [4.6650, 101.1080],
      fastest: {
        key: 'fastest', label: 'Fastest', note: 'Jalan Kuala Kangsar (FT1)',
        time: 22, dist: 10.8, roadScore: 5.6, trafficScore: 4.0, hazHits: 6, hazards: ['h02', 'h03', 'h14'],
        junctions: ['j02', 'j03', 'j08'], zones: ['z01'],
        poly: [[4.5953, 101.0765], [4.6000, 101.0792], [4.6118, 101.0872], [4.6230, 101.0952], [4.6320, 101.1010], [4.6432, 101.1062], [4.6542, 101.1092], [4.6650, 101.1080]]
      },
      safest: {
        key: 'safest', label: 'Safest', note: 'Avoids Tasek oil spill',
        time: 27, dist: 12.6, roadScore: 8.2, trafficScore: 7.0, hazHits: 2, hazards: ['h01', 'h14'],
        junctions: ['j03', 'j08'], zones: [],
        why: ['Avoids the diesel spill on Jalan Kuala Kangsar (Tasek)', 'Avoids 6 potholes between Greentown and Tasek', 'Avoids the Tasek junction — lorries turn across the climb', 'Avoids the FT1 lorry run (120 lorries an hour at rush)'],
        poly: [[4.5953, 101.0765], [4.6010, 101.0800], [4.6056, 101.0900], [4.6130, 101.1010], [4.6210, 101.1074], [4.6300, 101.1132], [4.6402, 101.1152], [4.6522, 101.1132], [4.6650, 101.1080]]
      },
      rain: {
        fastest: { time: 26, dist: 10.8, roadScore: 4.6, trafficScore: 3.6, hazHits: 8, hazards: ['h02', 'h03', 'h14'] },
        safest: {
          time: 31, dist: 14.0, roadScore: 7.2, trafficScore: 6.2, hazHits: 3, hazards: ['h01', 'h14'],
          why: ['Avoids the steep Tasek hill climb while wet', 'Avoids the flood-prone low road at Buntong', 'Avoids the diesel spill — twice as slick in the rain'],
          poly: [[4.5953, 101.0765], [4.6010, 101.0800], [4.6056, 101.0900], [4.6130, 101.1010], [4.6236, 101.1058], [4.6340, 101.1074], [4.6450, 101.1058], [4.6560, 101.1022], [4.6650, 101.1080]]
        },
        note: 'Wet-weather routing is on: hill roads and flood-prone low areas are avoided.'
      },

      /* time of day: only the traffic side moves with the clock (day = base) */
      time: {
        rush: {
          fastest: { time: 28, trafficScore: 3.0 },
          safest: {
            time: 33, trafficScore: 5.6,
            why: ['Avoids the Tasek junction where lorries turn across the climb', 'Skips 2 unsignalised right turns on the FT1 stretch', 'Avoids Jalan Kuala Kangsar rush-hour lorry traffic', 'Avoids the diesel spill on Jalan Kuala Kangsar (Tasek)']
          }
        },
        night: {
          fastest: { time: 23, roadScore: 4.4, trafficScore: 5.0 },
          safest: {
            time: 28, roadScore: 8.4, trafficScore: 7.6,
            why: ['Avoids the unlit Tasek climb (no lamps between KM 6 and KM 8)', 'Only 2 dangerous junctions on the run', 'No lorry roads at night — the FT1 yards are shut', 'Avoids the diesel spill that hides in the dark']
          }
        }
      }
    },

    {
      id: 'simpang', from: 'Ipoh', to: 'Simpang Pulai',
      short: 'Ipoh → Simpang Pulai', via: 'Jalan Gopeng (FT1)',
      etaFast: 20, etaSafe: 26, km: 12.9, tag: 'Landslide + hill fog',
      fromLL: [4.5953, 101.0765], toLL: [4.5310, 101.1290],
      fastest: {
        key: 'fastest', label: 'Fastest', note: 'Jalan Gopeng (FT1)',
        time: 20, dist: 12.9, roadScore: 4.0, trafficScore: 4.4, hazHits: 8, hazards: ['h08', 'h10', 'h11', 'h12'],
        junctions: ['j05', 'j07'], zones: ['z04'],
        poly: [[4.5953, 101.0765], [4.5912, 101.0902], [4.5850, 101.1012], [4.5800, 101.1122], [4.5700, 101.1212], [4.5560, 101.1270], [4.5440, 101.1300], [4.5310, 101.1290]]
      },
      safest: {
        key: 'safest', label: 'Safest', note: 'Lower corridor, no KM 21 slide',
        time: 26, dist: 14.8, roadScore: 8.0, trafficScore: 7.4, hazHits: 2, hazards: ['h10', 'h12'],
        junctions: ['j07'], zones: [],
        why: ['Avoids the landslide zone at KM 21 (one lane, loose rock)', 'Avoids 5 potholes on Jalan Gopeng', 'Skips the Sungai Raia junction where lorries cross the descent', 'Only 1 dangerous junction and no lorry roads'],
        poly: [[4.5953, 101.0765], [4.5900, 101.0850], [4.5856, 101.0952], [4.5812, 101.1062], [4.5752, 101.1148], [4.5672, 101.1202], [4.5572, 101.1236], [4.5468, 101.1272], [4.5372, 101.1332], [4.5310, 101.1290]]
      },
      rain: {
        fastest: { time: 24, dist: 12.9, roadScore: 2.8, trafficScore: 3.8, hazHits: 9, hazards: ['h08', 'h10', 'h11', 'h12'] },
        safest: {
          time: 34, dist: 18.6, roadScore: 8.0, trafficScore: 7.4, hazHits: 2, hazards: ['h10', 'h12'],
          why: ['Avoids the steep hill road at Bukit Merah (saturated slopes)', 'Avoids the flood-prone low section at KM 23', 'Avoids the landslide slope while the ground is soaked'],
          poly: [[4.5953, 101.0765], [4.5880, 101.0790], [4.5810, 101.0812], [4.5740, 101.0856], [4.5660, 101.0930], [4.5580, 101.1024], [4.5500, 101.1130], [4.5412, 101.1232], [4.5330, 101.1296], [4.5310, 101.1290]]
        },
        note: 'Wet-weather routing is on: hill roads and flood-prone low areas are avoided.'
      },

      /* time of day: only the traffic side moves with the clock (day = base) */
      time: {
        rush: {
          fastest: { time: 25, trafficScore: 3.2 },
          safest: {
            time: 31, trafficScore: 6.0,
            why: ['Avoids the KM 21 slide zone while traffic queues past it', 'Skips the Sungai Raia junction where lorries cross the descent', 'Avoids the Gopeng lorry run at rush hour', 'Avoids 5 potholes on Jalan Gopeng']
          }
        },
        night: {
          fastest: { time: 21, roadScore: 2.8, trafficScore: 4.6 },
          safest: {
            time: 27, roadScore: 7.0, trafficScore: 7.8,
            why: ['Avoids the fogged hill stretch that goes blind after dusk', 'Stays on the lit section past Gunung Rapat', 'Only 1 dangerous junction on the run', 'Avoids the KM 21 slide zone in the dark']
          }
        }
      }
    },

    {
      id: 'puo', from: 'Station 18', to: 'Politeknik Ungku Omar',
      short: 'Station 18 → Politeknik Ungku Omar', via: 'Jalan Pasir Puteh',
      etaFast: 24, etaSafe: 29, km: 12.4, tag: 'Campus gate lorries',
      fromLL: [4.5461, 101.0687], toLL: [4.5892, 101.1232],
      fastest: {
        key: 'fastest', label: 'Fastest', note: 'Jalan Pasir Puteh → FT1',
        time: 24, dist: 12.4, roadScore: 4.8, trafficScore: 3.2, hazHits: 8, hazards: ['h16', 'h17', 'h08', 'h18'],
        junctions: ['j09', 'j05', 'j10'], zones: ['z05', 'z06'],
        poly: [[4.5461, 101.0687], [4.5505, 101.0712], [4.5560, 101.0778], [4.5620, 101.0840], [4.5680, 101.0900], [4.5740, 101.0952], [4.5800, 101.1005], [4.5830, 101.1090], [4.5848, 101.1160], [4.5880, 101.1210], [4.5892, 101.1232]]
      },
      safest: {
        key: 'safest', label: 'Safest', note: 'Skips the Pasir Puteh shops',
        time: 29, dist: 13.6, roadScore: 8.4, trafficScore: 7.2, hazHits: 2, hazards: ['h08', 'h18'],
        junctions: ['j10'], zones: ['z06'],
        why: ['Avoids the Pasir Puteh junction where the container lorries turn', 'Avoids 6 potholes between Station 18 and the FT1 climb', 'Skips the unlit Station 18 stretch (4 lamps out)', 'Only 1 dangerous junction and a short campus lorry stretch'],
        poly: [[4.5461, 101.0687], [4.5492, 101.0732], [4.5530, 101.0802], [4.5568, 101.0868], [4.5602, 101.0930], [4.5648, 101.0980], [4.5720, 101.1012], [4.5792, 101.1052], [4.5836, 101.1122], [4.5868, 101.1186], [4.5892, 101.1232]]
      },
      rain: {
        fastest: { time: 28, dist: 12.4, roadScore: 3.8, trafficScore: 2.8, hazHits: 11, hazards: ['h16', 'h17', 'h08', 'h18'] },
        safest: {
          time: 34, dist: 15.2, roadScore: 7.4, trafficScore: 6.4, hazHits: 3, hazards: ['h08', 'h18'],
          why: ['Avoids the flood-prone low stretch on Jalan Pasir Puteh', 'Avoids 6 potholes that hold standing water', 'Stays off the FT1 climb while the surface is wet'],
          poly: [[4.5461, 101.0687], [4.5492, 101.0732], [4.5530, 101.0802], [4.5568, 101.0868], [4.5602, 101.0930], [4.5660, 101.0974], [4.5740, 101.1000], [4.5810, 101.1042], [4.5836, 101.1122], [4.5868, 101.1186], [4.5892, 101.1232]]
        },
        note: 'Wet-weather routing is on: hill roads and flood-prone low areas are avoided.'
      },

      /* time of day: only the traffic side moves with the clock (day = base) */
      time: {
        rush: {
          fastest: { time: 31, trafficScore: 2.0 },
          safest: {
            time: 37, trafficScore: 5.4,
            why: ['Avoids the Pasir Puteh junction where the container lorries turn', 'Skips 2 unsignalised right turns onto Jalan Gopeng (FT1)', 'Avoids the campus-gate crush when the polytechnic empties', 'Avoids 6 potholes on Jalan Pasir Puteh']
          }
        },
        night: {
          fastest: { time: 25, roadScore: 4.0, trafficScore: 4.6 },
          safest: {
            time: 31, roadScore: 8.0, trafficScore: 7.6,
            why: ['Re-routes around the unlit Station 18 stretch (4 lamps out)', 'Avoids the Gunung Rapat corner that goes blind after dusk', 'Only 1 dangerous junction on the run', 'Lorries are parked up, so one short blind-spot stretch'],
            poly: [[4.5461, 101.0687], [4.5500, 101.0800], [4.5548, 101.0912], [4.5600, 101.1002], [4.5672, 101.1062], [4.5752, 101.1082], [4.5816, 101.1120], [4.5868, 101.1186], [4.5892, 101.1232]]
          }
        }
      }
    }
  ];

  /* ---------------- sample tickets already in "My reports" ---------------- */
  const STAGES = ['Submitted', 'Acknowledged', 'Work scheduled', 'Fixed'];

  const SAMPLE_REPORTS = [
    {
      id: 'r1', mine: true, auth: 'JKR', type: 'pothole', stage: 3,
      ticket: 'JKR-2026-004118', road: 'Jalan Lahat (FT240)', area: 'Falim',
      ll: [4.6000, 101.0653], submitted: '12 Jan 2026', updated: '9 Feb 2026', confirms: 41,
      note: 'Deep pothole on the left edge after the Falim junction. Reported at 7:40am.', ref: 'FT240 · KM 4.2'
    },
    {
      id: 'r2', mine: true, auth: 'MBI', type: 'lighting', stage: 2,
      ticket: 'MBI-2026-000874', road: 'Jalan Bercham', area: 'Bercham',
      ll: [4.6284, 101.1160], submitted: '3 Feb 2026', updated: '26 Feb 2026', confirms: 18,
      note: 'Six street lamps out along the industrial stretch — pitch black after 8pm.', ref: 'Lamp pole B-118 to B-124'
    },
    {
      id: 'r3', mine: true, auth: 'JKR', type: 'gravel', stage: 1,
      ticket: 'JKR-2026-004210', road: 'Jalan Simpang Pulai (FT1)', area: 'Simpang Pulai',
      ll: [4.5388, 101.1330], submitted: '21 Feb 2026', updated: '24 Feb 2026', confirms: 27,
      note: 'Gravel across both corners on the descent. Front wheel slid at 40 km/h.', ref: 'FT1 · KM 23'
    },
    {
      id: 'r4', mine: true, auth: 'MBI', type: 'flooding', stage: 1,
      ticket: 'MBI-2026-000932', road: 'Jalan Gunung Rapat', area: 'Gunung Rapat',
      ll: [4.5830, 101.1090], submitted: '2 Mar 2026', updated: '5 Mar 2026', confirms: 9,
      note: 'Drain blocked, water pools 30 cm deep across the left lane after rain.', ref: 'Opposite SMK Gunung Rapat'
    },
    {
      id: 'r5', mine: true, auth: 'JKR', type: 'oil', stage: 0,
      ticket: 'JKR-2026-004281', road: 'Jalan Kuala Kangsar (FT1)', area: 'Tasek',
      ll: [4.6320, 101.1010], submitted: '14 Mar 2026', updated: '14 Mar 2026', confirms: 3,
      note: 'Diesel spill from a lorry, about 20 m long across both lanes.', ref: 'FT1 · before Tasek junction'
    }
  ];

  /* ---------------- starting ticket counters (per authority) ---------------- */
  const TICKET_SEQ = { JKR: 4281, MBI: 932 };

  /* ---------------- ride-mode alert copy per hazard type ----------------
     {d} is filled with the distance, {sev} with the severity, and {nm}
     with the junction / lorry-zone name for the two traffic alerts.      */
  const ALERT_TEXT = {
    pothole:   { title: 'Pothole ahead in {d}',   body: 'Slow down — {sev} risk of losing the front wheel' },
    oil:       { title: 'Oil spill ahead in {d}', body: 'Very low grip — no sudden braking or leaning' },
    gravel:    { title: 'Loose gravel in {d}',    body: 'Ease off and keep the bars straight' },
    flooding:  { title: 'Flooded road in {d}',    body: 'Water over the lane — keep to the crown' },
    lighting:  { title: 'Unlit stretch in {d}',   body: 'Six lamps out — switch to high beam' },
    landslide: { title: 'Landslide zone in {d}',  body: 'Loose rock, one lane closed — single file' },
    fog:       { title: 'Fog in {d}',             body: 'Visibility under 50 m — ride to conditions' },
    junction:  { title: 'Busy junction ahead in {d}', body: 'Watch for turning cars — {nm}' },
    zone:      { title: 'Lorry zone in {d}',          body: 'Stay out of blind spots — {nm}' }
  };

  /* ---------------- fake map geometry (used if tiles can't load) ----------------
     Simple straight-line road skeletons for Ipoh — enough to look like a map.  */
  const FAKE_ROADS = [
    { name: 'Jln Kuala Kangsar', w: 4, ll: [[4.5920, 101.0790], [4.6100, 101.0880], [4.6320, 101.1010], [4.6560, 101.1080], [4.6800, 101.1120], [4.7150, 101.1180]] },
    { name: 'Jln Sultan Azlan Shah', w: 4, ll: [[4.5960, 101.0850], [4.6010, 101.0960], [4.6070, 101.1090], [4.6130, 101.1180], [4.6220, 101.1240], [4.6380, 101.1290]] },
    { name: 'Jln Gopeng FT1', w: 5, ll: [[4.5950, 101.0840], [4.5880, 101.0960], [4.5830, 101.1090], [4.5760, 101.1200], [4.5620, 101.1290], [4.5480, 101.1420], [4.5370, 101.1360], [4.5310, 101.1290]] },
    { name: 'Jln Lahat FT240', w: 4, ll: [[4.6020, 101.0680], [4.5940, 101.0600], [4.5862, 101.0521], [4.5700, 101.0470], [4.5450, 101.0510]] },
    { name: 'Jln Bercham', w: 4, ll: [[4.6130, 101.1180], [4.6220, 101.1240], [4.6290, 101.1210], [4.6350, 101.1232], [4.6420, 101.1270]] },
    { name: 'Jln Menglembu A190', w: 3, ll: [[4.6020, 101.0680], [4.5960, 101.0570], [4.5860, 101.0475], [4.5740, 101.0430]] },
    { name: 'Jln Tambun A13', w: 3, ll: [[4.6070, 101.1230], [4.6125, 101.1308], [4.6180, 101.1340], [4.6300, 101.1440]] },
    { name: 'Jln Raja Permaisuri Bainun', w: 3, ll: [[4.5950, 101.0770], [4.5995, 101.0820], [4.6030, 101.0862], [4.6070, 101.0930]] },
    { name: 'Jln Sultan Idris Shah', w: 2, ll: [[4.5920, 101.0730], [4.5955, 101.0790], [4.5990, 101.0830]] },
    { name: 'Jln Tasek', w: 3, ll: [[4.6320, 101.1010], [4.6270, 101.0960], [4.6200, 101.0910]] },
    { name: 'Lebuh Meru Raya', w: 3, ll: [[4.6650, 101.1080], [4.6500, 101.1130], [4.6400, 101.1160], [4.6300, 101.1130]] },
    { name: 'Jln Pasir Puteh', w: 3, ll: [[4.5461, 101.0687], [4.5560, 101.0778], [4.5660, 101.0890], [4.5760, 101.1000], [4.5830, 101.1090]] },
    { name: 'Jln Raja Musa Mahadi', w: 2, ll: [[4.5830, 101.1090], [4.5868, 101.1186], [4.5892, 101.1232]] }
  ];

  const FAKE_WATER = { name: 'Sungai Kinta', ll: [[4.5700, 101.0690], [4.5850, 101.0770], [4.6000, 101.0815], [4.6150, 101.0890], [4.6320, 101.1015], [4.6500, 101.1140], [4.6700, 101.1260]] };

  const FAKE_AREAS = [
    { n: 'Ipoh', ll: [4.5975, 101.0901], big: true },
    { n: 'Old Town', ll: [4.5945, 101.0760] },
    { n: 'Greentown', ll: [4.6040, 101.0880] },
    { n: 'Ipoh Garden', ll: [4.6095, 101.1130] },
    { n: 'Bercham', ll: [4.6345, 101.1240] },
    { n: 'Tasek', ll: [4.6330, 101.0995] },
    { n: 'Chemor', ll: [4.6960, 101.1160] },
    { n: 'Falim', ll: [4.6010, 101.0660] },
    { n: 'Menglembu', ll: [4.5855, 101.0485] },
    { n: 'Gunung Rapat', ll: [4.5835, 101.1085] },
    { n: 'Tambun', ll: [4.6190, 101.1345] },
    { n: 'Simpang Pulai', ll: [4.5335, 101.1310] },
    { n: 'Meru Raya', ll: [4.6650, 101.1080] },
    { n: 'Station 18', ll: [4.5470, 101.0700] },
    { n: 'Taman Cempaka', ll: [4.5905, 101.1245] }
  ];

  /* ---------------- helpers ---------------- */
  const TYPE_MAP = {};
  HAZARD_TYPES.forEach(function (t) { TYPE_MAP[t.id] = t; });

  function type(id) { return TYPE_MAP[id] || HAZARD_TYPES[0]; }
  function hazard(id) {
    for (let i = 0; i < HAZARDS.length; i++) if (HAZARDS[i].id === id) return HAZARDS[i];
    return null;
  }
  function dest(id) {
    for (let i = 0; i < DESTINATIONS.length; i++) if (DESTINATIONS[i].id === id) return DESTINATIONS[i];
    return DESTINATIONS[0];
  }
  function authority(id) { return AUTHORITIES[id] || AUTHORITIES.JKR; }
  function roadAuthority(name) {
    const clean = String(name || '').replace(/\s*\(.*\)\s*/, '').trim().toLowerCase();
    for (let i = 0; i < ROADS.length; i++) {
      const r = ROADS[i], rn = r.name.replace(/\s*\(.*\)\s*/, '').trim().toLowerCase();
      if (rn === clean || clean.indexOf(rn) === 0 || rn.indexOf(clean) === 0) return r.authority;
    }
    return /\(ft|\(a\d/.test(name || '') ? 'JKR' : 'MBI';
  }
  function nextTicket(auth) {
    const seq = TICKET_SEQ[auth] || 1;
    TICKET_SEQ[auth] = seq + 1;
    const pad = auth === 'JKR' ? 6 : 6;
    return auth + '-2026-' + String(seq + 1).padStart(pad, '0');
  }
  function stageLabel(i) { return STAGES[i] || STAGES[0]; }

  /* ---------------- traffic-risk helpers ---------------- */
  /* A pothole hurts a rider more often than a slow junction, so road
     condition carries 60% of the overall safety score, traffic 40%. */
  const SCORE_ROAD_W = 0.6, SCORE_TRAFFIC_W = 0.4;

  function combineScore(road, traffic) {
    const r = Number(road) || 0, t = Number(traffic) || 0;
    return Math.round((SCORE_ROAD_W * r + SCORE_TRAFFIC_W * t) * 10) / 10;
  }

  function plural(n, one, many) { n = Number(n) || 0; return n + ' ' + (n === 1 ? one : many); }

  /* "3 dangerous junctions · 1 heavy-vehicle road" — used on the route cards */
  function trafficLine(nJunctions, nZones) {
    return plural(nJunctions, 'dangerous junction', 'dangerous junctions') + ' · ' +
      (nZones ? plural(nZones, 'heavy-vehicle road', 'heavy-vehicle roads') : 'no heavy-vehicle roads');
  }

  function junction(id) {
    for (let i = 0; i < DANGEROUS_JUNCTIONS.length; i++) if (DANGEROUS_JUNCTIONS[i].id === id) return DANGEROUS_JUNCTIONS[i];
    return null;
  }
  function lorryZone(id) {
    for (let i = 0; i < LORRY_ZONES.length; i++) if (LORRY_ZONES[i].id === id) return LORRY_ZONES[i];
    return null;
  }
  function timeInfo(id) {
    for (let i = 0; i < TIMES.length; i++) if (TIMES[i].id === id) return TIMES[i];
    return TIMES[0];
  }

  SR.ICONS = ICONS;
  SR.HAZARD_TYPES = HAZARD_TYPES;
  SR.AUTHORITIES = AUTHORITIES;
  SR.ROADS = ROADS;
  SR.HAZARDS = HAZARDS;
  SR.DESTINATIONS = DESTINATIONS;
  SR.DANGEROUS_JUNCTIONS = DANGEROUS_JUNCTIONS;
  SR.LORRY_ZONES = LORRY_ZONES;
  SR.TIMES = TIMES;
  SR.STAGES = STAGES;
  SR.SAMPLE_REPORTS = SAMPLE_REPORTS;
  SR.ALERT_TEXT = ALERT_TEXT;
  SR.FAKE_ROADS = FAKE_ROADS;
  SR.FAKE_WATER = FAKE_WATER;
  SR.FAKE_AREAS = FAKE_AREAS;
  SR.type = type;
  SR.hazard = hazard;
  SR.dest = dest;
  SR.authority = authority;
  SR.roadAuthority = roadAuthority;
  SR.nextTicket = nextTicket;
  SR.stageLabel = stageLabel;
  SR.junction = junction;
  SR.lorryZone = lorryZone;
  SR.timeInfo = timeInfo;
  SR.combineScore = combineScore;
  SR.plural = plural;
  SR.trafficLine = trafficLine;
})();
