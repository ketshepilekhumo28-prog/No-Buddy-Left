/* BAC Inclusive Campus Companion - demo script. Vanilla JS, no dependencies.
   All data below is FICTIONAL. Replace CAMPUSES with verified BAC data. */
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const say = t => { $("#live").textContent = ""; setTimeout(() => $("#live").textContent = t, 50); };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- DATA (fictional placeholders) ---------- */
// confidence: "demo" = fictional. Real data should use "verified", "reported", "outdated" or "unknown".
const CAMPUSES = {
  main: { name: "Main Campus (demo)", places: [
    { id: "gateA", name: "Sample Gate A", type: "Entrance", x: 40, y: 250 },
    { id: "blockA", name: "Sample Block A", type: "Classrooms", x: 150, y: 150 },
    { id: "lib", name: "Sample Library", type: "Library", x: 300, y: 80 },
    { id: "cafe", name: "Sample Food Court", type: "Food vendors", x: 280, y: 220 },
    { id: "pick", name: "Sample Transport Pickup", type: "Transport", x: 60, y: 60 } ],
    routes: [
      { from: "gateA", to: "blockA", tags: ["stepfree"], steps: ["Enter Sample Gate A.", "Follow the main path towards Block A.", "Block A entrance is on your left."], note: "Surface, gradient and door width not checked." },
      { from: "gateA", to: "lib", tags: ["stepfree", "ramp", "landmarks"], steps: ["Enter Sample Gate A.", "Pass the notice board on your right.", "Use the ramp beside the steps.", "Library is straight ahead."], note: "Ramp details not measured." } ] },
  new: { name: "New Campus (demo)", places: [
    { id: "gateB", name: "Sample Gate B", type: "Entrance", x: 200, y: 270 },
    { id: "hall", name: "Sample Lecture Hall", type: "Classrooms", x: 120, y: 120 },
    { id: "wc", name: "Sample Bathrooms", type: "Bathrooms", x: 280, y: 140 },
    { id: "vend", name: "Sample Vending Area", type: "Vending machines", x: 330, y: 230 },
    { id: "cross", name: "Sample Pedestrian Crossing", type: "Crossing", x: 60, y: 230 } ],
    routes: [
      { from: "gateB", to: "hall", tags: ["landmarks"], steps: ["Enter Sample Gate B.", "Walk past the vending area.", "Turn left at the crossing marker."], note: "No step-free information available yet." } ] }
};
const CONF = { demo: "Demo data (fictional)", unknown: "Not yet available" };
const ACTS = ["Getting to a classroom", "Bathrooms", "Library", "Food vendors", "Vending machines", "Road crossing", "Transport pickup", "Accessible entrances", "Building navigation", "Events"];
const EVENTS = [
  { t: "Accessibility Awareness Week (sample)", c: "Awareness", d: "Date to be confirmed", l: "Venue to be confirmed", a: "Access details to be confirmed" },
  { t: "Disability etiquette workshop (sample)", c: "Workshop", d: "Date to be confirmed", l: "Venue to be confirmed", a: "Step-free venue and captions wanted" },
  { t: "Inclusive games day (sample)", c: "Sport", d: "Date to be confirmed", l: "Venue to be confirmed", a: "Mixed-ability activities" },
  { t: "Assistive technology showcase (sample)", c: "Technology", d: "Date to be confirmed", l: "Venue to be confirmed", a: "Screen-reader demos" } ];

/* ---------- STATE (in memory only; no sensitive data is persisted) ---------- */
const S = { campus: "main", user: null, req: null, vols: [
  { name: "Volunteer A (sample)", campus: "main", acts: ACTS, on: true }, { name: "Volunteer B (sample)", campus: "new", acts: ACTS.slice(0, 5), on: true },
  { name: "Volunteer C (sample)", campus: "both", acts: ACTS.slice(2), on: false } ],
  me: null, reports: [], events: new Set(), routes: [], zoom: { x: 0, y: 0, w: 400, h: 300 } };

