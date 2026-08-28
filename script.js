const SVG_NS = "http://www.w3.org/2000/svg";
const HOUR_TICKS = 24;
const MINOR_PER_HOUR = 3;

function polar(r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: r * Math.sin(rad), y: -r * Math.cos(rad) };
}

function buildDial() {
  const ticks = document.getElementById("ticks");
  for (let i = 0; i < HOUR_TICKS; i++) {
    const a = i * 15;
    const p1 = polar(90, a);
    const p2 = polar(96, a);
    const major = document.createElementNS(SVG_NS, "line");
    major.setAttribute("x1", p1.x);
    major.setAttribute("y1", p1.y);
    major.setAttribute("x2", p2.x);
    major.setAttribute("y2", p2.y);
    major.setAttribute("class", "major");
    ticks.appendChild(major);

    for (let j = 1; j <= MINOR_PER_HOUR; j++) {
      const a2 = a + j * 3.75;
      const m1 = polar(92.5, a2);
      const m2 = polar(96, a2);
      const minor = document.createElementNS(SVG_NS, "line");
      minor.setAttribute("x1", m1.x);
      minor.setAttribute("y1", m1.y);
      minor.setAttribute("x2", m2.x);
      minor.setAttribute("y2", m2.y);
      minor.setAttribute("class", "minor");
      ticks.appendChild(minor);
    }
  }

  const labels = document.getElementById("labels");
  const labelEls = [];
  for (let h = 0; h < 24; h++) {
    const p = polar(73, h * 15);
    const t = document.createElementNS(SVG_NS, "text");
    t.setAttribute("x", p.x);
    t.setAttribute("y", p.y);
    t.textContent = String(h);
    labels.appendChild(t);
    labelEls.push(t);
  }

  for (let m = 5; m <= 60; m += 5) {
    const p = polar(84, m * 6);
    const t = document.createElementNS(SVG_NS, "text");
    t.setAttribute("x", p.x);
    t.setAttribute("y", p.y);
    t.setAttribute("class", "minute");
    t.textContent = String(m === 60 ? 60 : m);
    labels.appendChild(t);
  }
  return labelEls;
}

function parseHM(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function offsetMinutes(tz, date) {
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const name = !tz || /^local$/i.test(tz) ? localTz : tz;
  const m = /^(?:UTC|GMT)?([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(String(name).trim());
  if (m) {
    const h = Number(m[2]);
    const min = Number(m[3] ?? 0);
    return (m[1] === "+" ? 1 : -1) * (h * 60 + min);
  }
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: name,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = {};
    for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
    const asUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    return Math.round((asUTC - date.getTime()) / 60000);
  } catch {
    return NaN;
  }
}

function arcPath(rIn, rOut, a1, a2) {
  const large = a2 - a1 > 180 ? 1 : 0;
  const o1 = polar(rOut, a1);
  const o2 = polar(rOut, a2);
  const i1 = polar(rIn, a1);
  const i2 = polar(rIn, a2);
  return `M ${o1.x.toFixed(3)} ${o1.y.toFixed(3)} A ${rOut} ${rOut} 0 ${large} 1 ${o2.x.toFixed(3)} ${o2.y.toFixed(3)} L ${i2.x.toFixed(3)} ${i2.y.toFixed(3)} A ${rIn} ${rIn} 0 ${large} 0 ${i1.x.toFixed(3)} ${i1.y.toFixed(3)} Z`;
}

function buildRanges(config) {
  const g = document.getElementById("ranges");
  for (const r of config.ranges ?? []) {
    const start = parseHM(r.start);
    const end = parseHM(r.end);
    if (start === null || end === null) {
      console.warn(`Invalid range: "${r.start}" - "${r.end}"`);
      continue;
    }
    const color = r.color ?? "#ffb347";
    const date = new Date();
    const shift = offsetMinutes(selectedZone, date) - offsetMinutes(r.timezone, date);
    if (Number.isNaN(shift)) {
      console.warn(`Invalid timezone: "${r.timezone}"`);
      continue;
    }
    let a1 = (((start + shift) * 0.25) % 360 + 360) % 360;
    let a2 = ((end + shift) * 0.25) % 360;
    if (a2 <= a1) a2 += 360;
    const segs = a2 > 360 ? [[a1, 360], [0, a2 - 360]] : [[a1, a2]];
    for (const [s, e] of segs) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", arcPath(38, 97, s, e));
      path.setAttribute("class", "range-wedge");
      path.setAttribute("fill", color);
      path.setAttribute("stroke", color);
      path.dataset.label = r.label;
      path.addEventListener("mouseenter", showTooltip);
      path.addEventListener("mousemove", moveTooltip);
      path.addEventListener("mouseleave", hideTooltip);
      g.appendChild(path);
    }
  }
}

const tooltip = document.getElementById("tooltip");

function showTooltip(ev) {
  tooltip.textContent = ev.currentTarget.dataset.label;
  moveTooltip(ev);
  tooltip.classList.add("visible");
}

function moveTooltip(ev) {
  const pad = 14;
  let x = ev.clientX + pad;
  let y = ev.clientY + pad;
  const rect = tooltip.getBoundingClientRect();
  if (x + rect.width > window.innerWidth) x = ev.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight) y = ev.clientY - rect.height - pad;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideTooltip() {
  tooltip.classList.remove("visible");
}

async function loadConfig() {
  try {
    const res = await fetch("config.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    const el = document.getElementById("clock-config");
    return JSON.parse(el.textContent);
  }
}

let config = null;

function renderRanges() {
  document.getElementById("ranges").replaceChildren();
  buildRanges(config);
}

function buildInnerDial() {
  const g = document.getElementById("innerTicks");
  for (let i = 0; i < 60; i++) {
    const a = i * 6;
    const major = i % 5 === 0;
    const p1 = polar(major ? 15.5 : 17, a);
    const p2 = polar(17.8, a);
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", p1.x);
    line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x);
    line.setAttribute("y2", p2.y);
    line.setAttribute("class", major ? "major" : "minor");
    g.appendChild(line);
  }
}

const dateText = document.getElementById("date").querySelector(".date-text");
const timeText = document.getElementById("date").querySelector(".time-text");
let lastDateTime = "";

const hourHand = document.getElementById("hourHand");
const minuteHand = document.getElementById("minuteHand");
const innerHour = document.getElementById("innerHour");
const innerMinute = document.getElementById("innerMinute");
const innerSecond = document.getElementById("innerSecond");

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const TZ_OPTIONS = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Atlantic/Azores",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Athens",
  "Europe/Moscow",
  "Africa/Lagos",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];
let selectedZone = "local";

let offsetCache = { bucket: -1, local: 0, zone: 0 };

function getOffsets(now) {
  const bucket = Math.floor(now.getTime() / 60000);
  if (bucket !== offsetCache.bucket) {
    offsetCache = {
      bucket,
      local: offsetMinutes("local", now),
      zone: offsetMinutes(selectedZone, now),
    };
  }
  return offsetCache;
}

function buildTimezoneSelect() {
  const sel = document.getElementById("tz-select");
  const local = document.createElement("option");
  local.value = "local";
  local.textContent = `Local (${LOCAL_TZ})`;
  sel.appendChild(local);
  for (const tz of TZ_OPTIONS) {
    const o = document.createElement("option");
    o.value = tz;
    o.textContent = tz.replace(/_/g, " ");
    sel.appendChild(o);
  }
  try {
    const saved = localStorage.getItem("clock.tz");
    if (saved && (saved === "local" || TZ_OPTIONS.includes(saved))) sel.value = saved;
  } catch {}
  selectedZone = sel.value;
  sel.addEventListener("change", () => {
    selectedZone = sel.value;
    offsetCache.bucket = -1;
    try {
      localStorage.setItem("clock.tz", selectedZone);
    } catch {}
    renderRanges();
  });
}

const reloadBtn = document.getElementById("cfg-reload");

reloadBtn.addEventListener("click", async () => {
  const c = await loadConfig();
  config = c;
  renderRanges();
  reloadBtn.classList.add("flash");
  setTimeout(() => reloadBtn.classList.remove("flash"), 500);
});

function updateDateTime(now) {
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const da = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const s = `${y}-${mo}-${da}|${hh}:${mm}:${ss}`;
  if (s !== lastDateTime) {
    lastDateTime = s;
    dateText.textContent = `${y}-${mo}-${da}`;
    timeText.textContent = `${hh}:${mm}:${ss}`;
  }
}

function tick(now) {
  const { local, zone } = getOffsets(now);
  const display = new Date(now.getTime() + (zone - local) * 60000);
  const ms = display.getMilliseconds();
  const s = display.getSeconds() + ms / 1000;
  const m = display.getMinutes() + s / 60;
  const h = display.getHours() + m / 60;

  updateDateTime(display);

  hourHand.style.transform = `rotate(${(h % 24) * 15}deg)`;
  minuteHand.style.transform = `rotate(${m * 6}deg)`;
  innerHour.style.transform = `rotate(${(h % 12) * 30}deg)`;
  innerMinute.style.transform = `rotate(${m * 6}deg)`;
  innerSecond.style.transform = `rotate(${s * 6}deg)`;

  const activeHour = display.getHours();
  labelEls.forEach((el, i) => el.classList.toggle("active", i === activeHour));
}

const labelEls = buildDial();
buildInnerDial();
buildTimezoneSelect();
let rafId;

function frame() {
  tick(new Date());
  rafId = requestAnimationFrame(frame);
}

frame();
loadConfig().then((c) => {
  config = c;
  renderRanges();
});
document.addEventListener("visibilitychange", () => {
  cancelAnimationFrame(rafId);
  if (!document.hidden) frame();
});