/* ---------- PREFERENCES (non-sensitive, saved in localStorage) ---------- */
const prefs = (() => { try { return JSON.parse(localStorage.getItem("bac-prefs")) || {}; } catch (e) { return {}; } })();
function applyPrefs() {
  const r = document.documentElement;
  ["large", "contrast", "calm", "dyslexia", "dark", "lowdata"].forEach(k => r.classList.toggle(k, !!prefs[k]));
  document.body.classList.toggle("lowdata", !!prefs.lowdata);
  $$("[data-pref]").forEach(b => b.checked = !!prefs[b.dataset.pref]);
}
$$("[data-pref]").forEach(b => b.addEventListener("change", () => {
  prefs[b.dataset.pref] = b.checked; applyPrefs();
  try { localStorage.setItem("bac-prefs", JSON.stringify(prefs)); } catch (e) { /* storage blocked: settings still apply this session */ }
}));
["#prefsBtn", "#prefsBtn2"].forEach(i => $(i).addEventListener("click", () => $("#prefs").showModal()));
$("#menuBtn").addEventListener("click", e => { const o = $("#nav").classList.toggle("open"); e.target.setAttribute("aria-expanded", o); });

/* ---------- CAMPUS + MAP ---------- */
function setCampus(c) {
  S.campus = c; S.zoom = { x: 0, y: 0, w: 400, h: 300 };
  $$("[data-campus]").forEach(b => b.setAttribute("aria-pressed", b.dataset.campus === c));
  $("#campusNow").textContent = "Showing: " + CAMPUSES[c].name;
  $("#rCampus").value = c;
  const opts = CAMPUSES[c].places.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  $("#from").innerHTML = opts; $("#to").innerHTML = opts;
  $("#to").selectedIndex = 1;
  drawMap(); drawList();
  $("#directions").innerHTML = '<p class="note">Choose a start and destination, then select Find route.</p>';
}
function drawMap(hl = []) {
  const svg = $("#map"), P = CAMPUSES[S.campus].places;
  let h = `<title id="mapT">${esc(CAMPUSES[S.campus].name)}. Fictional sample map. A text list follows.</title><rect width="400" height="300" fill="none"/>`;
  if (hl.length === 2) { const a = P.find(p => p.id === hl[0]), b = P.find(p => p.id === hl[1]); h += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="var(--lagoon)" stroke-width="5" stroke-dasharray="10 6"/>`; }
  P.forEach(p => h += `<g class="pl" tabindex="0" role="button" aria-label="${esc(p.name)}, ${esc(p.type)}. Set as destination" data-id="${p.id}"><rect x="${p.x - 14}" y="${p.y - 14}" width="28" height="28" rx="6" fill="var(--sun)" stroke="var(--ink)" stroke-width="2"/><text x="${p.x}" y="${p.y + 4}" text-anchor="middle">${esc(p.type[0])}</text><text x="${p.x}" y="${p.y + 28}" text-anchor="middle">${esc(p.name.replace("Sample ", ""))}</text></g>`);
  svg.innerHTML = h;
  const z = S.zoom; svg.setAttribute("viewBox", `${z.x} ${z.y} ${z.w} ${z.h}`);
  $$(".pl", svg).forEach(g => { const pick = () => { $("#to").value = g.dataset.id; say("Destination set to " + $("#to").selectedOptions[0].text); };
    g.addEventListener("click", pick); g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }); });
}
function zoom(f) { const z = S.zoom, cx = z.x + z.w / 2, cy = z.y + z.h / 2; z.w = Math.min(400, Math.max(100, z.w * f)); z.h = z.w * .75; z.x = Math.max(0, Math.min(400 - z.w, cx - z.w / 2)); z.y = Math.max(0, Math.min(300 - z.h, cy - z.h / 2)); drawMap(); }
function pan(dx, dy) { const z = S.zoom; z.x = Math.max(0, Math.min(400 - z.w, z.x + dx * z.w)); z.y = Math.max(0, Math.min(300 - z.h, z.y + dy * z.h)); drawMap(); }
$("#zin").onclick = () => zoom(.7); $("#zout").onclick = () => zoom(1.4); $("#zr").onclick = () => { S.zoom = { x: 0, y: 0, w: 400, h: 300 }; drawMap(); };
$("#pl").onclick = () => pan(-.25, 0); $("#pr").onclick = () => pan(.25, 0); $("#pu").onclick = () => pan(0, -.25); $("#pd").onclick = () => pan(0, .25);

function drawList() {
  const q = $("#placeSearch").value.toLowerCase();
  const L = CAMPUSES[S.campus].places.filter(p => (p.name + p.type).toLowerCase().includes(q));
  $("#placeList").innerHTML = L.length ? L.map(p => `<li class="card"><h4>${esc(p.name)}</h4><p>${esc(p.type)}</p><p><span class="tag demo">${CONF.demo}</span></p><p class="note">Accessibility details: ${CONF.unknown}.</p></li>`).join("") : '<li class="note">No places match your search. Try a different word.</li>';
}
$("#placeSearch").addEventListener("input", drawList);
$$("[data-campus]").forEach(b => b.addEventListener("click", () => setCampus(b.dataset.campus)));

/* ---------- ROUTE FINDER ---------- */
$("#routeForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = $("#from").value, t = $("#to").value, need = $$("[name=need]:checked").map(x => x.value), box = $("#directions");
  if (f === t) { box.innerHTML = '<p class="err">Start and destination are the same. Choose a different destination.</p>'; return; }
  const r = CAMPUSES[S.campus].routes.find(r => r.from === f && r.to === t);
  if (!r) { box.innerHTML = `<p><strong>No route information available yet</strong> for this pair. Accessibility is <em>unknown</em>. Ask BAC support or request a Campus Buddy.</p>`; drawMap([f, t]); return; }
  const missing = need.filter(n => !r.tags.includes(n) || n === "wheelchair");
  let msg = missing.length ? `<p class="err">No information confirms: ${missing.join(", ")}. Treat this route as unconfirmed.</p>` : '<p>Sample data lists these features, but nothing here is verified.</p>';
  if (need.includes("wheelchair")) msg += "<p>Wheelchair access needs measured gradients, doors and surfaces. This demo has none.</p>";
  box.innerHTML = `<p><span class="tag demo">${CONF.demo}</span> Difficulty: unknown</p>${msg}<ol>${r.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol><p class="note">${esc(r.note)}</p>`;
  drawMap([f, t]); S.routes.unshift($("#from").selectedOptions[0].text + " to " + $("#to").selectedOptions[0].text); updateDash();
});

/* ---------- REPORTS (demo only, never sent) ---------- */
const rep = $("#rep");
function openReport(type) { if (type) $("#repType").value = type; $("#repE").textContent = ""; rep.showModal(); $("#repText").focus(); }
["#reportBtn", "#repBtn2"].forEach(i => $(i).onclick = () => openReport());
$("#safetyBtn").onclick = () => openReport("Inappropriate interaction");
$("#repCancel").onclick = () => rep.close();
$("#repForm").addEventListener("submit", e => {
  e.preventDefault(); const t = $("#repText").value.trim();
  if (!t) { $("#repE").textContent = "Please describe where and what happened."; return; }
  S.reports.push({ type: $("#repType").value, text: t, campus: CAMPUSES[S.campus].name });
  $("#repText").value = ""; rep.close(); drawReports(); say("Report saved in demo mode only. It was not sent to anyone.");
});
function drawReports() {
  $("#reportList").innerHTML = S.reports.length ? S.reports.map(r => `<li><strong>${esc(r.type)}</strong> (${esc(r.campus)}): ${esc(r.text)} <span class="tag demo">Submitted in demo mode, not sent</span></li>`).join("") : '<li class="note">No reports yet.</li>';
}

/* ---------- CAMPUS BUDDY: request flow ---------- */
const STAGES = ["Looking for a volunteer", "Offer received", "Accepted", "Completed"];
function field(id, errId, msg) { const bad = !$(id).value.trim(); $(errId).textContent = bad ? msg : ""; return !bad; }
$("#reqForm").addEventListener("submit", e => {
  e.preventDefault();
  const ok = [field("#rType", "#rTypeE", "Choose the help you need."), field("#rFrom", "#rFromE", "Enter a start location."), field("#rTo", "#rToE", "Enter a destination.")].every(Boolean);
  if (!ok) return;
  S.req = { campus: $("#rCampus").value, type: $("#rType").value, from: $("#rFrom").value.trim(), to: $("#rTo").value.trim(), urgent: $("#rUrg").value, stage: 0, cancelled: false, vol: null, declined: [] };
  drawReq(); updateDash();
});
function matches() { const r = S.req; return S.vols.filter(v => v.on && (v.campus === r.campus || v.campus === "both") && !r.declined.includes(v)); }
function drawReq() {
  const r = S.req, p = $("#reqPanel"); if (!r) { p.innerHTML = ""; return; }
  let h = `<div class="card"><h3>Your request: ${esc(r.type)}</h3><p>${esc(r.from)} to ${esc(r.to)} (${esc(r.urgent)}). Visible only to you and volunteers you accept.</p>`;
  h += `<ol class="prog" aria-label="Request status">${STAGES.map((s, i) => `<li class="${!r.cancelled && i <= r.stage ? "on" : ""}"${i === r.stage && !r.cancelled ? ' aria-current="step"' : ""}>${s}</li>`).join("")}</ol>`;
  if (r.cancelled) h += `<p><strong>Cancelled.</strong> No problem. You can make a new request any time.</p>`;
  else if (r.stage === 0) { const m = matches();
    h += m.length ? `<p>${m.length} sample volunteer(s) match. In a real service they would be notified and decide for themselves.</p><button class="btn" id="simOffer">Simulate a volunteer offer</button>` : `<p>No volunteer is available right now. That's okay. Try another time, or contact <strong>[BAC support office: to be supplied]</strong>.</p>`;
    h += ` <button class="btn" id="cancelReq">Cancel request</button>`; }
  else if (r.stage === 1) h += `<p><strong>${esc(r.vol.name)}</strong> offered to help. Contact details stay hidden until you accept.</p><button class="btn primary" id="accOffer">Accept this volunteer</button> <button class="btn" id="decOffer">Decline, find another</button> <button class="btn" id="cancelReq">Cancel request</button>`;
  else if (r.stage === 2) h += `<p>Accepted with ${esc(r.vol.name)}. Both people consent to share only what is needed to meet. Demo: no messages are really sent.</p><button class="btn primary" id="doneReq">Mark completed</button> <button class="btn" id="cancelReq">Cancel</button> <button class="btn" id="blockV">Report or avoid this volunteer</button>`;
  else h += `<p>Completed. Thank you!</p>`;
  p.innerHTML = h + "</div>";
  const on = (id, fn) => { const b = $(id); if (b) b.onclick = () => { fn(); drawReq(); updateDash(); say("Status updated"); }; };
  on("#simOffer", () => { r.vol = matches()[0]; r.stage = 1; });
  on("#accOffer", () => r.stage = 2);
  on("#decOffer", () => { r.declined.push(r.vol); r.vol = null; r.stage = 0; });
  on("#doneReq", () => r.stage = 3);
  on("#cancelReq", () => { if (confirm("Cancel this request?")) r.cancelled = true; });
  const bk = $("#blockV"); if (bk) bk.onclick = () => openReport("Inappropriate interaction");
}

/* ---------- VOLUNTEER ---------- */
$("#volActs").innerHTML = ACTS.map((a, i) => `<label class="chk"><input type="checkbox" name="act" value="${a}" ${i < 3 ? "checked" : ""}> ${a}</label>`).join("");
$("#volForm").addEventListener("submit", e => {
  e.preventDefault(); const acts = $$("[name=act]:checked").map(x => x.value);
  if (!acts.length) { $("#volMsg").textContent = "Choose at least one activity, or select Withdraw."; return; }
  S.vols = S.vols.filter(v => v !== S.me);
  S.me = { name: "You (demo)", campus: $("#vCampus").value, acts, on: $("#vOn").checked };
  S.vols.push(S.me); $("#volMsg").textContent = "Saved in this browser only. You can change or withdraw any time. You can decline any request."; updateDash(); if (S.req) drawReq();
});
$("#vWithdraw").onclick = () => { S.vols = S.vols.filter(v => v !== S.me); S.me = null; $("#volMsg").textContent = "You have withdrawn. You will not receive requests."; updateDash(); };

/* ---------- EVENTS ---------- */
function drawEvents() {
  const c = $("#evCat").value;
  $("#evList").innerHTML = EVENTS.filter(e => c === "all" || e.c === c).map((e, i) => `<li class="card"><h4>${esc(e.t)}</h4><p><span class="tag demo">Sample</span> ${esc(e.c)}</p><p>${esc(e.d)}<br>${esc(e.l)}<br>${esc(e.a)}</p><button class="btn" data-ev="${i}" aria-pressed="${S.events.has(i)}">${S.events.has(i) ? "Cancel interest" : "Register interest (demo)"}</button></li>`).join("");
  $$("[data-ev]").forEach(b => b.onclick = () => { const i = +b.dataset.ev; S.events.has(i) ? S.events.delete(i) : S.events.add(i); drawEvents(); updateDash(); say("Interest updated in demo only"); });
}
$("#evCat").onchange = drawEvents;
$("#fbForm").addEventListener("submit", e => { e.preventDefault(); const ok = $("#fbText").value.trim();
  $("#fbE").textContent = ok ? "" : "Write your suggestion first."; if (ok) { $("#fbMsg").textContent = "Thanks. In demo mode this stays in your browser and is not sent."; $("#fbText").value = ""; } });

/* ---------- DEMO LOGIN + DASHBOARD ---------- */
$("#loginForm").addEventListener("submit", e => {
  e.preventDefault(); const v = $("#lEmail").value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { $("#lEmailE").textContent = "Enter a valid email address, like name@example.com."; return; }
  $("#lEmailE").textContent = ""; S.user = { name: v.split("@")[0] }; // email is NOT stored and NOT treated as proof of BAC enrolment
  $("#lEmail").value = ""; updateDash(); say("Demo session started. Not verified.");
});
$("#signOut").onclick = () => { S.user = null; updateDash(); };
$("#delBtn").onclick = () => { if (confirm("Clear all demo data from this tab?")) { S.req = null; S.reports = []; S.events.clear(); S.routes = []; S.me = null; drawReq(); drawReports(); drawEvents(); updateDash(); } };
function updateDash() {
  $("#dash").hidden = !S.user; $("#loginForm").hidden = !!S.user; if (!S.user) return;
  $("#welcome").textContent = "Welcome, " + S.user.name;
  $("#dReq").textContent = S.req ? `${S.req.type}: ${S.req.cancelled ? "Cancelled" : STAGES[S.req.stage]}` : "None yet. Use Campus Buddy to ask.";
  $("#dVol").textContent = S.me ? (S.me.on ? "Available (demo)" : "Registered, currently unavailable") : "Not registered.";
  $("#dEv").textContent = S.events.size ? [...S.events].map(i => EVENTS[i].t).join("; ") : "None yet.";
  $("#dRoutes").textContent = S.routes.slice(0, 3).join("; ") || "None yet.";
}

/* ---------- INIT ---------- */
applyPrefs(); setCampus("main"); drawEvents(); drawReports();
