const firebaseConfig = {
  apiKey: "AIzaSyBAFSNhMWbMXUPR10b8ynjiKD8tVRK6tQ8",
  authDomain: "wlc-talent-show-sms.firebaseapp.com",
  projectId: "wlc-talent-show-sms",
  storageBucket: "wlc-talent-show-sms.firebasestorage.app",
  messagingSenderId: "941916915658",
  appId: "1:941916915658:web:06e04e1ace6a640d237133",
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  collection,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SHOW_ID = "main";
const PLAN_WITH_INTERMISSION = "withIntermission";
const PLAN_SKIP_INTERMISSION = "skipIntermission";
const PLAN_LINEAR = "linear";
const DEFAULT_PLAN = PLAN_WITH_INTERMISSION;
const DEFAULT_TARGET_RUNTIME_SECONDS = 10450;
const DEFAULT_SAFETY_BUFFER_MINUTES = 3;
const OFFSET_STATUS_THRESHOLD_SECONDS = 180;
const SETUP_TYPE_OPTIONS = ["DANCE", "ACTING", "SINGING", "EMCEE", "MC", "INTERMISSION", "CONCLUSION", "SETUP", "OTHER"];
const THEME_STORAGE_KEY = "wlcsms-theme";
const SIDEBAR_STORAGE_KEY = "sms-sidebar-collapsed";
const XLSX_CDN_URL = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
const DEFAULT_SETTINGS = {
  displayProfiles: {
    operator: { widthPx: 1920, heightPx: 1080, aspectRatio: "16:9", scalingMode: "Fill", zoomPercent: 100, fontScalePercent: 100, density: "Compact", safeAreaMarginPx: 40, orientation: "Landscape" },
    performer: { widthPx: 1920, heightPx: 1080, aspectRatio: "16:9", scalingMode: "Fit", zoomPercent: 100, fontScalePercent: 100, density: "Comfortable", safeAreaMarginPx: 40, orientation: "Landscape" },
    confidence: { widthPx: 3840, heightPx: 2160, aspectRatio: "16:9", scalingMode: "Fill", zoomPercent: 100, fontScalePercent: 100, density: "Large", safeAreaMarginPx: 60, orientation: "Landscape" },
  },
  themeAppearance: { defaultTheme: "Dark", density: "Compact", accentColor: "Stratford Blue", autoFitContent: true },
  accessibility: { fontScalePercent: 100, highContrast: false, reducedMotion: false, focusIndicators: true, colorBlindMode: "Off" },
  syncRefresh: { autoRefresh: true, refreshIntervalSeconds: 5, timeSyncSource: "NTP (time.stratfordmeridian.com)", syncOnStartup: true, detectNetworkChanges: true },
  notifications: { desktopNotifications: true, soundAlerts: "Chimes", criticalAlerts: "Always", toastDurationSeconds: 5, doNotDisturb: false },
  defaults: { defaultLandingPage: "Operator", defaultOperatorTab: "Live Control", confirmBeforeActions: true, clearCompletedAfter: "After 24 hours", exportFormat: "PDF" },
  systemMode: { kioskMode: false, lockUiInKiosk: false, idleTimeoutMinutes: 30, autoStartOnBoot: false, logLevel: "Information" },
  visibility: { showIntermissionStatusBanner: true },
};
const DISPLAY_PRESETS = {
  laptop: { widthPx: 1920, heightPx: 1080, aspectRatio: "16:9", scalingMode: "Fit", zoomPercent: 100, fontScalePercent: 100, density: "Compact", safeAreaMarginPx: 32, orientation: "Landscape" },
  tv: { widthPx: 3840, heightPx: 2160, aspectRatio: "16:9", scalingMode: "Fill", zoomPercent: 100, fontScalePercent: 110, density: "Large", safeAreaMarginPx: 60, orientation: "Landscape" },
  projector1080: { widthPx: 1920, heightPx: 1080, aspectRatio: "16:9", scalingMode: "Contain", zoomPercent: 95, fontScalePercent: 105, density: "Comfortable", safeAreaMarginPx: 64, orientation: "Landscape" },
  projector800: { widthPx: 1280, heightPx: 800, aspectRatio: "16:10", scalingMode: "Contain", zoomPercent: 90, fontScalePercent: 105, density: "Compact", safeAreaMarginPx: 56, orientation: "Landscape" },
  custom: {},
};
const DEFAULT_TIMING_SETTINGS = {
  lockIntermissionDecision: false,
  lockBehavior: "Lock at T - 15:00",
  changeRequiresOverride: true,
  overrideRole: "Stage Manager",
  defaultTransitionBufferSeconds: 20,
  stageClearBufferSeconds: 30,
  introOutroBufferSeconds: 15,
  gracePeriodSeconds: 10,
  viewRefreshIntervalSeconds: 1,
  countdownUpdateRateSeconds: 1,
  timeSource: "Network Time Protocol (NTP)",
};

const seedItems = [
  item("opening-remarks", "Opening Remarks", "EMCEE", "core", 420, 1, 1, {
    notes: "Base planned from handwritten timing. Advisors support opening remarks.",
  }),
  item("acting-1", "Acting", "ACTING", "core", 420, 2, 2, { notes: "Opening acting block." }),
  item("freshman-dance", "Freshman Dance", "DANCE", "core", 510, 3, 3, {
    notes: "Raw music time + 0:30 entrance/exit/reset. No captains listed.",
  }),
  item("acting-2", "Acting", "ACTING", "core", 220, 4, 4),
  item("marathi", "Marathi", "DANCE", "core", 460, 5, 5, {
    captains: ["Pihu Sadana", "Sara Kulkarni"],
    notes: "Raw music time + 0:30 entrance/exit/reset.",
  }),
  item("acting-3", "Acting", "ACTING", "core", 150, 6, 6),
  item("hip-hop", "Hip-Hop", "DANCE", "core", 530, 7, 7, {
    captains: ["Arnav Mota", "Sahasra Madasi", "Jessica Rebba"],
    notes: "Raw music time + 0:30 entrance/exit/reset.",
  }),
  item("acting-4", "Acting", "ACTING", "core", 410, 8, 8),
  item("classical", "Classical", "DANCE", "core", 440, 9, 9, {
    captains: ["Sara Kulkarni", "Shruthika Srijeyaraman", "Aparna Aji"],
    notes: "Swapped with Bollywood per handwritten correction.",
  }),
  item("acting-5", "Acting", "ACTING", "core", 260, 10, 10),
  item("bollywood", "Bollywood", "DANCE", "core", 510, 11, 11, {
    captains: ["Prisha Patel", "Aishi Chell"],
    notes: "Decision point follows this item.",
  }),
  item("acting-intermission-intro", "Acting / Intermission Intro", "ACTING", PLAN_WITH_INTERMISSION, 240, 12, null, {
    notes: "With intermission branch: 4:00 before intermission.",
  }),
  item("intermission", "Intermission", "INTERMISSION", PLAN_WITH_INTERMISSION, 900, 13, null),
  item("acting-after-intermission", "Acting after Intermission", "ACTING", PLAN_WITH_INTERMISSION, 240, 14, null, {
    notes: "With intermission branch: 4:00 after intermission.",
  }),
  item("mc-transition", "MC Stalling / MC Transition", "MC", PLAN_SKIP_INTERMISSION, 300, null, 12, {
    notes: "No intermission branch: MC stalls for 5:00 after Bollywood.",
  }),
  item("singing", "Singing", "SINGING", "core", 930, 15, 13, {
    captains: ["Satvik Dhananjay", "Shivali Pandya"],
    notes: "Raw music time + 0:30 changeover + 5:00 mic/instrument setup buffer.",
  }),
  item("acting-6", "Acting", "ACTING", "core", 80, 16, 14),
  item("k-pop", "K-pop", "DANCE", "core", 510, 17, 15, {
    captains: ["Nathan Lam", "Arielle Tu"],
    notes: "Raw music time + 0:30 entrance/exit/reset.",
  }),
  item("acting-7", "Acting", "ACTING", "core", 430, 18, 16),
  item("south-indian", "South Indian", "DANCE", "core", 450, 19, 17, {
    captains: ["Aayush Chebolu", "Rishta Nossam", "Pragna Buddharaju"],
    notes: "Raw music time + 0:30 entrance/exit/reset.",
  }),
  item("acting-8", "Acting", "ACTING", "core", 420, 20, 18),
  item("garba", "Garba", "DANCE", "core", 440, 21, 19, {
    captains: ["Vikram Vijaykrishna", "Ria Badgujar"],
    notes: "Raw music time + 0:30 entrance/exit/reset.",
  }),
  item("acting-9", "Acting", "ACTING", "core", 490, 22, 20),
  item("bhangra", "Bhangra", "DANCE", "core", 510, 23, 21, {
    captains: ["Satvik Dhananjay", "Bina Suresh"],
    notes: "Raw music time + 0:30 entrance/exit/reset.",
  }),
  item("final-acting-with", "Final Acting", "ACTING", PLAN_WITH_INTERMISSION, 360, 24, null, {
    notes: "With intermission branch: 6:00 final acting estimate.",
  }),
  item("conclusion-with", "Conclusion", "CONCLUSION", PLAN_WITH_INTERMISSION, 120, 25, null, {
    notes: "With intermission branch: 2:00 conclusion estimate.",
  }),
  item("final-acting-skip", "Final Acting", "ACTING", PLAN_SKIP_INTERMISSION, 480, null, 22, {
    notes: "No intermission branch: final acting becomes 8:00.",
  }),
  item("conclusion-skip", "Conclusion", "CONCLUSION", PLAN_SKIP_INTERMISSION, 300, null, 23, {
    notes: "No intermission branch: conclusion becomes 5:00.",
  }),
];

const ITEM_COUNT = seedItems.length;
const showRef = doc(db, "shows", SHOW_ID);
const itemsRef = collection(showRef, "items");

function item(id, title, type, branch, plannedSeconds, orderWithIntermission, orderSkipIntermission, extras = {}) {
  return {
    id,
    title,
    type,
    branch,
    plannedSeconds,
    orderWithIntermission,
    orderSkipIntermission,
    performers: extras.performers || extras.people || extras.captains || [],
    captains: extras.captains || [],
    requirements: extras.requirements || defaultRequirements(type),
    notes: extras.notes || "",
  };
}

function defaultRequirements(type) {
  const t = String(type || "").toUpperCase();
  if (t === "DANCE") return { mics: "None", chairs: "0", instruments: "None", other: "Music playback" };
  if (t === "ACTING") return { mics: "As needed", chairs: "As needed", instruments: "None", other: "Acting scene" };
  if (t === "EMCEE") return { mics: "2 handheld", chairs: "0", instruments: "None", other: "Opening remarks" };
  if (t === "SINGING") return { mics: "As needed", chairs: "0", instruments: "As needed", other: "Setup buffer included" };
  if (t === "INTERMISSION") return { mics: "None", chairs: "0", instruments: "None", other: "House/intermission music" };
  if (t === "MC") return { mics: "2 handheld", chairs: "0", instruments: "None", other: "Stalling/transition" };
  if (t === "CONCLUSION") return { mics: "2 handheld", chairs: "0", instruments: "None", other: "Closing remarks" };
  return { mics: "None", chairs: "0", instruments: "None", other: "TBD" };
}

function itemRefByIndex(i) {
  return doc(itemsRef, seedItems[i].id);
}

function subscribeShow(callback) {
  return onSnapshot(
    showRef,
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : null),
    () => callback(null)
  );
}

function subscribeItems(callback) {
  const itemsQuery = query(itemsRef, orderBy("seedIndex", "asc"));
  return onSnapshot(
    itemsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    },
    () => callback([])
  );
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatClock(date) {
  const d = normalizeTimestamp(date);
  if (!d) return "-";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(totalSeconds) {
  if (totalSeconds == null || Number.isNaN(totalSeconds)) return "-";
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatOffset(offsetSeconds) {
  if (offsetSeconds == null || Number.isNaN(offsetSeconds)) return "-";
  return formatDuration(Math.abs(offsetSeconds));
}

function parsePlannedSeconds(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") {
    if (value > 0 && value < 1) return Math.round(value * 24 * 60 * 60);
    return Math.round(value);
  }
  const raw = String(value).trim();
  if (!raw) return 0;
  if (/^\d+(\.\d+)?$/.test(raw)) return Math.round(Number(raw));
  const parts = raw.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return NaN;
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  return NaN;
}

function formatPlannedInput(seconds) {
  return formatDuration(seconds || 0);
}

function displayStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "blue") return "ON DECK";
  return s ? s.toUpperCase() : "-";
}

function planLabel(plan) {
  if (plan === PLAN_LINEAR) return "LINEAR SHOW";
  return plan === PLAN_SKIP_INTERMISSION ? "SKIP INTERMISSION" : "WITH INTERMISSION";
}

function hasBranchingItems(items = []) {
  return items.some((item) => item?.branch === PLAN_WITH_INTERMISSION || item?.branch === PLAN_SKIP_INTERMISSION);
}

function planForShow(showData, items = []) {
  if (showData?.intermissionMode === PLAN_LINEAR) return PLAN_LINEAR;
  if (!hasBranchingItems(items) && showData?.intermissionMode !== "branched") return PLAN_LINEAR;
  return showData?.intermissionPlan === PLAN_SKIP_INTERMISSION ? PLAN_SKIP_INTERMISSION : PLAN_WITH_INTERMISSION;
}

function isActiveForPlan(item, plan) {
  if (plan === PLAN_LINEAR) return !item?.branch || item?.branch === "core" || item?.branch === PLAN_LINEAR;
  return item?.branch === "core" || item?.branch === plan;
}

function planOrder(item, plan) {
  if (plan === PLAN_LINEAR) return item.order ?? item.seedIndex + 1;
  return plan === PLAN_SKIP_INTERMISSION ? item.orderSkipIntermission : item.orderWithIntermission;
}

function activeItemsForPlan(items, plan) {
  return [...items]
    .filter((item) => isActiveForPlan(item, plan))
    .sort((a, b) => (planOrder(a, plan) || 9999) - (planOrder(b, plan) || 9999));
}

function hasBranchItemStarted(items) {
  return items.some((item) => (item.branch === PLAN_WITH_INTERMISSION || item.branch === PLAN_SKIP_INTERMISSION) && normalizeTimestamp(item.actualStartAt));
}

function peopleList(item) {
  if (!item) return [];
  const values = Array.isArray(item.performers) && item.performers.length ? item.performers : Array.isArray(item.people) && item.people.length ? item.people : item.captains;
  return Array.isArray(values) ? values.map((value) => String(value || "").trim()).filter(Boolean) : [];
}

function peopleText(item) {
  const people = peopleList(item);
  return people.length ? people.join(", ") : "-";
}

function openPeopleLine(item) {
  const text = peopleText(item);
  return text === "-" ? "" : `Performers: ${text}`;
}

function activeOrderById(items, plan) {
  const map = new Map();
  activeItemsForPlan(items, plan).forEach((item, idx) => map.set(item.id, idx + 1));
  return map;
}

function computeRemainingSeconds(items, plan) {
  return activeItemsForPlan(items, plan)
    .filter((item) => item.status !== "done")
    .reduce((sum, item) => {
      const planned = item.plannedSeconds || 0;
      if (item.status === "live") {
        const elapsed = getElapsedSeconds(item.actualStartAt);
        return sum + Math.max(0, planned - (elapsed || 0));
      }
      return sum + planned;
    }, 0);
}

function computeProjectedTiming(showData, items, plan = planForShow(showData, items)) {
  const remainingSeconds = computeRemainingSeconds(items, plan);
  const now = new Date();
  const projectedEndAt = new Date(now.getTime() + remainingSeconds * 1000);
  const baseline = normalizeTimestamp(showData?.plannedEndBaselineAt) || projectedEndAt;
  const offsetSeconds = Math.round((projectedEndAt - baseline) / 1000);
  return { projectedEndAt, offsetSeconds };
}

function getOffsetStatus(offsetSeconds) {
  if (offsetSeconds == null || Number.isNaN(offsetSeconds)) return "ON TIME";
  if (Math.abs(offsetSeconds) < OFFSET_STATUS_THRESHOLD_SECONDS) return "ON TIME";
  return offsetSeconds > 0 ? "BEHIND" : "AHEAD";
}

function getTargetRuntimeSeconds(showData) {
  const seconds = Number(showData?.targetRuntimeSeconds);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_TARGET_RUNTIME_SECONDS;
}

function getSafetyBufferSeconds(showData) {
  const minutes = Number(showData?.safetyBufferMinutes);
  return (Number.isFinite(minutes) && minutes >= 0 ? minutes : DEFAULT_SAFETY_BUFFER_MINUTES) * 60;
}

function getActualShowStartAt(showData) {
  const stored = normalizeTimestamp(showData?.actualShowStartAt);
  if (stored) return stored;
  const baseline = normalizeTimestamp(showData?.plannedEndBaselineAt);
  if (baseline) return new Date(baseline.getTime() - getTargetRuntimeSeconds(showData) * 1000);
  return null;
}

function getTargetEndAt(showData) {
  const start = getActualShowStartAt(showData);
  if (!start) return null;
  return new Date(start.getTime() + getTargetRuntimeSeconds(showData) * 1000);
}

function getRecommendation(showData, items) {
  if (!hasBranchingItems(items)) return "LINEAR SHOW";
  const plan = planForShow(showData, items);
  const locked = !!showData?.intermissionDecisionLocked || hasBranchItemStarted(items);
  if (locked) {
    return plan === PLAN_SKIP_INTERMISSION ? "LOCKED: NO INTERMISSION" : "LOCKED: WITH INTERMISSION";
  }

  const targetEndAt = getTargetEndAt(showData);
  if (!targetEndAt) return "INTERMISSION OK";

  const { projectedEndAt: withEnd } = computeProjectedTiming(showData, items, PLAN_WITH_INTERMISSION);
  const { projectedEndAt: skipEnd } = computeProjectedTiming(showData, items, PLAN_SKIP_INTERMISSION);
  const withDiff = Math.round((withEnd - targetEndAt) / 1000);
  const skipDiff = Math.round((skipEnd - targetEndAt) / 1000);
  const buffer = getSafetyBufferSeconds(showData);

  if (withDiff <= -(buffer + 60)) return "INTERMISSION OK";
  if (withDiff <= buffer) return "WATCH CLOSELY";
  if (skipDiff <= buffer) return "SKIP RECOMMENDED";
  return "SKIP REQUIRED";
}

function recommendationTone(recommendation) {
  if (recommendation.includes("LOCKED") || recommendation === "DECISION PASSED") return "locked";
  if (recommendation === "LINEAR SHOW") return "locked";
  if (recommendation === "INTERMISSION OK") return "ok";
  if (recommendation === "WATCH CLOSELY") return "watch";
  return "danger";
}

function clearSignalClasses(el) {
  if (!el) return;
  ["signal-success", "signal-danger", "signal-warn", "signal-info", "signal-muted"].forEach((c) => el.classList.remove(c));
}

function applySignal(el, tone) {
  if (!el) return;
  clearSignalClasses(el);
  const map = {
    success: "signal-success",
    danger: "signal-danger",
    warn: "signal-warn",
    info: "signal-info",
    muted: "signal-muted",
  };
  el.classList.add(map[tone] || "signal-info");
}

function applyOffsetSignal(el, offsetSeconds) {
  if (offsetSeconds == null || Number.isNaN(offsetSeconds)) return applySignal(el, "muted");
  if (Math.abs(offsetSeconds) <= 10) return applySignal(el, "info");
  return applySignal(el, offsetSeconds > 0 ? "danger" : "success");
}

function applyOverUnderSignal(el, diffSeconds) {
  if (diffSeconds == null || Number.isNaN(diffSeconds)) return applySignal(el, "muted");
  if (Math.abs(diffSeconds) <= 10) return applySignal(el, "info");
  return applySignal(el, diffSeconds > 0 ? "danger" : "success");
}

function applyShowStatusChip(el, status) {
  if (!el) return;
  ["chip-running", "chip-hold", "chip-stopped"].forEach((c) => el.classList.remove(c));
  const s = String(status || "").toLowerCase();
  if (s === "running") el.classList.add("chip-running");
  else if (s === "hold") el.classList.add("chip-hold");
  else el.classList.add("chip-stopped");
}

function getRequirement(item, key) {
  const req = item?.requirements || defaultRequirements(item?.type);
  const val = req?.[key];
  if (val == null) return "-";
  const s = String(val).trim();
  return s.length ? s : "-";
}

function normalizeItemName(nameRaw) {
  let name = String(nameRaw || "").trim().toLowerCase();
  if (!name) return "";
  const map = {
    handhelds: "handheld",
    handheld: "handheld",
    mics: "mic",
    mic: "mic",
    microphones: "mic",
    stands: "stand",
    stand: "stand",
    stools: "stool",
    stool: "stool",
    chairs: "chair",
    chair: "chair",
    guitars: "guitar",
    guitar: "guitar",
  };
  if (map[name]) return map[name];
  if (name.endsWith("s") && name.length > 3) name = name.slice(0, -1);
  return name;
}

function parseRequirementValue(value) {
  const s0 = String(value || "").trim();
  if (!s0) return {};
  const s = s0.toLowerCase();
  if (s === "-" || s === "none" || s === "0" || s === "n/a" || s === "tbd" || s === "as needed") return {};
  const parts = s0.split(",").map((p) => p.trim()).filter(Boolean);
  const counts = {};
  parts.forEach((part) => {
    const m = part.match(/^(\d+)\s+(.*)$/);
    const count = m ? Number(m[1]) : 1;
    const name = normalizeItemName(m ? m[2] : part);
    if (!name || !Number.isFinite(count)) return;
    counts[name] = (counts[name] || 0) + count;
  });
  return counts;
}

function describeChangePills(fromVal, toVal) {
  const fromCounts = parseRequirementValue(fromVal);
  const toCounts = parseRequirementValue(toVal);
  const keys = new Set([...Object.keys(fromCounts), ...Object.keys(toCounts)]);
  const pills = [];
  keys.forEach((key) => {
    const diff = (toCounts[key] || 0) - (fromCounts[key] || 0);
    if (diff > 0) pills.push({ type: "add", text: `+${diff} ${key}` });
    if (diff < 0) pills.push({ type: "remove", text: `${diff} ${key}` });
  });
  return pills.sort((a, b) => a.text.localeCompare(b.text));
}

function renderChangeSummary(containerEl, fromItem, toItem) {
  if (!containerEl) return;
  if (!fromItem || !toItem) {
    containerEl.innerHTML = `<div class="no-change">-</div>`;
    return;
  }
  const manual = String(toItem.changeNotes || "").split(/\n|,/).map((line) => line.trim()).filter(Boolean);
  if (manual.length) {
    containerEl.innerHTML = `
      <div class="change-line">
        <div class="change-label">Manual</div>
        <div class="change-pills">
          ${manual.map((line) => {
            const type = line.startsWith("-") ? "remove" : line.startsWith("+") ? "add" : "";
            return `<span class="pill ${type}">${line}</span>`;
          }).join("")}
        </div>
      </div>
    `;
    return;
  }
  const fields = [
    { key: "mics", label: "Mics" },
    { key: "chairs", label: "Chairs" },
    { key: "instruments", label: "Instruments" },
    { key: "other", label: "Other" },
  ];
  const lines = [];
  fields.forEach((field) => {
    const pills = describeChangePills(getRequirement(fromItem, field.key), getRequirement(toItem, field.key));
    if (!pills.length) return;
    lines.push(`
      <div class="change-line">
        <div class="change-label">${field.label}</div>
        <div class="change-pills">${pills.map((p) => `<span class="pill ${p.type}">${p.text}</span>`).join("")}</div>
      </div>
    `);
  });
  containerEl.innerHTML = lines.length ? lines.join("") : `<div class="no-change">No stage changes.</div>`;
}

function buildInitialItems() {
  return seedItems.map((seed, seedIndex) => ({
    ...seed,
    order: seed.orderWithIntermission ?? seed.orderSkipIntermission ?? seedIndex + 1,
    seedIndex,
    status: "queued",
    actualStartAt: null,
    actualEndAt: null,
  }));
}

function slugifyId(value, index) {
  const base = String(value || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 44);
  return `${base || "item"}-${index + 1}`;
}

function parsePeople(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBranch(value) {
  const branch = String(value || "core").trim();
  if (!branch || branch.toLowerCase() === "blank") return "core";
  if (branch === PLAN_WITH_INTERMISSION || branch === PLAN_SKIP_INTERMISSION || branch === PLAN_LINEAR || branch === "core" || branch === "custom") return branch;
  if (branch.toLowerCase() === "withintermission" || branch.toLowerCase() === "with intermission") return PLAN_WITH_INTERMISSION;
  if (branch.toLowerCase() === "skipintermission" || branch.toLowerCase() === "skip intermission") return PLAN_SKIP_INTERMISSION;
  return "core";
}

function setupItemFromRuntime(item, index) {
  const planOrderValue = item.order ?? item.orderWithIntermission ?? item.orderSkipIntermission ?? index + 1;
  return {
    id: item.id || slugifyId(item.title, index),
    order: Number(planOrderValue) || index + 1,
    title: item.title || "Untitled Item",
    type: item.type || "OTHER",
    plannedSeconds: Number(item.plannedSeconds) || 0,
    performers: peopleList(item),
    branch: normalizeBranch(item.branch),
    requirements: {
      mics: getRequirement(item, "mics"),
      chairs: getRequirement(item, "chairs"),
      instruments: getRequirement(item, "instruments"),
      other: getRequirement(item, "other"),
    },
    changeNotes: item.changeNotes || "",
    notes: item.notes || "",
  };
}

function fallbackSetupItems() {
  return buildInitialItems().map(setupItemFromRuntime);
}

function setupItemsFromShow(showData, runtimeItems = []) {
  const saved = Array.isArray(showData?.setupItems) ? showData.setupItems : [];
  if (saved.length) return saved.map(setupItemFromRuntime).sort((a, b) => (a.order || 0) - (b.order || 0));
  if (runtimeItems.length) return runtimeItems.map(setupItemFromRuntime).sort((a, b) => (a.order || 0) - (b.order || 0));
  return fallbackSetupItems();
}

function buildRuntimeItemsFromSetup(setupItems) {
  const seen = new Set();
  return setupItems
    .map((setup, index) => {
      const order = Number(setup.order) || index + 1;
      const title = String(setup.title || `Item ${index + 1}`).trim() || `Item ${index + 1}`;
      let id = String(setup.id || "").trim() || slugifyId(title, index);
      while (seen.has(id)) id = `${id}-${index + 1}`;
      seen.add(id);
      const branch = normalizeBranch(setup.branch);
      const plannedSeconds = Math.max(0, Number(setup.plannedSeconds) || 0);
      const performers = parsePeople(setup.performers || setup.people || setup.captains);
      const requirements = {
        mics: String(setup.requirements?.mics ?? setup.mics ?? defaultRequirements(setup.type).mics ?? "").trim(),
        chairs: String(setup.requirements?.chairs ?? setup.chairs ?? defaultRequirements(setup.type).chairs ?? "").trim(),
        instruments: String(setup.requirements?.instruments ?? setup.instruments ?? defaultRequirements(setup.type).instruments ?? "").trim(),
        other: String(setup.requirements?.other ?? setup.other ?? defaultRequirements(setup.type).other ?? "").trim(),
      };
      return {
        id,
        title,
        type: String(setup.type || "OTHER").trim() || "OTHER",
        branch,
        order,
        orderWithIntermission: branch === PLAN_SKIP_INTERMISSION ? null : order,
        orderSkipIntermission: branch === PLAN_WITH_INTERMISSION ? null : order,
        plannedSeconds,
        performers,
        captains: performers,
        requirements,
        changeNotes: String(setup.changeNotes || "").trim(),
        notes: String(setup.notes || "").trim(),
        seedIndex: index,
        status: "queued",
        actualStartAt: null,
        actualEndAt: null,
      };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function showHasStarted(showData, items = []) {
  const status = String(showData?.status || "").toLowerCase();
  return status === "running" || status === "hold" || items.some((item) => item.status === "live" || item.status === "done" || normalizeTimestamp(item.actualStartAt));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeSettings(saved = {}) {
  const merged = deepClone(DEFAULT_SETTINGS);
  Object.entries(saved || {}).forEach(([section, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value) && merged[section]) {
      Object.entries(value).forEach(([key, child]) => {
        if (child && typeof child === "object" && !Array.isArray(child) && merged[section][key]) {
          merged[section][key] = { ...merged[section][key], ...child };
        } else {
          merged[section][key] = child;
        }
      });
    } else if (section in merged) {
      merged[section] = value;
    }
  });
  return sanitizeSettings(merged);
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sanitizeProfile(profile, fallback) {
  const source = { ...fallback, ...(profile || {}) };
  return {
    widthPx: clampNumber(source.widthPx, 800, 9999, fallback.widthPx),
    heightPx: clampNumber(source.heightPx, 600, 9999, fallback.heightPx),
    aspectRatio: String(source.aspectRatio || fallback.aspectRatio),
    scalingMode: String(source.scalingMode || fallback.scalingMode),
    zoomPercent: clampNumber(source.zoomPercent, 50, 150, fallback.zoomPercent),
    fontScalePercent: clampNumber(source.fontScalePercent, 75, 150, fallback.fontScalePercent),
    density: ["Compact", "Comfortable", "Large"].includes(source.density) ? source.density : fallback.density,
    safeAreaMarginPx: clampNumber(source.safeAreaMarginPx, 0, 160, fallback.safeAreaMarginPx),
    orientation: ["Landscape", "Portrait", "Auto"].includes(source.orientation) ? source.orientation : fallback.orientation,
  };
}

function sanitizeSettings(settings) {
  const merged = { ...deepClone(DEFAULT_SETTINGS), ...(settings || {}) };
  merged.displayProfiles = {
    operator: sanitizeProfile(merged.displayProfiles?.operator, DEFAULT_SETTINGS.displayProfiles.operator),
    performer: sanitizeProfile(merged.displayProfiles?.performer, DEFAULT_SETTINGS.displayProfiles.performer),
    confidence: sanitizeProfile(merged.displayProfiles?.confidence, DEFAULT_SETTINGS.displayProfiles.confidence),
  };
  merged.accessibility = {
    ...DEFAULT_SETTINGS.accessibility,
    ...(merged.accessibility || {}),
    fontScalePercent: clampNumber(merged.accessibility?.fontScalePercent, 75, 150, DEFAULT_SETTINGS.accessibility.fontScalePercent),
  };
  merged.syncRefresh = {
    ...DEFAULT_SETTINGS.syncRefresh,
    ...(merged.syncRefresh || {}),
    refreshIntervalSeconds: clampNumber(merged.syncRefresh?.refreshIntervalSeconds, 1, 300, DEFAULT_SETTINGS.syncRefresh.refreshIntervalSeconds),
  };
  merged.notifications = {
    ...DEFAULT_SETTINGS.notifications,
    ...(merged.notifications || {}),
    toastDurationSeconds: clampNumber(merged.notifications?.toastDurationSeconds, 1, 60, DEFAULT_SETTINGS.notifications.toastDurationSeconds),
  };
  merged.systemMode = {
    ...DEFAULT_SETTINGS.systemMode,
    ...(merged.systemMode || {}),
    idleTimeoutMinutes: clampNumber(merged.systemMode?.idleTimeoutMinutes, 1, 720, DEFAULT_SETTINGS.systemMode.idleTimeoutMinutes),
  };
  return merged;
}

function viewProfileKey() {
  if (document.body.classList.contains("confidence")) return "confidence";
  if (document.body.classList.contains("performer")) return "performer";
  return "operator";
}

function applyDisplaySettings(settings = DEFAULT_SETTINGS) {
  const sanitized = mergeSettings(settings);
  const profile = sanitized.displayProfiles[viewProfileKey()] || DEFAULT_SETTINGS.displayProfiles.operator;
  const densityMap = { Compact: 0.82, Comfortable: 1, Large: 1.18 };
  document.documentElement.style.setProperty("--profile-width", `${profile.widthPx}px`);
  document.documentElement.style.setProperty("--profile-height", `${profile.heightPx}px`);
  document.documentElement.style.setProperty("--safe-area-margin", `${profile.safeAreaMarginPx}px`);
  document.documentElement.style.setProperty("--ui-zoom", String(profile.zoomPercent / 100));
  const fontScale = (profile.fontScalePercent / 100) * (sanitized.accessibility.fontScalePercent / 100);
  document.documentElement.style.setProperty("--font-scale", String(fontScale));
  document.documentElement.style.setProperty("--font-scale-factor", String(fontScale));
  document.documentElement.style.setProperty("--density-scale", String(densityMap[profile.density] || 1));
  document.body.dataset.profileDensity = profile.density.toLowerCase();
  document.body.classList.toggle("settings-high-contrast", !!sanitized.accessibility.highContrast);
  document.body.classList.toggle("settings-reduced-motion", !!sanitized.accessibility.reducedMotion);
  document.body.classList.toggle("settings-focus-strong", !!sanitized.accessibility.focusIndicators);
  document.body.classList.toggle("hide-confidence-intermission", sanitized.visibility?.showIntermissionStatusBanner === false);
}

function initSidebarCollapse() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  const collapseForSmallScreen = window.matchMedia?.("(max-width: 760px)")?.matches;
  const collapsed = stored == null ? !!collapseForSmallScreen : stored === "true";
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  const button = document.getElementById("sidebarCollapseBtn");
  const sync = () => {
    const isCollapsed = document.body.classList.contains("sidebar-collapsed");
    if (button) {
      button.title = isCollapsed ? "Expand sidebar" : "Collapse sidebar";
      button.setAttribute("aria-label", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
    }
  };
  sync();
  button?.addEventListener("click", () => {
    const next = !document.body.classList.contains("sidebar-collapsed");
    document.body.classList.toggle("sidebar-collapsed", next);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    sync();
  });
}

function initThemeToggle() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const initial = stored === "light" ? "light" : "dark";
  document.body.dataset.theme = initial;
  const button = document.getElementById("themeToggleBtn");
  const sync = () => {
    const nextLabel = document.body.dataset.theme === "light" ? "Dark" : "Light";
    if (button) button.textContent = nextLabel;
  };
  sync();
  button?.addEventListener("click", () => {
    const next = document.body.dataset.theme === "light" ? "dark" : "light";
    document.body.dataset.theme = next;
    localStorage.setItem(THEME_STORAGE_KEY, next);
    sync();
  });
}

function normalizeQueueForPlan(items, showData, plan) {
  const active = activeItemsForPlan(items, plan);
  const activeIds = new Set(active.map((item) => item.id));
  const live = active.find((item) => item.status === "live") || null;
  const branchLocked = showData?.intermissionDecisionLocked || hasBranchItemStarted(items);
  const finalItems = items.map((item) => {
    if (!activeIds.has(item.id)) return { ...item, status: item.status === "done" ? "done" : "queued" };
    if (item.status === "done") return item;
    if (live && item.id === live.id) return { ...item, status: "live" };
    return { ...item, status: "queued" };
  });
  const activeFinal = activeItemsForPlan(finalItems, plan);
  const notDone = activeFinal.filter((item) => item.status !== "done" && item.status !== "live");
  const backstage = notDone[0] || null;
  const deck = notDone[1] || null;
  const currentId = live?.id || backstage?.id || activeFinal[0]?.id || null;
  const normalized = finalItems.map((item) => {
    if (!activeIds.has(item.id) || item.status === "done" || item.status === "live") return item;
    if (backstage && item.id === backstage.id) return { ...item, status: "backstage" };
    if (deck && item.id === deck.id) return { ...item, status: "blue" };
    return { ...item, status: "queued" };
  });
  return {
    items: normalized,
    show: {
      ...showData,
      intermissionPlan: plan,
      intermissionDecisionLocked: branchLocked,
      currentItemId: currentId,
    },
  };
}

async function initShow() {
  const batch = writeBatch(db);
  const now = new Date();
  const setupItems = Array.isArray(window.__currentSetupDraftForInit) && window.__currentSetupDraftForInit.length
    ? window.__currentSetupDraftForInit
    : setupItemsFromShow(window.__currentShowDataForInit || null, window.__currentRuntimeItemsForInit || []);
  const initialItems = buildRuntimeItemsFromSetup(setupItems.length ? setupItems : fallbackSetupItems());
  const hasBranches = hasBranchingItems(initialItems);
  const initialPlan = hasBranches ? DEFAULT_PLAN : PLAN_LINEAR;
  const plannedEndBaselineAt = new Date(now.getTime() + computeRemainingSeconds(initialItems, initialPlan) * 1000);
  const nextIds = new Set(initialItems.map((runtimeItem) => runtimeItem.id));
  const existing = await getDocs(itemsRef);
  existing.docs.forEach((docSnap) => {
    if (!nextIds.has(docSnap.id)) batch.delete(doc(itemsRef, docSnap.id));
  });
  const baseShow = {
    displayName: window.__currentShowDataForInit?.setupTitle || window.__currentShowDataForInit?.displayName || "Stage Management System",
    setupTitle: window.__currentShowDataForInit?.setupTitle || window.__currentShowDataForInit?.displayName || "",
    showDate: window.__currentShowDataForInit?.showDate || "",
    venue: window.__currentShowDataForInit?.venue || "",
    timezone: window.__currentShowDataForInit?.timezone || "",
    settings: mergeSettings(window.__currentShowDataForInit?.settings || {}),
    timingSettings: { ...DEFAULT_TIMING_SETTINGS, ...(window.__currentShowDataForInit?.timingSettings || {}) },
    setupItems,
    setupUpdatedAt: window.__currentShowDataForInit?.setupUpdatedAt || null,
    status: "stopped",
    holdMessage: "",
    currentItemId: activeItemsForPlan(initialItems, initialPlan)[0]?.id || initialItems[0]?.id || null,
    intermissionMode: hasBranches ? "branched" : PLAN_LINEAR,
    intermissionPlan: initialPlan,
    intermissionDecisionLocked: false,
    actualShowStartAt: now,
    targetRuntimeSeconds: DEFAULT_TARGET_RUNTIME_SECONDS,
    safetyBufferMinutes: DEFAULT_SAFETY_BUFFER_MINUTES,
    plannedEndBaselineAt,
    projectedEndAt: plannedEndBaselineAt,
    offsetSeconds: 0,
    updatedAt: serverTimestamp(),
  };
  const normalized = normalizeQueueForPlan(initialItems, baseShow, initialPlan);
  normalized.items.forEach((runtimeItem) => batch.set(doc(itemsRef, runtimeItem.id), runtimeItem));
  batch.set(showRef, { ...normalized.show, projectedEndAt: plannedEndBaselineAt, offsetSeconds: 0, updatedAt: serverTimestamp() });
  await batch.commit();
  return { show: { ...normalized.show, projectedEndAt: plannedEndBaselineAt, offsetSeconds: 0 }, items: normalized.items };
}

function buildShiftMap(items, currentId, plan) {
  const active = activeItemsForPlan(items, plan);
  const current = active.find((item) => item.id === currentId);
  if (!current) return null;
  const notDone = active.filter((item) => item.status !== "done" && item.id !== currentId);
  const nextBackstage = notDone[0] || null;
  const nextDeck = notDone[1] || null;
  const activeIds = new Set(active.map((item) => item.id));
  const map = new Map();
  items.forEach((item) => {
    if (!activeIds.has(item.id)) map.set(item.id, item.status === "done" ? "done" : "queued");
    else if (item.status === "done") map.set(item.id, "done");
    else if (item.id === currentId) map.set(item.id, "live");
    else if (nextBackstage && item.id === nextBackstage.id) map.set(item.id, "backstage");
    else if (nextDeck && item.id === nextDeck.id) map.set(item.id, "blue");
    else map.set(item.id, "queued");
  });
  return map;
}

async function toggleHold(currentStatus, message) {
  const nextStatus = currentStatus === "hold" ? "running" : "hold";
  await updateDoc(showRef, {
    status: nextStatus,
    holdMessage: nextStatus === "hold" ? message || "HOLD" : "",
    updatedAt: serverTimestamp(),
  });
}

async function updatePlannedSeconds(itemId, plannedSeconds) {
  await updateDoc(doc(itemsRef, itemId), { plannedSeconds });
}

function getElapsedSeconds(actualStartAt) {
  const start = normalizeTimestamp(actualStartAt);
  if (!start) return null;
  return Math.floor((Date.now() - start.getTime()) / 1000);
}

function initOperatorView() {
  const operatorTimeEl = document.getElementById("operatorTime");
  if (!operatorTimeEl) return;

  const operatorProjectedEndEl = document.getElementById("operatorProjectedEnd");
  const operatorOffsetEl = document.getElementById("operatorOffset");
  const operatorShowStatusEl = document.getElementById("operatorShowStatus");
  const operatorHeaderStatusEl = document.getElementById("operatorHeaderStatus");
  const currentTitleEl = document.getElementById("currentTitle");
  const currentTypeEl = document.getElementById("currentType");
  const currentStatusEl = document.getElementById("currentStatus");
  const currentPlannedEl = document.getElementById("currentPlanned");
  const currentElapsedEl = document.getElementById("currentElapsed");
  const currentOverUnderEl = document.getElementById("currentOverUnder");
  const backstageTitleEl = document.getElementById("backstageTitle");
  const backstagePlannedEl = document.getElementById("backstagePlanned");
  const deckTitleEl = document.getElementById("blueTitle");
  const deckPlannedEl = document.getElementById("bluePlanned");
  const planLabelEl = document.getElementById("planLabel");
  const lockStatusEl = document.getElementById("lockStatus");
  const keepIntermissionBtn = document.getElementById("keepIntermissionBtn");
  const skipIntermissionBtn = document.getElementById("skipIntermissionBtn");
  const recommendationEl = document.getElementById("recommendation");
  const actualShowStartInput = document.getElementById("actualShowStartInput");
  const targetRuntimeHoursInput = document.getElementById("targetRuntimeHoursInput");
  const targetRuntimeMinutesInput = document.getElementById("targetRuntimeMinutesInput");
  const safetyBufferInput = document.getElementById("safetyBufferInput");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const timingActualStartCard = document.getElementById("timingActualStartCard");
  const timingActualStartDate = document.getElementById("timingActualStartDate");
  const timingTargetEndCard = document.getElementById("timingTargetEndCard");
  const timingCurrentRuntimeCard = document.getElementById("timingCurrentRuntimeCard");
  const timingBufferStatusCard = document.getElementById("timingBufferStatusCard");
  const timingBufferNote = document.getElementById("timingBufferNote");
  const timingTargetPreview = document.getElementById("timingTargetPreview");
  const timingLockIntermissionToggle = document.getElementById("timingLockIntermissionToggle");
  const timingLockBehaviorSelect = document.getElementById("timingLockBehaviorSelect");
  const timingOverrideToggle = document.getElementById("timingOverrideToggle");
  const timingOverrideRoleSelect = document.getElementById("timingOverrideRoleSelect");
  const defaultTransitionBufferInput = document.getElementById("defaultTransitionBufferInput");
  const stageClearBufferInput = document.getElementById("stageClearBufferInput");
  const introOutroBufferInput = document.getElementById("introOutroBufferInput");
  const gracePeriodInput = document.getElementById("gracePeriodInput");
  const viewRefreshIntervalInput = document.getElementById("viewRefreshIntervalInput");
  const countdownUpdateRateInput = document.getElementById("countdownUpdateRateInput");
  const timingTimeSourceInput = document.getElementById("timingTimeSourceInput");
  const timingLastSync = document.getElementById("timingLastSync");
  const resetTimingDefaultsBtn = document.getElementById("resetTimingDefaultsBtn");
  const saveTimingDraftBtn = document.getElementById("saveTimingDraftBtn");
  const timingSaveStatus = document.getElementById("timingSaveStatus");
  const timingWithEnd = document.getElementById("timingWithEnd");
  const timingSkipEnd = document.getElementById("timingSkipEnd");
  const timingWithBuffer = document.getElementById("timingWithBuffer");
  const timingSkipBuffer = document.getElementById("timingSkipBuffer");
  const timingWithRisk = document.getElementById("timingWithRisk");
  const timingSkipRisk = document.getElementById("timingSkipRisk");
  const timingWithRecommendation = document.getElementById("timingWithRecommendation");
  const timingSkipRecommendation = document.getElementById("timingSkipRecommendation");
  const forecastWithEnd = document.getElementById("forecastWithEnd");
  const forecastSkipEnd = document.getElementById("forecastSkipEnd");
  const forecastWithBuffer = document.getElementById("forecastWithBuffer");
  const forecastSkipBuffer = document.getElementById("forecastSkipBuffer");
  const forecastStretchTarget = document.getElementById("forecastStretchTarget");
  const forecastStretchPace = document.getElementById("forecastStretchPace");
  const currentCaptainsEl = document.getElementById("currentCaptains");
  const backstageCaptainsEl = document.getElementById("backstageCaptains");
  const deckCaptainsEl = document.getElementById("deckCaptains");
  const reqNowTitleEl = document.getElementById("reqNowTitle");
  const reqNowMicsEl = document.getElementById("reqNowMics");
  const reqNowChairsEl = document.getElementById("reqNowChairs");
  const reqNowInstrumentsEl = document.getElementById("reqNowInstruments");
  const reqNowOtherEl = document.getElementById("reqNowOther");
  const reqBackTitleEl = document.getElementById("reqBackTitle");
  const reqBackMicsEl = document.getElementById("reqBackMics");
  const reqBackChairsEl = document.getElementById("reqBackChairs");
  const reqBackInstrumentsEl = document.getElementById("reqBackInstruments");
  const reqBackOtherEl = document.getElementById("reqBackOther");
  const reqBackChangeEl = document.getElementById("reqBackChange");
  const reqDeckTitleEl = document.getElementById("reqDeckTitle");
  const reqDeckMicsEl = document.getElementById("reqDeckMics");
  const reqDeckChairsEl = document.getElementById("reqDeckChairs");
  const reqDeckInstrumentsEl = document.getElementById("reqDeckInstruments");
  const reqDeckOtherEl = document.getElementById("reqDeckOther");
  const reqDeckChangeEl = document.getElementById("reqDeckChange");
  const startBtn = document.getElementById("startBtn");
  const endBtn = document.getElementById("endBtn");
  const undoBtn = document.getElementById("undoBtn");
  const holdBtn = document.getElementById("holdBtn");
  const initBtn = document.getElementById("initBtn");
  const runTableBody = document.querySelector("#runTable tbody");
  const advancedToggle = document.getElementById("advancedToggle");
  const setupTitleInput = document.getElementById("setupTitleInput");
  const setupDateInput = document.getElementById("setupDateInput");
  const setupVenueInput = document.getElementById("setupVenueInput");
  const setupTimezoneInput = document.getElementById("setupTimezoneInput");
  const setupStatusEl = document.getElementById("setupStatus");
  const setupTableBody = document.querySelector("#setupTable tbody");
  const addSetupItemBtn = document.getElementById("addSetupItemBtn");
  const loadSetupBtn = document.getElementById("loadSetupBtn");
  const saveSetupBtn = document.getElementById("saveSetupBtn");
  const setupSourceLabel = document.getElementById("setupSourceLabel");
  const excelImportInput = document.getElementById("excelImportInput");
  const previewImportBtn = document.getElementById("previewImportBtn");
  const applyImportBtn = document.getElementById("applyImportBtn");
  const importStatusEl = document.getElementById("importStatus");
  const importPreviewEl = document.getElementById("importPreview");
  const importTotalItemsEl = document.getElementById("importTotalItems");
  const importValidRowsEl = document.getElementById("importValidRows");
  const importWarningsEl = document.getElementById("importWarnings");
  const importErrorsEl = document.getElementById("importErrors");
  const addSetupItemBtn2 = document.getElementById("addSetupItemBtn2");
  const saveSetupDraftBtn = document.getElementById("saveSetupDraftBtn");
  const setupSearchInput = document.getElementById("setupSearchInput");
  const setupBranchFilter = document.getElementById("setupBranchFilter");
  const setupPaginationLabel = document.getElementById("setupPaginationLabel");
  const appHeaderTitle = document.getElementById("appHeaderTitle");
  const runOfShowNavLink = document.querySelector("[data-side-tab='run']");
  const reportsNavLink = document.querySelector("[data-side-tab='reports']");
  const settingsNavLink = document.querySelector("[data-side-tab='settings']");
  const rosTableBody = document.querySelector("#runOfShowTable tbody");
  const rosSearchInput = document.getElementById("rosSearchInput");
  const rosStatusFilter = document.getElementById("rosStatusFilter");
  const rosTypeFilter = document.getElementById("rosTypeFilter");
  const rosBranchFilter = document.getElementById("rosBranchFilter");
  const rosShowCompletedToggle = document.getElementById("rosShowCompletedToggle");
  const rosJumpCurrentBtn = document.getElementById("rosJumpCurrentBtn");
  const rosExportBtn = document.getElementById("rosExportBtn");
  const rosSummaryEl = document.getElementById("rosSummary");
  const rosCountLabel = document.getElementById("rosCountLabel");
  const rosActivePlanEl = document.getElementById("rosActivePlan");
  const rosLiveItemEl = document.getElementById("rosLiveItem");
  const rosNextItemEl = document.getElementById("rosNextItem");
  const rosCompletedCountEl = document.getElementById("rosCompletedCount");
  const reportsDateRange = document.getElementById("reportsDateRange");
  const reportsShowSelect = document.getElementById("reportsShowSelect");
  const reportsVenueSelect = document.getElementById("reportsVenueSelect");
  const reportsBranchFilter = document.getElementById("reportsBranchFilter");
  const reportsPdfBtn = document.getElementById("reportsPdfBtn");
  const reportsCsvBtn = document.getElementById("reportsCsvBtn");
  const reportsExcelBtn = document.getElementById("reportsExcelBtn");
  const reportPlannedRuntimeEl = document.getElementById("reportPlannedRuntime");
  const reportActualRuntimeEl = document.getElementById("reportActualRuntime");
  const reportActualRuntimeNoteEl = document.getElementById("reportActualRuntimeNote");
  const reportVarianceEl = document.getElementById("reportVariance");
  const reportVarianceNoteEl = document.getElementById("reportVarianceNote");
  const reportTransitionsEl = document.getElementById("reportTransitions");
  const reportAverageDelayEl = document.getElementById("reportAverageDelay");
  const runtimeTrendChart = document.getElementById("runtimeTrendChart");
  const segmentDurationChart = document.getElementById("segmentDurationChart");
  const delayContributorsList = document.getElementById("delayContributorsList");
  const transitionPerformancePanel = document.getElementById("transitionPerformancePanel");
  const reportSearchInput = document.getElementById("reportSearchInput");
  const reportStatusFilter = document.getElementById("reportStatusFilter");
  const reportTypeFilter = document.getElementById("reportTypeFilter");
  const reportSummaryCount = document.getElementById("reportSummaryCount");
  const reportSummaryTableBody = document.querySelector("#reportSummaryTable tbody");
  const settingsApplyBtn = document.getElementById("settingsApplyBtn");
  const settingsDraftBtn = document.getElementById("settingsDraftBtn");
  const settingsDiscardBtn = document.getElementById("settingsDiscardBtn");
  const settingsResetBtn = document.getElementById("settingsResetBtn");
  const settingsSaveState = document.getElementById("settingsSaveState");
  const exportConfigBtn = document.getElementById("exportConfigBtn");
  const systemExportReportsBtn = document.getElementById("systemExportReportsBtn");
  const backupImportInput = document.getElementById("backupImportInput");
  const restoreDraftBtn = document.getElementById("restoreDraftBtn");
  const systemResetShowBtn = document.getElementById("systemResetShowBtn");
  const archiveShowBtn = document.getElementById("archiveShowBtn");
  const duplicateShowBtn = document.getElementById("duplicateShowBtn");
  const clearRuntimeBtn = document.getElementById("clearRuntimeBtn");
  const systemLastSync = document.getElementById("systemLastSync");
  const systemCurrentShow = document.getElementById("systemCurrentShow");
  const activitySearchInput = document.getElementById("activitySearchInput");
  const clearActivityBtn = document.getElementById("clearActivityBtn");
  const activityLogTableBody = document.querySelector("#activityLogTable tbody");
  const footerStatusEl = document.getElementById("footerStatus");

  let showData = null;
  let items = [];
  let setupDraft = [];
  let importDraft = [];
  let settingsDraft = mergeSettings();
  let activityLog = [];
  let setupLoaded = false;
  let lastSnapshot = null;
  let actionInFlight = false;

  function activeSorted() {
    return activeItemsForPlan(items, planForShow(showData, items));
  }

  function currentSet() {
    const active = activeSorted();
    return {
      current: active.find((item) => item.status === "live") || active.find((item) => item.id === showData?.currentItemId) || null,
      backstage: active.find((item) => item.status === "backstage") || null,
      deck: active.find((item) => item.status === "blue") || null,
    };
  }

  function setActionButtonsDisabled(disabled) {
    if (startBtn) startBtn.disabled = disabled;
    if (endBtn) endBtn.disabled = disabled;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function branchLabel(branch) {
    const normalized = normalizeBranch(branch);
    if (normalized === PLAN_WITH_INTERMISSION) return "With Intermission";
    if (normalized === PLAN_SKIP_INTERMISSION) return "Skip Intermission";
    if (normalized === PLAN_LINEAR) return "Linear";
    if (normalized === "core") return "Core";
    if (normalized === "custom") return "Custom";
    return normalized ? normalized.toUpperCase() : "-";
  }

  function orderForRunMode(item, mode, activePlan) {
    if (mode === PLAN_WITH_INTERMISSION) return item.orderWithIntermission ?? item.order ?? item.seedIndex + 1;
    if (mode === PLAN_SKIP_INTERMISSION) return item.orderSkipIntermission ?? item.order ?? item.seedIndex + 1;
    if (mode === PLAN_LINEAR || mode === "core") return item.order ?? item.orderWithIntermission ?? item.orderSkipIntermission ?? item.seedIndex + 1;
    if (mode === "active") return planOrder(item, activePlan) ?? item.order ?? item.seedIndex + 1;
    return item.order ?? item.orderWithIntermission ?? item.orderSkipIntermission ?? item.seedIndex + 1;
  }

  function getRunModePlan(mode, activePlan) {
    if (mode === PLAN_WITH_INTERMISSION || mode === PLAN_SKIP_INTERMISSION || mode === PLAN_LINEAR) return mode;
    return activePlan;
  }

  function formatSignedDuration(seconds) {
    if (seconds == null || Number.isNaN(seconds)) return "-";
    if (seconds === 0) return "00:00";
    return `${seconds > 0 ? "+" : "-"}${formatDuration(Math.abs(seconds))}`;
  }

  function formatHms(totalSeconds) {
    if (totalSeconds == null || Number.isNaN(totalSeconds)) return "-";
    const clamped = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(clamped / 3600);
    const minutes = Math.floor((clamped % 3600) / 60);
    const seconds = clamped % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function formatSignedHms(seconds) {
    if (seconds == null || Number.isNaN(seconds)) return "-";
    if (seconds === 0) return "00:00:00";
    return `${seconds > 0 ? "+" : "-"}${formatHms(Math.abs(seconds))}`;
  }

  function elapsedForRunItem(item) {
    const start = normalizeTimestamp(item?.actualStartAt);
    if (!start) return null;
    const end = normalizeTimestamp(item?.actualEndAt);
    const live = String(item?.status || "").toLowerCase() === "live";
    const stop = end || (live ? new Date() : null);
    if (!stop) return null;
    return Math.max(0, Math.round((stop - start) / 1000));
  }

  function manualChangeNotesHtml(item) {
    const notes = String(item?.changeNotes || "").split(/\n|,/).map((line) => line.trim()).filter(Boolean);
    if (!notes.length) return "-";
    return `<div class="change-pills">${notes.map((line) => {
      const type = line.startsWith("-") ? "remove" : line.startsWith("+") ? "add" : "";
      return `<span class="pill ${type}">${escapeHtml(line)}</span>`;
    }).join("")}</div>`;
  }

  function runSearchText(item) {
    return [
      item.title,
      item.type,
      item.status,
      branchLabel(item.branch),
      peopleText(item),
      getRequirement(item, "mics"),
      getRequirement(item, "chairs"),
      getRequirement(item, "instruments"),
      getRequirement(item, "other"),
      item.changeNotes,
      item.notes,
    ].join(" ").toLowerCase();
  }

  function refreshRunTypeFilter() {
    if (!rosTypeFilter) return;
    const selected = rosTypeFilter.value;
    const types = [...new Set(items.map((item) => String(item.type || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    rosTypeFilter.innerHTML = `<option value="">All types</option>${types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}`;
    if (types.includes(selected)) rosTypeFilter.value = selected;
  }

  function runRowsForCurrentFilters() {
    const activePlan = planForShow(showData, items);
    const mode = rosBranchFilter?.value || "active";
    const plan = getRunModePlan(mode, activePlan);
    let base = [];
    if (mode === "active") base = activeItemsForPlan(items, activePlan);
    else if (mode === "all") base = [...items];
    else if (mode === "core") base = items.filter((item) => {
      const branch = normalizeBranch(item.branch);
      return !branch || branch === "core" || branch === PLAN_LINEAR;
    });
    else base = activeItemsForPlan(items, plan);

    const search = String(rosSearchInput?.value || "").trim().toLowerCase();
    const statusFilter = String(rosStatusFilter?.value || "").toLowerCase();
    const typeFilter = String(rosTypeFilter?.value || "");
    const showCompleted = rosShowCompletedToggle?.checked !== false;

    return base
      .filter((item) => {
        const status = String(item.status || "queued").toLowerCase();
        if (!showCompleted && status === "done") return false;
        if (statusFilter && status !== statusFilter) return false;
        if (typeFilter && String(item.type || "") !== typeFilter) return false;
        if (search && !runSearchText(item).includes(search)) return false;
        return true;
      })
      .sort((a, b) => {
        const aOrder = orderForRunMode(a, mode, activePlan);
        const bOrder = orderForRunMode(b, mode, activePlan);
        return (aOrder || 9999) - (bOrder || 9999);
      })
      .map((item) => {
        const elapsed = elapsedForRunItem(item);
        const variance = elapsed == null ? null : elapsed - (item.plannedSeconds || 0);
        return {
          item,
          order: orderForRunMode(item, mode, activePlan),
          activeForPlan: isActiveForPlan(item, activePlan),
          elapsed,
          variance,
        };
      });
  }

  function dateDisplay(date) {
    const d = normalizeTimestamp(date);
    if (!d) return "";
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  }

  function getReportBaseItems() {
    const activePlan = planForShow(showData, items);
    const mode = reportsBranchFilter?.value || "active";
    const plan = getRunModePlan(mode, activePlan);
    let base = [];
    if (mode === "active") base = activeItemsForPlan(items, activePlan);
    else if (mode === "all") base = [...items];
    else if (mode === "core") base = items.filter((item) => {
      const branch = normalizeBranch(item.branch);
      return !branch || branch === "core" || branch === PLAN_LINEAR;
    });
    else base = activeItemsForPlan(items, plan);
    return base.sort((a, b) => (orderForRunMode(a, mode, activePlan) || 9999) - (orderForRunMode(b, mode, activePlan) || 9999));
  }

  function buildReportRows(baseItems = getReportBaseItems()) {
    const activePlan = planForShow(showData, items);
    const mode = reportsBranchFilter?.value || "active";
    return baseItems.map((item) => {
      const status = String(item.status || "queued").toLowerCase();
      const actualDuration = elapsedForRunItem(item);
      const completed = status === "done" || !!normalizeTimestamp(item.actualEndAt);
      const live = status === "live" && !!normalizeTimestamp(item.actualStartAt);
      const variance = actualDuration == null ? null : actualDuration - (item.plannedSeconds || 0);
      return {
        item,
        order: orderForRunMode(item, mode, activePlan),
        status,
        completed,
        live,
        actualDuration,
        variance,
      };
    });
  }

  function reportSearchText(row) {
    const item = row.item;
    return [
      item.title,
      item.type,
      displayStatus(row.status),
      peopleText(item),
      item.notes,
      item.changeNotes,
      branchLabel(item.branch),
    ].join(" ").toLowerCase();
  }

  function filteredReportRows() {
    const search = String(reportSearchInput?.value || "").trim().toLowerCase();
    const statusFilter = String(reportStatusFilter?.value || "").toLowerCase();
    const typeFilter = String(reportTypeFilter?.value || "");
    return buildReportRows().filter((row) => {
      if (search && !reportSearchText(row).includes(search)) return false;
      if (typeFilter && String(row.item.type || "") !== typeFilter) return false;
      if (statusFilter === "incomplete") return row.actualDuration == null;
      if (statusFilter && row.status !== statusFilter) return false;
      return true;
    });
  }

  function computeReportMetrics(rows) {
    const plannedRuntime = rows.reduce((sum, row) => sum + (row.item.plannedSeconds || 0), 0);
    const timedRows = rows.filter((row) => row.actualDuration != null);
    const completedTimedRows = timedRows.filter((row) => row.completed);
    const starts = rows.map((row) => normalizeTimestamp(row.item.actualStartAt)).filter(Boolean);
    const ends = rows.map((row) => normalizeTimestamp(row.item.actualEndAt)).filter(Boolean);
    let actualRuntime = null;
    if (starts.length && ends.length && !rows.some((row) => row.live)) {
      const firstStart = new Date(Math.min(...starts.map((date) => date.getTime())));
      const lastEnd = new Date(Math.max(...ends.map((date) => date.getTime())));
      actualRuntime = Math.max(0, Math.round((lastEnd - firstStart) / 1000));
    } else if (timedRows.length) {
      actualRuntime = timedRows.reduce((sum, row) => sum + (row.actualDuration || 0), 0);
    }
    const variance = actualRuntime == null ? null : actualRuntime - plannedRuntime;
    const positiveDelays = completedTimedRows.map((row) => row.variance).filter((value) => value > 0);
    const averageDelay = positiveDelays.length ? Math.round(positiveDelays.reduce((sum, value) => sum + value, 0) / positiveDelays.length) : null;
    const categories = {
      onTime: completedTimedRows.filter((row) => row.variance <= 30).length,
      minor: completedTimedRows.filter((row) => row.variance > 30 && row.variance <= 120).length,
      major: completedTimedRows.filter((row) => row.variance > 120).length,
      noData: rows.filter((row) => !row.completed || row.actualDuration == null).length,
    };
    return {
      plannedRuntime,
      actualRuntime,
      variance,
      averageDelay,
      transitions: Math.max(0, rows.length - 1),
      timedRows,
      completedTimedRows,
      categories,
    };
  }

  function refreshReportFilters(rows) {
    if (!reportTypeFilter) return;
    const selected = reportTypeFilter.value;
    const types = [...new Set(rows.map((row) => String(row.item.type || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    reportTypeFilter.innerHTML = `<option value="">All types</option>${types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}`;
    if (types.includes(selected)) reportTypeFilter.value = selected;
  }

  function reportStatusLabel(row) {
    if (row.live) return "LIVE";
    if (row.actualDuration == null) return row.completed ? "INCOMPLETE" : "NO DATA";
    if (row.variance > 30) return "DELAYED";
    if (row.variance < -30) return "AHEAD";
    if (row.completed) return "ON TIME";
    return displayStatus(row.status);
  }

  function varianceClass(variance) {
    if (variance == null) return "signal-muted";
    if (variance > 10) return "signal-danger";
    if (variance < -10) return "signal-success";
    return "signal-info";
  }

  function emptyState(title, message) {
    return `<div class="report-empty"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div>`;
  }

  function setByPath(target, path, value) {
    const parts = path.split(".");
    let cursor = target;
    parts.slice(0, -1).forEach((part) => {
      cursor[part] = cursor[part] || {};
      cursor = cursor[part];
    });
    cursor[parts[parts.length - 1]] = value;
  }

  function getByPath(target, path) {
    return path.split(".").reduce((cursor, part) => cursor?.[part], target);
  }

  function settingsStatus(message, state = "saved") {
    if (!settingsSaveState) return;
    settingsSaveState.textContent = message;
    settingsSaveState.classList.toggle("unsaved", state === "unsaved");
    settingsSaveState.classList.toggle("saved", state === "saved");
  }

  function renderSettingsForm() {
    settingsDraft = mergeSettings(settingsDraft);
    document.querySelectorAll("[data-profile]").forEach((row) => {
      const key = row.dataset.profile;
      const profile = settingsDraft.displayProfiles[key];
      row.querySelectorAll("[data-profile-field]").forEach((input) => {
        const field = input.dataset.profileField;
        if (input.type === "checkbox") input.checked = !!profile[field];
        else input.value = profile[field] ?? "";
      });
    });
    document.querySelectorAll("[data-setting-path]").forEach((input) => {
      const value = getByPath(settingsDraft, input.dataset.settingPath);
      if (input.type === "checkbox") input.checked = !!value;
      else input.value = value ?? "";
    });
    settingsStatus("All changes saved", "saved");
  }

  function readSettingsForm() {
    const next = mergeSettings(settingsDraft);
    document.querySelectorAll("[data-profile]").forEach((row) => {
      const key = row.dataset.profile;
      const profile = { ...(next.displayProfiles[key] || {}) };
      row.querySelectorAll("[data-profile-field]").forEach((input) => {
        const field = input.dataset.profileField;
        profile[field] = input.type === "number" ? Number(input.value) : input.value;
      });
      next.displayProfiles[key] = profile;
    });
    document.querySelectorAll("[data-setting-path]").forEach((input) => {
      setByPath(next, input.dataset.settingPath, input.type === "checkbox" ? input.checked : input.type === "number" ? Number(input.value) : input.value);
    });
    settingsDraft = sanitizeSettings(next);
    return settingsDraft;
  }

  function markSettingsUnsaved() {
    readSettingsForm();
    settingsStatus("Unsaved changes", "unsaved");
  }

  async function saveSettingsDraft({ apply = false } = {}) {
    const nextSettings = readSettingsForm();
    await updateDoc(showRef, {
      settings: nextSettings,
      updatedAt: serverTimestamp(),
    });
    showData = { ...(showData || {}), settings: nextSettings };
    if (apply) applyDisplaySettings(nextSettings);
    settingsStatus(apply ? "All changes saved and applied" : "Draft saved", "saved");
  }

  function loadSettingsFromShow() {
    settingsDraft = mergeSettings(showData?.settings || {});
    renderSettingsForm();
    applyDisplaySettings(settingsDraft);
  }

  function applyPresetToProfiles(presetKey) {
    const preset = DISPLAY_PRESETS[presetKey] || {};
    if (!Object.keys(preset).length) {
      settingsStatus("Custom profile editing enabled", "unsaved");
      return;
    }
    readSettingsForm();
    Object.keys(settingsDraft.displayProfiles).forEach((profileKey) => {
      settingsDraft.displayProfiles[profileKey] = sanitizeProfile({ ...settingsDraft.displayProfiles[profileKey], ...preset }, DEFAULT_SETTINGS.displayProfiles[profileKey]);
    });
    renderSettingsForm();
    settingsStatus("Preset applied. Save to keep it.", "unsaved");
  }

  function setupStatus(message, tone = "") {
    if (!setupStatusEl) return;
    setupStatusEl.textContent = message;
    setupStatusEl.classList.toggle("warn", tone === "warn");
    setupStatusEl.classList.toggle("saved", tone === "saved");
  }

  function readSetupDraftFromDom() {
    if (!setupTableBody) return setupDraft;
    setupDraft = [...setupTableBody.querySelectorAll("tr")].map((row, index) => {
      const get = (selector) => row.querySelector(selector)?.value ?? "";
      const order = Number(get("[data-field='order']")) || index + 1;
      const type = get("[data-field='type']").trim() || "OTHER";
      return {
        id: row.dataset.id || slugifyId(get("[data-field='title']"), index),
        order,
        title: get("[data-field='title']").trim() || `Item ${index + 1}`,
        type,
        plannedSeconds: Math.max(0, parsePlannedSeconds(get("[data-field='planned']")) || 0),
        performers: parsePeople(get("[data-field='performers']")),
        branch: normalizeBranch(get("[data-field='branch']")),
        requirements: {
          mics: get("[data-field='mics']").trim() || defaultRequirements(type).mics,
          chairs: get("[data-field='chairs']").trim() || defaultRequirements(type).chairs,
          instruments: get("[data-field='instruments']").trim() || defaultRequirements(type).instruments,
          other: get("[data-field='other']").trim() || defaultRequirements(type).other,
        },
        changeNotes: get("[data-field='changeNotes']").trim(),
        notes: get("[data-field='notes']").trim(),
      };
    });
    return setupDraft;
  }

  function renderSetupTable() {
    if (!setupTableBody) return;
    const search = String(setupSearchInput?.value || "").trim().toLowerCase();
    const branchFilter = String(setupBranchFilter?.value || "");
    const visibleDraft = setupDraft.filter((item) => {
      const branchOk = !branchFilter || normalizeBranch(item.branch) === branchFilter;
      const haystack = `${item.title || ""} ${item.type || ""} ${peopleText(item)} ${item.notes || ""}`.toLowerCase();
      return branchOk && (!search || haystack.includes(search));
    });
    const rows = visibleDraft.map((item) => {
      const index = setupDraft.indexOf(item);
      const planned = formatPlannedInput(Number(item.plannedSeconds) || 0);
      const type = item.type || "OTHER";
      const req = item.requirements || defaultRequirements(type);
      const performers = peopleList(item).join(", ");
      const branch = normalizeBranch(item.branch);
      return `
        <tr data-id="${escapeHtml(item.id || slugifyId(item.title, index))}">
          <td><input class="setup-order" data-field="order" type="number" min="1" step="1" value="${escapeHtml(item.order || index + 1)}" /></td>
          <td><input class="setup-title" data-field="title" type="text" value="${escapeHtml(item.title || "")}" /></td>
          <td><input data-field="type" type="text" list="setupTypeOptions" value="${escapeHtml(type)}" /></td>
          <td><input data-field="planned" type="text" value="${escapeHtml(planned)}" /></td>
          <td><textarea class="setup-people" data-field="performers">${escapeHtml(performers)}</textarea></td>
          <td>
            <div class="setup-req-fields">
              <input data-field="mics" type="text" value="${escapeHtml(req.mics || "")}" aria-label="Mics" />
              <input data-field="chairs" type="text" value="${escapeHtml(req.chairs || "")}" aria-label="Chairs" />
              <input data-field="instruments" type="text" value="${escapeHtml(req.instruments || "")}" aria-label="Instruments" />
              <input data-field="other" type="text" value="${escapeHtml(req.other || "")}" aria-label="Other requirements" />
            </div>
          </td>
          <td>
            <select data-field="branch">
              <option value="core"${branch === "core" ? " selected" : ""}>Core / Linear</option>
              <option value="${PLAN_WITH_INTERMISSION}"${branch === PLAN_WITH_INTERMISSION ? " selected" : ""}>With Intermission</option>
              <option value="${PLAN_SKIP_INTERMISSION}"${branch === PLAN_SKIP_INTERMISSION ? " selected" : ""}>Skip Intermission</option>
              <option value="custom"${branch === "custom" ? " selected" : ""}>Custom / Inactive</option>
            </select>
          </td>
          <td><textarea data-field="changeNotes">${escapeHtml(item.changeNotes || "")}</textarea></td>
          <td><textarea data-field="notes">${escapeHtml(item.notes || "")}</textarea></td>
          <td>
            <div class="setup-row-actions">
              <button class="secondary" type="button" data-action="up">Up</button>
              <button class="secondary" type="button" data-action="down">Down</button>
              <button class="danger" type="button" data-action="delete">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });
    setupTableBody.innerHTML = rows.join("");
    if (setupPaginationLabel) setupPaginationLabel.textContent = `Showing ${visibleDraft.length} of ${setupDraft.length} setup rows`;
  }

  function addSetupItem() {
    readSetupDraftFromDom();
    const nextOrder = setupDraft.length + 1;
    setupDraft.push({
      id: slugifyId("new-item", setupDraft.length),
      order: nextOrder,
      title: `New Item ${nextOrder}`,
      type: "OTHER",
      plannedSeconds: 180,
      performers: [],
      branch: "core",
      requirements: defaultRequirements("OTHER"),
      changeNotes: "",
      notes: "",
    });
    renderSetupTable();
    setupStatus("New item added. Save setup when ready.", "warn");
  }

  function loadSetupDraft(source = "saved") {
    setupDraft = setupItemsFromShow(showData, source === "runtime" ? items : []);
    if (setupTitleInput) setupTitleInput.value = showData?.setupTitle || showData?.displayName || "";
    if (setupDateInput) setupDateInput.value = showData?.showDate || "";
    if (setupVenueInput) setupVenueInput.value = showData?.venue || "";
    if (setupTimezoneInput) setupTimezoneInput.value = showData?.timezone || "";
    renderSetupTable();
    setupStatus(source === "runtime" ? "Loaded current live items into setup." : "Loaded saved setup.", source === "runtime" ? "warn" : "");
    if (setupSourceLabel) setupSourceLabel.textContent = source === "runtime" ? "Live items / fallback" : "Saved setup";
  }

  async function saveSetupDraft() {
    readSetupDraftFromDom();
    if (!setupDraft.length) throw new Error("Add at least one show item before saving setup.");
    if (showHasStarted(showData, items) && !confirm("The show has already started. Save setup changes for the next reset?")) return;
    const sorted = [...setupDraft].sort((a, b) => (a.order || 0) - (b.order || 0)).map((item, index) => ({ ...item, order: index + 1 }));
    setupDraft = sorted;
    const title = setupTitleInput?.value?.trim() || showData?.displayName || "";
    const nextShowData = {
      ...(showData || {}),
      displayName: title || "Stage Management System",
      setupTitle: title,
      showDate: setupDateInput?.value || "",
      venue: setupVenueInput?.value?.trim() || "",
      timezone: setupTimezoneInput?.value?.trim() || "",
      setupItems: sorted,
      setupUpdatedAt: new Date(),
    };
    const batch = writeBatch(db);
    batch.set(showRef, { ...nextShowData, setupUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await batch.commit();
    showData = nextShowData;
    renderSetupTable();
    setupStatus("Setup saved. Init Show / Reset will use it.", "saved");
    if (setupSourceLabel) setupSourceLabel.textContent = "Saved setup";
    addActivity("INFO", "Show Setup", "Save Setup", `Saved ${sorted.length} setup rows.`);
  }

  function importStatus(message, tone = "") {
    if (!importStatusEl) return;
    importStatusEl.textContent = message;
    importStatusEl.classList.toggle("warn", tone === "warn");
    importStatusEl.classList.toggle("saved", tone === "saved");
    importStatusEl.classList.toggle("danger", tone === "danger");
  }

  function setImportMetrics(total = 0, valid = 0, warnings = 0, errors = 0) {
    if (importTotalItemsEl) importTotalItemsEl.textContent = String(total);
    if (importValidRowsEl) importValidRowsEl.textContent = String(valid);
    if (importWarningsEl) importWarningsEl.textContent = String(warnings);
    if (importErrorsEl) importErrorsEl.textContent = String(errors);
  }

  function canonicalHeader(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function valueFromRow(row, names) {
    const wanted = new Set(names.map(canonicalHeader));
    const key = Object.keys(row).find((candidate) => wanted.has(canonicalHeader(candidate)));
    return key ? row[key] : "";
  }

  function setupItemFromImportRow(row, index) {
    const title = String(valueFromRow(row, ["Title", "Item", "Name"]) || "").trim();
    const plannedRaw = valueFromRow(row, ["Planned", "Planned Time", "Duration"]);
    const plannedSeconds = parsePlannedSeconds(plannedRaw);
    const errors = [];
    if (!title) errors.push("Title is required.");
    if (!Number.isFinite(plannedSeconds) || plannedSeconds < 0) errors.push("Planned must be seconds, mm:ss, or h:mm:ss.");
    const type = String(valueFromRow(row, ["Type"]) || "OTHER").trim() || "OTHER";
    return {
      item: {
        id: slugifyId(title, index),
        order: Number(valueFromRow(row, ["Order", "#"])) || index + 1,
        title: title || `Row ${index + 2}`,
        type,
        plannedSeconds: Number.isFinite(plannedSeconds) ? plannedSeconds : 0,
        performers: parsePeople(valueFromRow(row, ["People", "Performers", "Captains"])),
        branch: normalizeBranch(valueFromRow(row, ["Branch"])),
        requirements: {
          mics: String(valueFromRow(row, ["Mics", "Microphones"]) || defaultRequirements(type).mics).trim(),
          chairs: String(valueFromRow(row, ["Chairs"]) || defaultRequirements(type).chairs).trim(),
          instruments: String(valueFromRow(row, ["Instruments"]) || defaultRequirements(type).instruments).trim(),
          other: String(valueFromRow(row, ["Other", "Other Requirements"]) || defaultRequirements(type).other).trim(),
        },
        changeNotes: String(valueFromRow(row, ["Change Notes", "Changes"]) || "").trim(),
        notes: String(valueFromRow(row, ["Notes"]) || "").trim(),
      },
      errors,
    };
  }

  async function loadXlsxLibrary() {
    if (window.XLSX) return window.XLSX;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-xlsx-loader]");
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = XLSX_CDN_URL;
      script.async = true;
      script.dataset.xlsxLoader = "true";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load the Excel parser. Check internet access and try again."));
      document.head.appendChild(script);
    });
    return window.XLSX;
  }

  function renderImportPreview(results) {
    if (!importPreviewEl) return;
    if (!results.length) {
      importPreviewEl.innerHTML = "";
      setImportMetrics(0, 0, 0, 0);
      return;
    }
    const errorCount = results.filter((result) => result.errors.length).length;
    const warningCount = results.filter((result) => !result.errors.length && (!result.item.performers.length || !result.item.plannedSeconds)).length;
    setImportMetrics(results.length, results.length - errorCount, warningCount, errorCount);
    const rows = results.slice(0, 12).map((result, index) => `
      <tr class="${result.errors.length ? "invalid" : ""}">
        <td>${index + 1}</td>
        <td>${escapeHtml(result.item.title)}</td>
        <td>${escapeHtml(result.item.type)}</td>
        <td>${escapeHtml(formatDuration(result.item.plannedSeconds))}</td>
        <td>${escapeHtml(result.item.performers.join(", "))}</td>
        <td>${escapeHtml(result.item.branch)}</td>
        <td>${result.errors.length ? escapeHtml(result.errors.join(" ")) : "OK"}</td>
      </tr>
    `).join("");
    importPreviewEl.innerHTML = `
      <table class="table preview-table">
        <thead><tr><th>#</th><th>Title</th><th>Type</th><th>Planned</th><th>People</th><th>Branch</th><th>Validation</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  async function previewExcelImport() {
    const file = excelImportInput?.files?.[0];
    if (!file) {
      importStatus("Choose an .xlsx file first.", "warn");
      return;
    }
    const XLSX = await loadXlsxLibrary();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!rows.length) throw new Error("The first worksheet has no data rows.");
    const headers = Object.keys(rows[0]).map(canonicalHeader);
    const missing = ["order", "title", "type", "planned"].filter((required) => !headers.includes(required));
    if (missing.length) {
      importDraft = [];
      renderImportPreview([]);
      importStatus(`Missing required columns: ${missing.join(", ")}.`, "danger");
      if (applyImportBtn) applyImportBtn.disabled = true;
      return;
    }
    const results = rows.map(setupItemFromImportRow);
    const badCount = results.filter((result) => result.errors.length).length;
    importDraft = badCount ? [] : results.map((result, index) => ({ ...result.item, order: index + 1 }));
    renderImportPreview(results);
    if (applyImportBtn) applyImportBtn.disabled = badCount > 0;
    importStatus(badCount ? `${badCount} row(s) need fixes before import.` : `${results.length} row(s) ready to import.`, badCount ? "danger" : "saved");
  }

  async function applyExcelImport() {
    if (!importDraft.length) {
      importStatus("Preview a valid import first.", "warn");
      return;
    }
    if (!confirm("Replace the current Show Setup with the imported rows?")) return;
    setupDraft = importDraft.map((item, index) => ({ ...item, order: index + 1 }));
    renderSetupTable();
    await saveSetupDraft();
    importStatus("Imported setup saved to Firestore.", "saved");
    addActivity("INFO", "Show Setup", "Apply Import", `Imported ${setupDraft.length} setup rows.`);
  }

  async function withActionLock(fn) {
    if (actionInFlight) return;
    actionInFlight = true;
    setActionButtonsDisabled(true);
    try {
      await fn();
    } finally {
      actionInFlight = false;
      setActionButtonsDisabled(false);
    }
  }

  function snapshotState() {
    return {
      show: {
        currentItemId: showData?.currentItemId,
        status: showData?.status,
        holdMessage: showData?.holdMessage || "",
        intermissionPlan: planForShow(showData, items),
        intermissionDecisionLocked: !!showData?.intermissionDecisionLocked,
        actualShowStartAt: showData?.actualShowStartAt || null,
        targetRuntimeSeconds: getTargetRuntimeSeconds(showData),
        safetyBufferMinutes: Number(showData?.safetyBufferMinutes ?? DEFAULT_SAFETY_BUFFER_MINUTES),
        projectedEndAt: showData?.projectedEndAt || null,
        offsetSeconds: showData?.offsetSeconds || 0,
      },
      items: items.map((item) => ({
        id: item.id,
        status: item.status,
        actualStartAt: item.actualStartAt || null,
        actualEndAt: item.actualEndAt || null,
        plannedSeconds: item.plannedSeconds || 0,
      })),
    };
  }

  async function undoSnapshot(snapshot) {
    if (!snapshot) return;
    const batch = writeBatch(db);
    snapshot.items.forEach((item) => {
      batch.update(doc(itemsRef, item.id), {
        status: item.status,
        actualStartAt: item.actualStartAt || null,
        actualEndAt: item.actualEndAt || null,
        plannedSeconds: item.plannedSeconds,
      });
    });
    batch.update(showRef, {
      ...snapshot.show,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  }

  function renderRunTable() {
    if (!runTableBody) return;
    const active = activeSorted();
    const orderMap = activeOrderById(items, planForShow(showData, items));
    runTableBody.innerHTML = "";
    active.forEach((item) => {
      const status = String(item.status || "queued").toLowerCase();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${orderMap.get(item.id)}</td>
        <td>${item.title}</td>
        <td>${item.type}</td>
        <td><span class="tag ${status}">${displayStatus(status)}</span></td>
        <td>${formatDuration(item.plannedSeconds)}</td>
        <td>${peopleText(item)}</td>
        <td>${formatClock(item.actualStartAt)}</td>
        <td>${formatClock(item.actualEndAt)}</td>
        <td class="advanced" style="display:none;">
          <div class="flex">
            <button data-action="set" data-id="${item.id}" class="secondary">Set current</button>
            <button data-action="edit" data-id="${item.id}" class="secondary">Edit planned</button>
          </div>
        </td>
      `;
      runTableBody.appendChild(row);
    });
  }

  function renderRunOfShow() {
    if (!rosTableBody) return;
    refreshRunTypeFilter();
    const activePlan = planForShow(showData, items);
    const mode = rosBranchFilter?.value || "active";
    const active = activeItemsForPlan(items, activePlan);
    const { current, backstage, deck } = currentSet();
    const rows = runRowsForCurrentFilters();
    const completed = active.filter((item) => String(item.status || "").toLowerCase() === "done").length;

    if (rosActivePlanEl) rosActivePlanEl.textContent = planLabel(activePlan);
    if (rosLiveItemEl) rosLiveItemEl.textContent = current?.title || "-";
    if (rosNextItemEl) rosNextItemEl.textContent = [backstage?.title, deck?.title].filter(Boolean).join(" / ") || "-";
    if (rosCompletedCountEl) rosCompletedCountEl.textContent = `${completed} / ${active.length || 0}`;
    if (rosSummaryEl) {
      const modeLabel = rosBranchFilter?.selectedOptions?.[0]?.textContent || "Active Plan Only";
      rosSummaryEl.textContent = `${modeLabel} - ${rows.length} visible of ${items.length} runtime items`;
    }
    if (rosCountLabel) rosCountLabel.textContent = `Showing ${rows.length} runtime item${rows.length === 1 ? "" : "s"}`;

    if (!rows.length) {
      rosTableBody.innerHTML = `
        <tr>
          <td colspan="17" class="empty-cell">No runtime items match the current filters.</td>
        </tr>
      `;
      return;
    }

    rosTableBody.innerHTML = rows.map(({ item, order, activeForPlan, elapsed, variance }) => {
      const status = String(item.status || "queued").toLowerCase();
      const isCurrent = item.id === current?.id;
      const varianceClass = variance == null ? "signal-muted" : variance > 10 ? "signal-danger" : variance < -10 ? "signal-success" : "signal-info";
      const inactiveNote = !activeForPlan && mode === "all" ? `<span class="branch-note">Inactive branch</span>` : "";
      return `
        <tr data-item-id="${escapeHtml(item.id)}" class="${isCurrent ? "run-current-row" : ""} ${!activeForPlan && mode === "all" ? "run-inactive-row" : ""}">
          <td>${escapeHtml(order || "-")}</td>
          <td><strong>${escapeHtml(item.title || "-")}</strong>${inactiveNote}</td>
          <td>${escapeHtml(item.type || "-")}</td>
          <td><span class="tag ${escapeHtml(status)}">${displayStatus(status)}</span></td>
          <td><span class="branch-chip">${escapeHtml(branchLabel(item.branch))}</span></td>
          <td>${formatDuration(item.plannedSeconds)}</td>
          <td>${formatClock(item.actualStartAt)}</td>
          <td>${formatClock(item.actualEndAt)}</td>
          <td>${elapsed == null ? "-" : formatDuration(elapsed)}</td>
          <td class="${varianceClass}">${formatSignedDuration(variance)}</td>
          <td>${escapeHtml(peopleText(item))}</td>
          <td>${escapeHtml(getRequirement(item, "mics"))}</td>
          <td>${escapeHtml(getRequirement(item, "chairs"))}</td>
          <td>${escapeHtml(getRequirement(item, "instruments"))}</td>
          <td>${escapeHtml(getRequirement(item, "other"))}</td>
          <td>${manualChangeNotesHtml(item)}</td>
          <td>${escapeHtml(item.notes || "-")}</td>
        </tr>
      `;
    }).join("");
  }

  function renderRuntimeTrend(rows, metrics) {
    if (!runtimeTrendChart) return;
    if (metrics.timedRows.length < 2) {
      runtimeTrendChart.innerHTML = emptyState("Trend pending", "Runtime trend appears after at least two items have actual timing.");
      return;
    }
    const width = 640;
    const height = 250;
    const pad = 34;
    const plotted = rows.map((row, index) => ({ ...row, index })).filter((row) => row.actualDuration != null);
    let plannedCum = 0;
    let actualCum = 0;
    const points = plotted.map((row, idx) => {
      plannedCum += row.item.plannedSeconds || 0;
      actualCum += row.actualDuration || 0;
      return { idx, title: row.item.title || "", planned: plannedCum, actual: actualCum, variance: actualCum - plannedCum };
    });
    const maxY = Math.max(...points.flatMap((point) => [point.planned, point.actual, Math.abs(point.variance)]), 60);
    const xFor = (idx) => pad + (idx / Math.max(1, points.length - 1)) * (width - pad * 2);
    const yFor = (value) => height - pad - (value / maxY) * (height - pad * 2);
    const varianceBase = height - pad;
    const varianceScale = (height - pad * 2) / Math.max(60, maxY);
    const line = (key) => points.map((point, idx) => `${idx ? "L" : "M"}${xFor(idx).toFixed(1)} ${yFor(point[key]).toFixed(1)}`).join(" ");
    const varianceLine = points.map((point, idx) => `${idx ? "L" : "M"}${xFor(idx).toFixed(1)} ${(varianceBase - point.variance * varianceScale).toFixed(1)}`).join(" ");
    runtimeTrendChart.innerHTML = `
      <svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Runtime trend chart">
        <g class="grid-lines">
          <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}"></line>
          <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}"></line>
          <line x1="${pad}" y1="${yFor(maxY / 2).toFixed(1)}" x2="${width - pad}" y2="${yFor(maxY / 2).toFixed(1)}"></line>
        </g>
        <path class="trend-line planned" d="${line("planned")}"></path>
        <path class="trend-line actual" d="${line("actual")}"></path>
        <path class="trend-line variance" d="${varianceLine}"></path>
        ${points.map((point, idx) => `<circle class="trend-point" cx="${xFor(idx).toFixed(1)}" cy="${yFor(point.actual).toFixed(1)}" r="3"><title>${escapeHtml(point.title)} actual ${formatDuration(point.actual)}</title></circle>`).join("")}
      </svg>
      <div class="chart-legend">
        <span><i class="legend-blue"></i>Planned Runtime</span>
        <span><i class="legend-green"></i>Actual Runtime</span>
        <span><i class="legend-purple"></i>Cumulative Variance</span>
      </div>
    `;
  }

  function renderSegmentDurationChart(rows) {
    if (!segmentDurationChart) return;
    if (!rows.length) {
      segmentDurationChart.innerHTML = emptyState("No report items", "Runtime items will appear here once the show is initialized.");
      return;
    }
    const visible = rows.slice(0, 10);
    const maxDuration = Math.max(...visible.flatMap((row) => [row.item.plannedSeconds || 0, row.actualDuration || 0]), 60);
    segmentDurationChart.innerHTML = visible.map((row) => {
      const plannedWidth = Math.max(2, ((row.item.plannedSeconds || 0) / maxDuration) * 100);
      const actual = row.actualDuration;
      const onTime = actual == null ? 0 : Math.min(actual, row.item.plannedSeconds || 0);
      const over = actual == null ? 0 : Math.max(0, actual - (row.item.plannedSeconds || 0));
      const onWidth = (onTime / maxDuration) * 100;
      const overWidth = (over / maxDuration) * 100;
      return `
        <div class="segment-row">
          <div class="segment-name" title="${escapeHtml(row.item.title || "-")}">${escapeHtml(row.item.title || "-")}</div>
          <div class="segment-bars">
            <div class="segment-track planned-track"><span style="width:${plannedWidth.toFixed(2)}%"></span></div>
            <div class="segment-track actual-track">
              ${actual == null ? `<span class="missing" style="width:${plannedWidth.toFixed(2)}%"></span>` : `<span class="on-time" style="width:${onWidth.toFixed(2)}%"></span><span class="overrun" style="width:${overWidth.toFixed(2)}%"></span>`}
            </div>
          </div>
          <div class="segment-time">${actual == null ? "Planned only" : formatDuration(actual)}</div>
        </div>
      `;
    }).join("");
  }

  function renderDelayContributors(rows) {
    if (!delayContributorsList) return;
    const delayed = rows
      .filter((row) => row.variance != null && row.variance > 0)
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 5);
    if (!delayed.length) {
      delayContributorsList.innerHTML = emptyState("No delay contributors yet", "Positive variance will appear here after timed items overrun their plan.");
      return;
    }
    const totalDelay = delayed.reduce((sum, row) => sum + row.variance, 0);
    delayContributorsList.innerHTML = `
      ${delayed.map((row, index) => `
        <div class="delay-row">
          <span>${index + 1}</span>
          <strong>${escapeHtml(row.item.title || "-")}</strong>
          <em class="tag ${escapeHtml(row.status)}">${escapeHtml(row.item.type || displayStatus(row.status))}</em>
          <b>${formatSignedDuration(row.variance)}</b>
        </div>
      `).join("")}
      <div class="delay-total"><span>Total Delay</span><strong>${formatSignedDuration(totalDelay)}</strong></div>
    `;
  }

  function renderTransitionPerformance(rows, metrics) {
    if (!transitionPerformancePanel) return;
    const total = rows.length;
    if (!total || !metrics.completedTimedRows.length) {
      transitionPerformancePanel.innerHTML = emptyState("Transition performance pending", "This panel populates when completed items have actual timing.");
      return;
    }
    const cats = metrics.categories;
    const values = [
      { key: "onTime", label: "On Time (<=30s)", value: cats.onTime, color: "var(--success)" },
      { key: "minor", label: "Minor Delay (31s-2m)", value: cats.minor, color: "var(--warn)" },
      { key: "major", label: "Major Delay (>2m)", value: cats.major, color: "var(--danger)" },
      { key: "noData", label: "Skipped / N/A", value: cats.noData, color: "#718096" },
    ];
    let offset = 0;
    const stops = values.map((item) => {
      const start = offset;
      const end = offset + (item.value / total) * 100;
      offset = end;
      return `${item.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    }).join(", ");
    transitionPerformancePanel.innerHTML = `
      <div class="donut" style="background: conic-gradient(${stops});">
        <div><strong>${total}</strong><span>Total</span></div>
      </div>
      <div class="transition-legend">
        ${values.map((item) => `
          <div>
            <i style="background:${item.color}"></i>
            <span>${escapeHtml(item.label)}</span>
            <strong>${item.value}</strong>
            <em>${total ? Math.round((item.value / total) * 100) : 0}%</em>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderReportSummaryTable(rows) {
    if (!reportSummaryTableBody) return;
    const visible = filteredReportRows();
    if (reportSummaryCount) reportSummaryCount.textContent = `Showing ${visible.length} of ${rows.length} report items`;
    if (!visible.length) {
      reportSummaryTableBody.innerHTML = `<tr><td colspan="8" class="empty-cell">No report rows match the current filters.</td></tr>`;
      return;
    }
    reportSummaryTableBody.innerHTML = visible.map((row) => {
      const statusLabel = reportStatusLabel(row);
      return `
        <tr>
          <td>${escapeHtml(row.order || "-")}</td>
          <td>${escapeHtml(row.item.title || "-")}</td>
          <td><span class="type-chip">${escapeHtml(row.item.type || "-")}</span></td>
          <td>${formatDuration(row.item.plannedSeconds)}</td>
          <td>${row.actualDuration == null ? "Not enough data" : formatDuration(row.actualDuration)}</td>
          <td class="${varianceClass(row.variance)}">${formatSignedDuration(row.variance)}</td>
          <td><span class="tag ${escapeHtml(row.status)}">${escapeHtml(statusLabel)}</span></td>
          <td>${escapeHtml(row.item.notes || "-")}</td>
        </tr>
      `;
    }).join("");
  }

  function renderReportsView() {
    if (!reportSummaryTableBody) return;
    const rows = buildReportRows();
    const metrics = computeReportMetrics(rows);
    refreshReportFilters(rows);
    const timedDates = rows.flatMap((row) => [normalizeTimestamp(row.item.actualStartAt), normalizeTimestamp(row.item.actualEndAt)]).filter(Boolean);
    const firstDate = timedDates.length ? new Date(Math.min(...timedDates.map((date) => date.getTime()))) : null;
    const lastDate = timedDates.length ? new Date(Math.max(...timedDates.map((date) => date.getTime()))) : null;
    if (reportsDateRange) reportsDateRange.value = firstDate && lastDate ? `${dateDisplay(firstDate)} - ${dateDisplay(lastDate)}` : "Current run";
    if (reportsShowSelect) reportsShowSelect.innerHTML = `<option>${escapeHtml(showData?.displayName || showData?.setupTitle || "Current Show")}</option>`;
    if (reportsVenueSelect) reportsVenueSelect.innerHTML = `<option>${escapeHtml(showData?.venue || "All Venues")}</option>`;

    if (reportPlannedRuntimeEl) reportPlannedRuntimeEl.textContent = formatHms(metrics.plannedRuntime);
    if (reportActualRuntimeEl) reportActualRuntimeEl.textContent = metrics.actualRuntime == null ? "Not enough data" : formatHms(metrics.actualRuntime);
    if (reportActualRuntimeNoteEl) reportActualRuntimeNoteEl.textContent = metrics.actualRuntime == null ? "Needs actual start/end data" : "hh:mm:ss";
    if (reportVarianceEl) {
      reportVarianceEl.textContent = formatSignedHms(metrics.variance);
      reportVarianceEl.className = `value ${varianceClass(metrics.variance)}`;
    }
    if (reportVarianceNoteEl) reportVarianceNoteEl.textContent = metrics.variance == null ? "Waiting for actual runtime" : "Actual minus planned";
    if (reportTransitionsEl) reportTransitionsEl.textContent = String(metrics.transitions);
    if (reportAverageDelayEl) reportAverageDelayEl.textContent = metrics.averageDelay == null ? "-" : formatDuration(metrics.averageDelay);

    renderRuntimeTrend(rows, metrics);
    renderSegmentDurationChart(rows);
    renderDelayContributors(rows);
    renderTransitionPerformance(rows, metrics);
    renderReportSummaryTable(rows);
  }

  function renderNowRunningStatus(statusRaw) {
    const s = String(statusRaw || "").toLowerCase();
    if (s === "live") currentStatusEl.innerHTML = `<span class="live-badge"><span class="live-dot"></span>LIVE</span>`;
    else currentStatusEl.textContent = displayStatus(s);
  }

  function renderPlanCard() {
    const branching = hasBranchingItems(items);
    const plan = planForShow(showData, items);
    const locked = !!showData?.intermissionDecisionLocked || hasBranchItemStarted(items);
    const recommendation = getRecommendation(showData, items);
    if (planLabelEl) planLabelEl.textContent = planLabel(plan);
    if (lockStatusEl) {
      lockStatusEl.textContent = locked ? "LOCKED" : "UNLOCKED";
      lockStatusEl.className = `decision-status ${locked ? "locked" : "unlocked"}`;
    }
    if (recommendationEl) {
      recommendationEl.textContent = recommendation;
      recommendationEl.className = `recommendation ${recommendationTone(recommendation)}`;
    }
    if (keepIntermissionBtn) {
      keepIntermissionBtn.style.display = branching ? "" : "none";
      keepIntermissionBtn.disabled = locked || plan === PLAN_WITH_INTERMISSION;
      keepIntermissionBtn.classList.toggle("selected", plan === PLAN_WITH_INTERMISSION);
    }
    if (skipIntermissionBtn) {
      skipIntermissionBtn.style.display = branching ? "" : "none";
      skipIntermissionBtn.disabled = locked || plan === PLAN_SKIP_INTERMISSION;
      skipIntermissionBtn.classList.toggle("selected", plan === PLAN_SKIP_INTERMISSION);
    }
  }

  function formatTimeInput(date) {
    const d = normalizeTimestamp(date);
    if (!d) return "";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function timingSettingsFromDom() {
    const current = { ...DEFAULT_TIMING_SETTINGS, ...(showData?.timingSettings || {}) };
    return {
      lockIntermissionDecision: !!timingLockIntermissionToggle?.checked,
      lockBehavior: timingLockBehaviorSelect?.value || current.lockBehavior,
      changeRequiresOverride: !!timingOverrideToggle?.checked,
      overrideRole: timingOverrideRoleSelect?.value || current.overrideRole,
      defaultTransitionBufferSeconds: Math.max(0, Number(defaultTransitionBufferInput?.value || current.defaultTransitionBufferSeconds)),
      stageClearBufferSeconds: Math.max(0, Number(stageClearBufferInput?.value || current.stageClearBufferSeconds)),
      introOutroBufferSeconds: Math.max(0, Number(introOutroBufferInput?.value || current.introOutroBufferSeconds)),
      gracePeriodSeconds: Math.max(0, Number(gracePeriodInput?.value || current.gracePeriodSeconds)),
      viewRefreshIntervalSeconds: Math.max(0.5, Number(viewRefreshIntervalInput?.value || current.viewRefreshIntervalSeconds)),
      countdownUpdateRateSeconds: Math.max(0.5, Number(countdownUpdateRateInput?.value || current.countdownUpdateRateSeconds)),
      timeSource: timingTimeSourceInput?.value?.trim() || current.timeSource,
    };
  }

  function riskLabel(seconds) {
    if (seconds == null || Number.isNaN(seconds)) return "-";
    if (seconds >= 180) return "LOW";
    if (seconds >= 0) return "MEDIUM";
    return "HIGH";
  }

  function renderTimingDashboard() {
    if (!showData) return;
    const startAt = getActualShowStartAt(showData);
    const targetEnd = getTargetEndAt(showData);
    const runtime = getTargetRuntimeSeconds(showData);
    const timingSettings = { ...DEFAULT_TIMING_SETTINGS, ...(showData.timingSettings || {}) };
    const plan = planForShow(showData, items);
    const withTiming = computeProjectedTiming(showData, items, PLAN_WITH_INTERMISSION);
    const skipTiming = computeProjectedTiming(showData, items, PLAN_SKIP_INTERMISSION);
    const targetEndAt = getTargetEndAt(showData);
    const withBuffer = targetEndAt ? Math.round((targetEndAt - withTiming.projectedEndAt) / 1000) : null;
    const skipBuffer = targetEndAt ? Math.round((targetEndAt - skipTiming.projectedEndAt) / 1000) : null;
    const elapsedShow = startAt ? Math.max(0, Math.round((Date.now() - startAt.getTime()) / 1000)) : null;

    if (timingActualStartCard) timingActualStartCard.textContent = formatClock(startAt);
    if (timingActualStartDate) timingActualStartDate.textContent = dateDisplay(startAt) || "Current show start";
    if (timingTargetEndCard) timingTargetEndCard.textContent = formatClock(targetEnd);
    if (timingCurrentRuntimeCard) timingCurrentRuntimeCard.textContent = elapsedShow == null ? "-" : formatHms(elapsedShow);
    if (timingBufferStatusCard) {
      const currentBuffer = plan === PLAN_SKIP_INTERMISSION ? skipBuffer : withBuffer;
      timingBufferStatusCard.textContent = currentBuffer == null ? "-" : currentBuffer >= 0 ? "ON TRACK" : "BEHIND";
      applySignal(timingBufferStatusCard, currentBuffer == null ? "muted" : currentBuffer >= 0 ? "success" : "danger");
    }
    if (timingBufferNote) {
      const currentBuffer = plan === PLAN_SKIP_INTERMISSION ? skipBuffer : withBuffer;
      timingBufferNote.textContent = currentBuffer == null ? "Safety buffer" : `${formatSignedDuration(currentBuffer)} buffer remaining`;
    }
    if (timingTargetPreview) timingTargetPreview.textContent = formatClock(targetEnd);
    if (timingWithEnd) timingWithEnd.textContent = formatClock(withTiming.projectedEndAt);
    if (timingSkipEnd) timingSkipEnd.textContent = formatClock(skipTiming.projectedEndAt);
    if (timingWithBuffer) timingWithBuffer.textContent = formatSignedDuration(withBuffer);
    if (timingSkipBuffer) timingSkipBuffer.textContent = formatSignedDuration(skipBuffer);
    if (timingWithRisk) timingWithRisk.textContent = riskLabel(withBuffer);
    if (timingSkipRisk) timingSkipRisk.textContent = riskLabel(skipBuffer);
    if (timingWithRecommendation) timingWithRecommendation.textContent = plan === PLAN_WITH_INTERMISSION ? "RECOMMENDED" : "ALTERNATIVE";
    if (timingSkipRecommendation) timingSkipRecommendation.textContent = plan === PLAN_SKIP_INTERMISSION ? "RECOMMENDED" : "ALTERNATIVE";
    if (forecastWithEnd) forecastWithEnd.textContent = formatClock(withTiming.projectedEndAt);
    if (forecastSkipEnd) forecastSkipEnd.textContent = formatClock(skipTiming.projectedEndAt);
    if (forecastWithBuffer) forecastWithBuffer.textContent = `${formatSignedDuration(withBuffer)} buffer`;
    if (forecastSkipBuffer) forecastSkipBuffer.textContent = `${formatSignedDuration(skipBuffer)} buffer`;
    if (forecastStretchTarget) forecastStretchTarget.textContent = formatClock(targetEnd);
    if (forecastStretchPace) forecastStretchPace.textContent = showData.offsetSeconds == null ? "-" : `${showData.offsetSeconds > 0 ? "+" : "-"}${formatDuration(Math.abs(showData.offsetSeconds))} total`;
    if (timingLastSync) timingLastSync.textContent = formatClock(new Date());

    if (timingLockIntermissionToggle && document.activeElement !== timingLockIntermissionToggle) timingLockIntermissionToggle.checked = !!(showData.intermissionDecisionLocked || timingSettings.lockIntermissionDecision);
    if (timingLockBehaviorSelect && document.activeElement !== timingLockBehaviorSelect) timingLockBehaviorSelect.value = timingSettings.lockBehavior;
    if (timingOverrideToggle && document.activeElement !== timingOverrideToggle) timingOverrideToggle.checked = !!timingSettings.changeRequiresOverride;
    if (timingOverrideRoleSelect && document.activeElement !== timingOverrideRoleSelect) timingOverrideRoleSelect.value = timingSettings.overrideRole;
    if (defaultTransitionBufferInput && document.activeElement !== defaultTransitionBufferInput) defaultTransitionBufferInput.value = timingSettings.defaultTransitionBufferSeconds;
    if (stageClearBufferInput && document.activeElement !== stageClearBufferInput) stageClearBufferInput.value = timingSettings.stageClearBufferSeconds;
    if (introOutroBufferInput && document.activeElement !== introOutroBufferInput) introOutroBufferInput.value = timingSettings.introOutroBufferSeconds;
    if (gracePeriodInput && document.activeElement !== gracePeriodInput) gracePeriodInput.value = timingSettings.gracePeriodSeconds;
    if (viewRefreshIntervalInput && document.activeElement !== viewRefreshIntervalInput) viewRefreshIntervalInput.value = timingSettings.viewRefreshIntervalSeconds;
    if (countdownUpdateRateInput && document.activeElement !== countdownUpdateRateInput) countdownUpdateRateInput.value = timingSettings.countdownUpdateRateSeconds;
    if (timingTimeSourceInput && document.activeElement !== timingTimeSourceInput) timingTimeSourceInput.value = timingSettings.timeSource;
    if (timingSaveStatus) timingSaveStatus.textContent = `Target runtime ${formatHms(runtime)}. New buffer fields are saved for operations and future forecasts.`;
  }

  function renderSettings() {
    if (!showData) return;
    const startAt = getActualShowStartAt(showData);
    const runtime = getTargetRuntimeSeconds(showData);
    if (actualShowStartInput && document.activeElement !== actualShowStartInput) actualShowStartInput.value = formatTimeInput(startAt);
    if (targetRuntimeHoursInput && document.activeElement !== targetRuntimeHoursInput) targetRuntimeHoursInput.value = String(Math.floor(runtime / 3600));
    if (targetRuntimeMinutesInput && document.activeElement !== targetRuntimeMinutesInput) targetRuntimeMinutesInput.value = String(Math.round((runtime % 3600) / 60));
    if (safetyBufferInput && document.activeElement !== safetyBufferInput) safetyBufferInput.value = String(Number(showData.safetyBufferMinutes ?? DEFAULT_SAFETY_BUFFER_MINUTES));
    renderTimingDashboard();
  }

  function renderShow() {
    if (!showData) return;
    const plan = planForShow(showData, items);
    const { current, backstage, deck } = currentSet();

    operatorProjectedEndEl.textContent = formatClock(showData.projectedEndAt);
    operatorOffsetEl.textContent = showData.offsetSeconds == null ? "-" : `${showData.offsetSeconds > 0 ? "+" : ""}${formatOffset(showData.offsetSeconds)}`;
    applyOffsetSignal(operatorOffsetEl, showData.offsetSeconds);

    const statusText = showData.status?.toUpperCase() || "-";
    operatorShowStatusEl.textContent = statusText;
    if (footerStatusEl) footerStatusEl.textContent = `Status ${statusText} · ${activeSorted().length} active items`;
    if (operatorHeaderStatusEl) {
      operatorHeaderStatusEl.textContent = statusText;
      applyShowStatusChip(operatorHeaderStatusEl, showData.status);
    }

    currentTitleEl.textContent = current?.title || "-";
    currentTypeEl.textContent = current?.type || "-";
    renderNowRunningStatus(current?.status);
    currentPlannedEl.textContent = current ? formatDuration(current.plannedSeconds) : "-";

    backstageTitleEl.textContent = backstage?.title || "-";
    backstagePlannedEl.textContent = backstage ? formatDuration(backstage.plannedSeconds) : "-";
    deckTitleEl.textContent = deck?.title || "-";
    deckPlannedEl.textContent = deck ? formatDuration(deck.plannedSeconds) : "-";

    currentCaptainsEl.textContent = peopleText(current);
    backstageCaptainsEl.textContent = peopleText(backstage);
    deckCaptainsEl.textContent = peopleText(deck);

    reqNowTitleEl.textContent = current?.title || "-";
    reqNowMicsEl.textContent = getRequirement(current, "mics");
    reqNowChairsEl.textContent = getRequirement(current, "chairs");
    reqNowInstrumentsEl.textContent = getRequirement(current, "instruments");
    reqNowOtherEl.textContent = getRequirement(current, "other");

    reqBackTitleEl.textContent = backstage?.title || "-";
    reqBackMicsEl.textContent = getRequirement(backstage, "mics");
    reqBackChairsEl.textContent = getRequirement(backstage, "chairs");
    reqBackInstrumentsEl.textContent = getRequirement(backstage, "instruments");
    reqBackOtherEl.textContent = getRequirement(backstage, "other");

    reqDeckTitleEl.textContent = deck?.title || "-";
    reqDeckMicsEl.textContent = getRequirement(deck, "mics");
    reqDeckChairsEl.textContent = getRequirement(deck, "chairs");
    reqDeckInstrumentsEl.textContent = getRequirement(deck, "instruments");
    reqDeckOtherEl.textContent = getRequirement(deck, "other");

    renderChangeSummary(reqBackChangeEl, current, backstage);
    renderChangeSummary(reqDeckChangeEl, backstage, deck);
    renderPlanCard();
    renderSettings();

    const normalized = normalizeQueueForPlan(items, showData, plan);
    if (showData.intermissionDecisionLocked !== normalized.show.intermissionDecisionLocked && normalized.show.intermissionDecisionLocked) {
      updateDoc(showRef, { intermissionDecisionLocked: true, updatedAt: serverTimestamp() }).catch(() => {});
    }
  }

  function updateClock() {
    operatorTimeEl.textContent = formatClock(new Date());
    const current = currentSet().current;
    const elapsed = getElapsedSeconds(current?.actualStartAt);
    currentElapsedEl.textContent = elapsed == null ? "-" : formatDuration(elapsed);
    const planned = current?.plannedSeconds || 0;
    if (elapsed != null) {
      const diff = elapsed - planned;
      currentOverUnderEl.textContent = `${diff > 0 ? "+" : diff < 0 ? "-" : ""}${formatDuration(Math.abs(diff))}`;
      applyOverUnderSignal(currentOverUnderEl, diff);
    } else {
      currentOverUnderEl.textContent = "-";
      applySignal(currentOverUnderEl, "muted");
    }
    if (document.querySelector("[data-tab-panel='run']:not([hidden])")) renderRunOfShow();
    if (document.querySelector("[data-tab-panel='reports']:not([hidden])")) renderReportsView();
  }

  function safeRun(fn) {
    return fn().catch((error) => {
      alert(error?.message || String(error));
    });
  }

  async function commitItemAndShowState(nextItems, nextShow) {
    const plan = planForShow(nextShow, nextItems);
    const { projectedEndAt, offsetSeconds } = computeProjectedTiming(nextShow, nextItems, plan);
    const batch = writeBatch(db);
    nextItems.forEach((item) => batch.update(doc(itemsRef, item.id), item));
    batch.update(showRef, {
      ...nextShow,
      projectedEndAt,
      offsetSeconds,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  }

  async function startCurrentItemFast() {
    if (!showData) throw new Error("Show not initialized. Click Init Show / Reset first.");
    if (!Array.isArray(items) || !items.length) throw new Error("Items not loaded yet. Try again in a moment.");
    const plan = planForShow(showData, items);
    const currentId = showData.currentItemId || activeSorted()[0]?.id;
    const currentItem = activeSorted().find((item) => item.id === currentId);
    if (!currentItem) throw new Error(`Current item not found: ${currentId}`);
    const target = buildShiftMap(items, currentId, plan);
    if (!target) throw new Error("Could not build queue shift map.");
    const now = new Date();
    const nextItems = items.map((item) => {
      const next = { ...item, status: target.get(item.id) || item.status };
      if (item.id === currentId && !item.actualStartAt) next.actualStartAt = now;
      return next;
    });
    const locked = showData.intermissionDecisionLocked || (currentItem.branch !== "core" && currentItem.branch !== PLAN_LINEAR) || hasBranchItemStarted(nextItems);
    const nextShow = {
      ...showData,
      status: showData.status === "hold" ? "hold" : "running",
      intermissionDecisionLocked: locked,
    };
    items = nextItems;
    showData = nextShow;
    renderShow();
    renderRunTable();
    renderRunOfShow();
    renderReportsView();
    await commitItemAndShowState(nextItems, nextShow);
  }

  async function endCurrentItemFast() {
    if (!showData) throw new Error("Show not initialized. Click Init Show / Reset first.");
    if (!Array.isArray(items) || !items.length) throw new Error("Items not loaded yet. Try again in a moment.");
    const plan = planForShow(showData, items);
    const active = activeSorted();
    const liveItem = active.find((item) => item.status === "live") || active.find((item) => item.id === showData.currentItemId);
    if (!liveItem) throw new Error("No LIVE/current item found to end.");
    const now = new Date();
    const baseItems = items.map((item) => {
      if (item.id === liveItem.id) return { ...item, status: "done", actualEndAt: now };
      return item;
    });
    const nextShowBase = {
      ...showData,
      intermissionDecisionLocked: showData.intermissionDecisionLocked || (liveItem.branch !== "core" && liveItem.branch !== PLAN_LINEAR) || hasBranchItemStarted(baseItems),
    };
    const normalized = normalizeQueueForPlan(baseItems, nextShowBase, plan);
    const activeAfter = activeItemsForPlan(normalized.items, plan);
    const hasRemaining = activeAfter.some((item) => item.status !== "done");
    const nextShow = {
      ...normalized.show,
      status: hasRemaining ? (showData.status === "hold" ? "hold" : "running") : "stopped",
    };
    items = normalized.items;
    showData = nextShow;
    renderShow();
    renderRunTable();
    renderRunOfShow();
    renderReportsView();
    await commitItemAndShowState(normalized.items, nextShow);
  }

  async function setIntermissionPlan(plan) {
    if (!showData) throw new Error("Show not initialized. Click Init Show / Reset first.");
    if (!hasBranchingItems(items)) throw new Error("This setup is linear and does not use an intermission branch.");
    const locked = !!showData.intermissionDecisionLocked || hasBranchItemStarted(items);
    if (locked) throw new Error("Intermission decision is locked because a branch-only item has started.");
    const nextShowBase = { ...showData, intermissionPlan: plan, intermissionDecisionLocked: false };
    const normalized = normalizeQueueForPlan(items, nextShowBase, plan);
    items = normalized.items;
    showData = normalized.show;
    renderShow();
    renderRunTable();
    renderRunOfShow();
    renderReportsView();
    await commitItemAndShowState(normalized.items, normalized.show);
  }

  async function saveSettings() {
    if (!showData) throw new Error("Show not initialized. Click Init Show / Reset first.");
    const timeValue = actualShowStartInput?.value || "";
    const [hh, mm] = timeValue.split(":").map((part) => Number(part));
    const base = getActualShowStartAt(showData) || new Date();
    const actualShowStartAt = new Date(base);
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      actualShowStartAt.setHours(hh, mm, 0, 0);
    }
    const hours = Number(targetRuntimeHoursInput?.value || 0);
    const minutes = Number(targetRuntimeMinutesInput?.value || 0);
    const targetRuntimeSeconds = Math.max(60, (Number.isFinite(hours) ? hours : 0) * 3600 + (Number.isFinite(minutes) ? minutes : 0) * 60);
    const safetyBufferMinutes = Math.max(0, Number(safetyBufferInput?.value || DEFAULT_SAFETY_BUFFER_MINUTES));
    const nextShow = {
      ...showData,
      actualShowStartAt,
      targetRuntimeSeconds,
      safetyBufferMinutes,
      timingSettings: timingSettingsFromDom(),
      intermissionDecisionLocked: !!timingLockIntermissionToggle?.checked || !!showData.intermissionDecisionLocked,
    };
    if (timingSaveStatus) timingSaveStatus.textContent = "Timing settings saved and applied.";
    await commitItemAndShowState(items, nextShow);
  }

  function setActiveTab(tab) {
    const hashByTab = {
      live: "#operator",
      setup: "#show-setup",
      timing: "#timing-settings",
      system: "#system",
      run: "#run-of-show",
      reports: "#reports",
      settings: "#settings",
    };
    document.querySelectorAll("[data-tab]").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
    document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
      const active = panel.dataset.tabPanel === tab;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    document.body.dataset.activeSection = tab;
    if (appHeaderTitle) {
      appHeaderTitle.textContent = tab === "reports"
        ? "Stage Management System — Reports"
        : tab === "settings"
          ? "Stage Management System — Settings"
          : "Stage Management System — Operator";
    }
    document.querySelectorAll(".sidebar-nav a").forEach((link) => {
      if (link === runOfShowNavLink) link.classList.toggle("active", tab === "run");
      else if (link === reportsNavLink) link.classList.toggle("active", tab === "reports");
      else if (link === settingsNavLink) link.classList.toggle("active", tab === "settings");
      else if (link.getAttribute("href") === "./operator.html") link.classList.toggle("active", tab !== "run" && tab !== "reports" && tab !== "settings");
    });
    if (tab === "run") renderRunOfShow();
    if (tab === "reports") renderReportsView();
    if (tab === "settings") renderSettingsForm();
    if (tab === "system") renderSystemView();
    if (hashByTab[tab] && window.location.hash !== hashByTab[tab]) history.replaceState(null, "", hashByTab[tab]);
  }

  function currentRunItem() {
    const active = activeSorted();
    return active.find((item) => item.status === "live")
      || active.find((item) => item.id === showData?.currentItemId)
      || active.find((item) => item.status === "backstage")
      || active.find((item) => item.status === "blue")
      || null;
  }

  function focusCurrentRunItem() {
    const target = currentRunItem();
    if (!target) return;
    setActiveTab("run");
    renderRunOfShow();
    let row = [...(rosTableBody?.querySelectorAll("tr") || [])].find((candidate) => candidate.dataset.itemId === target.id);
    if (!row) {
      if (rosSearchInput) rosSearchInput.value = "";
      if (rosStatusFilter) rosStatusFilter.value = "";
      if (rosTypeFilter) rosTypeFilter.value = "";
      if (rosBranchFilter) rosBranchFilter.value = "active";
      if (rosShowCompletedToggle) rosShowCompletedToggle.checked = true;
      renderRunOfShow();
      row = [...(rosTableBody?.querySelectorAll("tr") || [])].find((candidate) => candidate.dataset.itemId === target.id);
    }
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    row.classList.add("run-row-pulse");
    window.setTimeout(() => row.classList.remove("run-row-pulse"), 1800);
  }

  function csvValue(value) {
    const raw = String(value ?? "");
    return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  }

  function exportRunOfShowCsv() {
    const headers = [
      "Order",
      "Title",
      "Type",
      "Status",
      "Branch",
      "Planned Time",
      "Actual Start",
      "Actual End",
      "Elapsed",
      "Variance",
      "People",
      "Mics",
      "Chairs",
      "Instruments",
      "Other",
      "Change Notes",
      "Notes",
    ];
    const rows = runRowsForCurrentFilters().map(({ item, order, elapsed, variance }) => [
      order || "",
      item.title || "",
      item.type || "",
      displayStatus(item.status),
      branchLabel(item.branch),
      formatDuration(item.plannedSeconds),
      formatClock(item.actualStartAt),
      formatClock(item.actualEndAt),
      elapsed == null ? "" : formatDuration(elapsed),
      variance == null ? "" : formatSignedDuration(variance),
      peopleText(item) === "-" ? "" : peopleText(item),
      getRequirement(item, "mics"),
      getRequirement(item, "chairs"),
      getRequirement(item, "instruments"),
      getRequirement(item, "other"),
      item.changeNotes || "",
      item.notes || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `run-of-show-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function reportExportRows() {
    return filteredReportRows().map((row) => [
      row.order || "",
      row.item.title || "",
      row.item.type || "",
      formatDuration(row.item.plannedSeconds),
      row.actualDuration == null ? "" : formatDuration(row.actualDuration),
      row.variance == null ? "" : formatSignedDuration(row.variance),
      reportStatusLabel(row),
      row.item.notes || "",
      row.item.branch || "",
      peopleText(row.item) === "-" ? "" : peopleText(row.item),
    ]);
  }

  function exportReportsCsv() {
    const headers = ["Order", "Item", "Type", "Planned Time", "Actual Time", "Variance", "Status", "Notes", "Branch", "People"];
    const csv = [headers, ...reportExportRows()].map((row) => row.map(csvValue).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `show-reports-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function exportReportsExcel() {
    try {
      const XLSX = await loadXlsxLibrary();
      const headers = ["Order", "Item", "Type", "Planned Time", "Actual Time", "Variance", "Status", "Notes", "Branch", "People"];
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...reportExportRows()]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");
      const dateStamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `show-reports-${dateStamp}.xlsx`);
    } catch (error) {
      exportReportsCsv();
      alert("Excel export could not load, so a CSV export was created instead.");
    }
  }

  function printReportsPdf() {
    setActiveTab("reports");
    window.print();
  }

  function downloadTextFile(filename, text, type = "application/json") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function addActivity(level, source, event, details, user = "Stage Manager") {
    activityLog.unshift({
      time: new Date(),
      level,
      source,
      event,
      details,
      user,
    });
    activityLog = activityLog.slice(0, 80);
    renderActivityLog();
  }

  function renderActivityLog() {
    if (!activityLogTableBody) return;
    const search = String(activitySearchInput?.value || "").trim().toLowerCase();
    const visible = activityLog.filter((entry) => !search || `${entry.level} ${entry.source} ${entry.event} ${entry.details} ${entry.user}`.toLowerCase().includes(search));
    if (!visible.length) {
      activityLogTableBody.innerHTML = `<tr><td colspan="6" class="empty-cell">No activity logged for this browser session.</td></tr>`;
      return;
    }
    activityLogTableBody.innerHTML = visible.map((entry) => `
      <tr>
        <td>${formatClock(entry.time)}</td>
        <td><span class="tag ${entry.level.toLowerCase()}">${escapeHtml(entry.level)}</span></td>
        <td>${escapeHtml(entry.source)}</td>
        <td>${escapeHtml(entry.event)}</td>
        <td>${escapeHtml(entry.details)}</td>
        <td>${escapeHtml(entry.user)}</td>
      </tr>
    `).join("");
  }

  function renderSystemView() {
    if (systemLastSync) systemLastSync.textContent = formatClock(new Date());
    if (systemCurrentShow) systemCurrentShow.textContent = showData?.displayName || showData?.setupTitle || "Stage Management System";
    renderActivityLog();
  }

  function exportShowConfiguration() {
    const payload = {
      exportedAt: new Date().toISOString(),
      firestorePath: `/shows/${SHOW_ID}`,
      show: showData || {},
      items,
      setupItems: setupDraft,
    };
    downloadTextFile(`show-configuration-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
    addActivity("INFO", "System", "Export Show Configuration", "Downloaded show configuration JSON.");
  }

  async function clearRuntimeData() {
    if (!confirm("Clear runtime timing/status data for all items? Setup rows will remain.")) return;
    const plan = planForShow(showData, items);
    const cleared = items.map((item) => ({ ...item, status: "queued", actualStartAt: null, actualEndAt: null }));
    const normalized = normalizeQueueForPlan(cleared, { ...showData, status: "stopped", holdMessage: "" }, plan);
    items = normalized.items;
    showData = normalized.show;
    await commitItemAndShowState(normalized.items, normalized.show);
    addActivity("WARN", "Operator", "Clear Runtime Data", "Cleared item starts, ends, and live statuses.");
  }

  async function archiveShow() {
    if (!confirm("Archive the current show as read-only metadata?")) return;
    await updateDoc(showRef, { archivedAt: serverTimestamp(), archiveStatus: "archived", updatedAt: serverTimestamp() });
    addActivity("WARN", "Operator", "Archive Show", "Marked the current show archived.");
  }

  function duplicateShow() {
    const payload = {
      duplicatedAt: new Date().toISOString(),
      sourceShow: showData || {},
      items,
    };
    downloadTextFile(`duplicate-show-template-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
    addActivity("INFO", "System", "Duplicate Show", "Downloaded a duplicate show template JSON.");
  }

  async function restoreDraft() {
    if (!Array.isArray(showData?.setupItems) || !showData.setupItems.length) {
      alert("No saved setup draft is available to restore.");
      return;
    }
    if (!confirm("Restore the saved setup draft into the Show Setup editor?")) return;
    loadSetupDraft("saved");
    setActiveTab("setup");
    addActivity("INFO", "Operator", "Restore Draft", "Loaded saved setup draft into Show Setup.");
  }

  startBtn?.addEventListener("click", () => safeRun(() => withActionLock(async () => {
    lastSnapshot = snapshotState();
    await startCurrentItemFast();
  })));

  endBtn?.addEventListener("click", () => safeRun(() => withActionLock(async () => {
    lastSnapshot = snapshotState();
    await endCurrentItemFast();
  })));

  undoBtn?.addEventListener("click", () => safeRun(async () => {
    if (!lastSnapshot) return;
    await undoSnapshot(lastSnapshot);
    lastSnapshot = null;
  }));

  holdBtn?.addEventListener("click", () => safeRun(async () => {
    const message = prompt("Hold message", showData?.holdMessage || "HOLD");
    await toggleHold(showData?.status, message);
  }));

  initBtn?.addEventListener("click", () => safeRun(async () => {
    if (!confirm("Reset the show? This will overwrite all live item data with the saved Show Setup.")) return;
    readSetupDraftFromDom();
    window.__currentShowDataForInit = showData;
    window.__currentRuntimeItemsForInit = items;
    window.__currentSetupDraftForInit = setupDraft;
    const initialized = await initShow();
    if (initialized) {
      showData = initialized.show;
      items = initialized.items;
      renderShow();
      renderRunTable();
      renderRunOfShow();
      renderReportsView();
    }
  }));

  addSetupItemBtn?.addEventListener("click", () => {
    addSetupItem();
  });
  addSetupItemBtn2?.addEventListener("click", () => addSetupItem());
  setupSearchInput?.addEventListener("input", () => renderSetupTable());
  setupBranchFilter?.addEventListener("change", () => renderSetupTable());

  loadSetupBtn?.addEventListener("click", () => {
    if (showHasStarted(showData, items) && !confirm("The show has already started. Load current live items into setup for future resets?")) return;
    loadSetupDraft("runtime");
  });

  saveSetupBtn?.addEventListener("click", () => safeRun(() => saveSetupDraft()));
  saveSetupDraftBtn?.addEventListener("click", () => safeRun(() => saveSetupDraft()));
  previewImportBtn?.addEventListener("click", () => safeRun(() => previewExcelImport()));
  applyImportBtn?.addEventListener("click", () => safeRun(() => applyExcelImport()));

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });
  runOfShowNavLink?.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveTab("run");
  });
  reportsNavLink?.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveTab("reports");
  });
  settingsNavLink?.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveTab("settings");
  });
  function applyHashRoute() {
    const currentHash = window.location.hash;
    if (currentHash === "#run-of-show") setActiveTab("run");
    else if (currentHash === "#reports") setActiveTab("reports");
    else if (currentHash === "#settings") setActiveTab("settings");
    else if (currentHash === "#show-setup") setActiveTab("setup");
    else if (currentHash === "#timing-settings") setActiveTab("timing");
    else if (currentHash === "#system") setActiveTab("system");
    else setActiveTab("live");
  }
  window.addEventListener("hashchange", applyHashRoute);
  applyHashRoute();

  setupTableBody?.addEventListener("input", () => setupStatus("Unsaved setup changes.", "warn"));

  setupTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const row = button.closest("tr");
    const index = [...setupTableBody.querySelectorAll("tr")].indexOf(row);
    readSetupDraftFromDom();
    if (button.dataset.action === "delete") {
      if (showHasStarted(showData, items) && !confirm("Delete this setup item for the next reset?")) return;
      setupDraft.splice(index, 1);
    }
    if (button.dataset.action === "up" && index > 0) {
      [setupDraft[index - 1], setupDraft[index]] = [setupDraft[index], setupDraft[index - 1]];
    }
    if (button.dataset.action === "down" && index < setupDraft.length - 1) {
      [setupDraft[index + 1], setupDraft[index]] = [setupDraft[index], setupDraft[index + 1]];
    }
    setupDraft = setupDraft.map((item, idx) => ({ ...item, order: idx + 1 }));
    renderSetupTable();
    setupStatus("Unsaved setup changes.", "warn");
  });

  keepIntermissionBtn?.addEventListener("click", () => safeRun(() => setIntermissionPlan(PLAN_WITH_INTERMISSION)));
  skipIntermissionBtn?.addEventListener("click", () => safeRun(() => setIntermissionPlan(PLAN_SKIP_INTERMISSION)));
  saveSettingsBtn?.addEventListener("click", () => safeRun(() => saveSettings()));
  saveTimingDraftBtn?.addEventListener("click", () => safeRun(async () => {
    if (!showData) throw new Error("Show not initialized. Click Init Show / Reset first.");
    await updateDoc(showRef, { timingSettings: timingSettingsFromDom(), updatedAt: serverTimestamp() });
    if (timingSaveStatus) timingSaveStatus.textContent = "Timing draft saved.";
    addActivity("INFO", "Timing", "Save Draft", "Saved timing settings draft.");
  }));
  resetTimingDefaultsBtn?.addEventListener("click", () => {
    if (!confirm("Reset timing settings to defaults?")) return;
    const defaults = DEFAULT_TIMING_SETTINGS;
    if (timingLockIntermissionToggle) timingLockIntermissionToggle.checked = defaults.lockIntermissionDecision;
    if (timingLockBehaviorSelect) timingLockBehaviorSelect.value = defaults.lockBehavior;
    if (timingOverrideToggle) timingOverrideToggle.checked = defaults.changeRequiresOverride;
    if (timingOverrideRoleSelect) timingOverrideRoleSelect.value = defaults.overrideRole;
    if (defaultTransitionBufferInput) defaultTransitionBufferInput.value = defaults.defaultTransitionBufferSeconds;
    if (stageClearBufferInput) stageClearBufferInput.value = defaults.stageClearBufferSeconds;
    if (introOutroBufferInput) introOutroBufferInput.value = defaults.introOutroBufferSeconds;
    if (gracePeriodInput) gracePeriodInput.value = defaults.gracePeriodSeconds;
    if (viewRefreshIntervalInput) viewRefreshIntervalInput.value = defaults.viewRefreshIntervalSeconds;
    if (countdownUpdateRateInput) countdownUpdateRateInput.value = defaults.countdownUpdateRateSeconds;
    if (timingTimeSourceInput) timingTimeSourceInput.value = defaults.timeSource;
    if (timingSaveStatus) timingSaveStatus.textContent = "Defaults restored. Apply to save them.";
  });
  rosSearchInput?.addEventListener("input", () => renderRunOfShow());
  rosStatusFilter?.addEventListener("change", () => renderRunOfShow());
  rosTypeFilter?.addEventListener("change", () => renderRunOfShow());
  rosBranchFilter?.addEventListener("change", () => renderRunOfShow());
  rosShowCompletedToggle?.addEventListener("change", () => renderRunOfShow());
  rosJumpCurrentBtn?.addEventListener("click", () => focusCurrentRunItem());
  rosExportBtn?.addEventListener("click", () => exportRunOfShowCsv());
  reportsBranchFilter?.addEventListener("change", () => renderReportsView());
  reportSearchInput?.addEventListener("input", () => renderReportsView());
  reportStatusFilter?.addEventListener("change", () => renderReportsView());
  reportTypeFilter?.addEventListener("change", () => renderReportsView());
  reportsCsvBtn?.addEventListener("click", () => exportReportsCsv());
  reportsExcelBtn?.addEventListener("click", () => safeRun(() => exportReportsExcel()));
  reportsPdfBtn?.addEventListener("click", () => printReportsPdf());
  exportConfigBtn?.addEventListener("click", () => exportShowConfiguration());
  systemExportReportsBtn?.addEventListener("click", () => exportReportsCsv());
  restoreDraftBtn?.addEventListener("click", () => safeRun(() => restoreDraft()));
  systemResetShowBtn?.addEventListener("click", () => safeRun(async () => {
    if (!confirm("Reset the show state from saved setup?")) return;
    readSetupDraftFromDom();
    window.__currentShowDataForInit = showData;
    window.__currentRuntimeItemsForInit = items;
    window.__currentSetupDraftForInit = setupDraft;
    const initialized = await initShow();
    if (initialized) {
      showData = initialized.show;
      items = initialized.items;
      renderShow();
      renderRunTable();
      renderRunOfShow();
      renderReportsView();
      addActivity("WARN", "Operator", "Reset Show State", "Reset show runtime from saved setup.");
    }
  }));
  archiveShowBtn?.addEventListener("click", () => safeRun(() => archiveShow()));
  duplicateShowBtn?.addEventListener("click", () => duplicateShow());
  clearRuntimeBtn?.addEventListener("click", () => safeRun(() => clearRuntimeData()));
  activitySearchInput?.addEventListener("input", () => renderActivityLog());
  clearActivityBtn?.addEventListener("click", () => {
    activityLog = [];
    renderActivityLog();
  });
  backupImportInput?.addEventListener("change", () => safeRun(async () => {
    const file = backupImportInput.files?.[0];
    if (!file) return;
    const text = await file.text();
    const payload = JSON.parse(text);
    if (!confirm("Import this backup into Show Setup? Runtime data will not be overwritten until you publish/reset.")) return;
    setupDraft = Array.isArray(payload.setupItems) ? payload.setupItems : Array.isArray(payload.show?.setupItems) ? payload.show.setupItems : [];
    if (payload.show) {
      if (setupTitleInput) setupTitleInput.value = payload.show.setupTitle || payload.show.displayName || "";
      if (setupDateInput) setupDateInput.value = payload.show.showDate || "";
      if (setupVenueInput) setupVenueInput.value = payload.show.venue || "";
      if (setupTimezoneInput) setupTimezoneInput.value = payload.show.timezone || "";
    }
    renderSetupTable();
    setActiveTab("setup");
    addActivity("WARN", "System", "Import Backup", "Imported backup into setup draft.");
  }));
  document.querySelectorAll("[data-profile-field], [data-setting-path]").forEach((input) => {
    input.addEventListener("input", () => markSettingsUnsaved());
    input.addEventListener("change", () => markSettingsUnsaved());
  });
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => applyPresetToProfiles(button.dataset.preset));
  });
  document.querySelectorAll("[data-profile-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      readSettingsForm();
      const key = button.dataset.profileReset;
      settingsDraft.displayProfiles[key] = deepClone(DEFAULT_SETTINGS.displayProfiles[key]);
      renderSettingsForm();
      settingsStatus("Profile reset. Save to keep it.", "unsaved");
    });
  });
  settingsDiscardBtn?.addEventListener("click", () => loadSettingsFromShow());
  settingsDraftBtn?.addEventListener("click", () => safeRun(() => saveSettingsDraft({ apply: false })));
  settingsApplyBtn?.addEventListener("click", () => safeRun(() => saveSettingsDraft({ apply: true })));
  settingsResetBtn?.addEventListener("click", () => {
    if (!confirm("Reset all settings to defaults?")) return;
    settingsDraft = mergeSettings(DEFAULT_SETTINGS);
    renderSettingsForm();
    applyDisplaySettings(settingsDraft);
    settingsStatus("Defaults restored. Save to keep them.", "unsaved");
  });

  advancedToggle?.addEventListener("change", () => {
    const enabled = advancedToggle.checked;
    document.querySelectorAll(".advanced").forEach((cell) => (cell.style.display = enabled ? "table-cell" : "none"));
    const advancedHeader = document.getElementById("advancedHeader");
    if (advancedHeader) advancedHeader.style.display = enabled ? "table-cell" : "none";
  });

  runTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    safeRun(async () => {
      if (button.dataset.action === "set") {
        const itemId = button.dataset.id;
        const nextShowBase = { ...showData, currentItemId: itemId };
        const normalized = normalizeQueueForPlan(items, nextShowBase, planForShow(showData, items));
        await commitItemAndShowState(normalized.items, normalized.show);
      }
      if (button.dataset.action === "edit") {
        const value = prompt("Enter planned seconds", "180");
        const seconds = Number(value);
        if (!Number.isNaN(seconds)) await updatePlannedSeconds(button.dataset.id, seconds);
      }
    });
  });

  subscribeShow((data) => {
    showData = data;
    if (!setupLoaded && Array.isArray(showData?.setupItems) && showData.setupItems.length) {
      setupLoaded = true;
      loadSetupDraft("saved");
    }
    if (!settingsSaveState?.classList.contains("unsaved")) {
      settingsDraft = mergeSettings(showData?.settings || {});
      renderSettingsForm();
      applyDisplaySettings(settingsDraft);
    }
    renderShow();
    renderRunTable();
    renderRunOfShow();
    renderReportsView();
    renderSystemView();
  });
  subscribeItems((list) => {
    items = list;
    if (!setupLoaded && (items.length || showData)) {
      setupLoaded = true;
      loadSetupDraft(Array.isArray(showData?.setupItems) && showData.setupItems.length ? "saved" : "runtime");
    }
    renderShow();
    renderRunTable();
    renderRunOfShow();
    renderReportsView();
    renderSystemView();
  });

  setInterval(updateClock, 1000);
  updateClock();
}

function initOpenView() {
  const showStatusEl = document.getElementById("showStatus");
  const holdBarEl = document.getElementById("holdBar");
  const scheduleStatusEl = document.getElementById("scheduleStatus");
  const projectedEndEl = document.getElementById("projectedEnd");
  const currentTimeEl = document.getElementById("currentTime");
  const upcomingListEl = document.getElementById("upcomingList");
  const liveTitleEl = document.getElementById("liveTitle");
  const livePerformersEl = document.getElementById("livePerformers");
  const liveCaptainsEl = document.getElementById("liveCaptains");
  const backstageTitleEl = document.getElementById("backstageTitle");
  const backstagePerformersEl = document.getElementById("backstagePerformers");
  const backstageCaptainsEl = document.getElementById("backstageCaptains");
  const backstageTimerEl = document.getElementById("backstageTimer");
  const blueTitleEl = document.getElementById("blueTitle");
  const bluePerformersEl = document.getElementById("bluePerformers");
  const blueCaptainsEl = document.getElementById("blueCaptains");
  const blueTimerEl = document.getElementById("blueTimer");
  const peopleOnStageSummaryEl = document.getElementById("peopleOnStageSummary");
  const performerLiveStatusEl = document.getElementById("performerLiveStatus");

  if (!scheduleStatusEl || !projectedEndEl || !currentTimeEl) return;

  let showData = null;
  let items = [];
  let renderQueued = false;

  const cache = {
    sorted: [],
    indexById: new Map(),
    prefixSeconds: [0],
    liveRuntime: null,
    anchor: null,
    backstage: null,
    deck: null,
    startIdx: 0,
  };

  function scheduleRenderAll() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderAll();
    });
  }

  function typeLine(item) {
    return item?.type || "-";
  }

  function rebuildCache() {
    const plan = planForShow(showData, items);
    cache.sorted = activeItemsForPlan(items, plan);
    cache.indexById = new Map(cache.sorted.map((item, idx) => [item.id, idx]));
    const pref = [0];
    cache.sorted.forEach((item) => pref.push(pref[pref.length - 1] + (item.status === "done" ? 0 : item.plannedSeconds || 0)));
    cache.prefixSeconds = pref;
    cache.liveRuntime = cache.sorted.find((item) => item.status === "live") || null;
    cache.anchor = cache.liveRuntime || cache.sorted.find((item) => item.id === showData?.currentItemId) || null;
    cache.backstage = cache.sorted.find((item) => item.status === "backstage") || null;
    cache.deck = cache.sorted.find((item) => item.status === "blue") || null;
    const anchorIdx = cache.anchor ? cache.indexById.get(cache.anchor.id) ?? -1 : -1;
    cache.startIdx = anchorIdx >= 0 ? anchorIdx : 0;
  }

  function getOpenScheduleLabel(offsetSeconds) {
    if (offsetSeconds == null || Number.isNaN(offsetSeconds)) return "ON TIME";
    if (Math.abs(offsetSeconds) < 180) return "ON TIME";
    return offsetSeconds > 0 ? "BEHIND" : "AHEAD";
  }

  function applyOpenScheduleSignal(el, offsetSeconds) {
    const label = getOpenScheduleLabel(offsetSeconds);
    if (label === "AHEAD") return applySignal(el, "success");
    if (label === "BEHIND") return applySignal(el, "danger");
    return applySignal(el, "info");
  }

  function remainingSecondsForLive() {
    if (!cache.liveRuntime) return null;
    const elapsed = getElapsedSeconds(cache.liveRuntime.actualStartAt);
    if (elapsed == null) return null;
    return Math.max(0, (cache.liveRuntime.plannedSeconds || 0) - elapsed);
  }

  function secondsUntilItemStarts(targetItem) {
    if (!targetItem) return null;
    const status = String(showData?.status || "").toLowerCase();
    if (status === "hold" || status === "stopped") return null;
    if (!cache.liveRuntime) return null;
    const baseRemaining = remainingSecondsForLive();
    if (baseRemaining == null) return null;
    const liveIdx = cache.indexById.get(cache.liveRuntime.id);
    const targetIdx = cache.indexById.get(targetItem.id);
    if (liveIdx == null || targetIdx == null || targetIdx <= liveIdx) return null;
    const between = cache.prefixSeconds[targetIdx] - cache.prefixSeconds[liveIdx + 1];
    return baseRemaining + between;
  }

  function renderHeaderAndTopStats() {
    currentTimeEl.textContent = formatClock(new Date());
    projectedEndEl.textContent = formatClock(showData?.projectedEndAt || showData?.plannedEndBaselineAt);
    const offset = showData?.offsetSeconds;
    const label = getOpenScheduleLabel(offset);
    scheduleStatusEl.textContent = label === "ON TIME" ? "ON TIME" : `${label} ${formatOffset(offset)}`;
    applyOpenScheduleSignal(scheduleStatusEl, offset);

    const statusLower = String(showData?.status || "").toLowerCase();
    if (showStatusEl) {
      showStatusEl.textContent = showData?.status ? String(showData.status).toUpperCase() : "LOADING...";
      applyShowStatusChip(showStatusEl, statusLower);
    }
    if (holdBarEl) {
      holdBarEl.style.display = statusLower === "hold" ? "block" : "none";
      holdBarEl.textContent = statusLower === "hold" ? showData?.holdMessage || "HOLD" : "";
    }
  }

  function renderUpcomingList() {
    if (!upcomingListEl) return;
    const upcoming = cache.sorted.slice(cache.startIdx).filter((item) => item.status !== "done");
    const frag = document.createDocumentFragment();
    if (!upcoming.length) {
      const row = document.createElement("div");
      row.className = "list-item";
      row.innerHTML = `<div><div>-</div><div class="meta">No upcoming items.</div></div><span class="tag queued">-</span>`;
      frag.appendChild(row);
    } else {
      upcoming.forEach((item) => {
        const status = String(item.status || "queued").toLowerCase();
        const capLine = openPeopleLine(item);
        const row = document.createElement("div");
        row.className = "list-item";
        row.innerHTML = `
          <div>
            <div>${item.title || "-"}</div>
            <div class="meta">${typeLine(item)}</div>
            ${capLine ? `<div class="captains-line">${capLine}</div>` : ""}
          </div>
          <span class="tag ${status}">${displayStatus(status)}</span>
        `;
        frag.appendChild(row);
      });
    }
    upcomingListEl.innerHTML = "";
    upcomingListEl.appendChild(frag);
  }

  function renderRightCards() {
    const anchor = cache.anchor;
    if (liveTitleEl) liveTitleEl.textContent = anchor?.title || "-";
    if (livePerformersEl) livePerformersEl.textContent = typeLine(anchor);
    if (liveCaptainsEl) liveCaptainsEl.textContent = openPeopleLine(anchor);
    if (peopleOnStageSummaryEl) peopleOnStageSummaryEl.textContent = peopleText(anchor);
    if (performerLiveStatusEl) performerLiveStatusEl.textContent = cache.liveRuntime ? "LIVE" : "Standby";
    if (backstageTitleEl) backstageTitleEl.textContent = cache.backstage?.title || "-";
    if (backstagePerformersEl) backstagePerformersEl.textContent = typeLine(cache.backstage);
    if (backstageCaptainsEl) backstageCaptainsEl.textContent = openPeopleLine(cache.backstage);
    if (blueTitleEl) blueTitleEl.textContent = cache.deck?.title || "-";
    if (bluePerformersEl) bluePerformersEl.textContent = typeLine(cache.deck);
    if (blueCaptainsEl) blueCaptainsEl.textContent = openPeopleLine(cache.deck);
  }

  function updateTimersOnly() {
    currentTimeEl.textContent = formatClock(new Date());
    const status = String(showData?.status || "").toLowerCase();
    const frozen = status === "hold" || status === "stopped";
    const tBack = frozen ? null : secondsUntilItemStarts(cache.backstage);
    const tBlue = frozen ? null : secondsUntilItemStarts(cache.deck);
    if (backstageTimerEl) backstageTimerEl.textContent = `GO TO STAGE IN: ${tBack == null ? "-" : formatDuration(tBack)}`;
    if (blueTimerEl) blueTimerEl.textContent = `GET READY IN: ${tBlue == null ? "-" : formatDuration(tBlue)}`;
  }

  function renderAll() {
    rebuildCache();
    renderHeaderAndTopStats();
    renderUpcomingList();
    renderRightCards();
    updateTimersOnly();
  }

  subscribeShow((data) => {
    showData = data;
    applyDisplaySettings(showData?.settings || {});
    scheduleRenderAll();
  });
  subscribeItems((list) => {
    items = list;
    scheduleRenderAll();
  });

  setInterval(updateTimersOnly, 1000);
  updateTimersOnly();
}

function initConfidenceView() {
  const confidenceRoot = document.getElementById("confidenceRoot");
  if (!confidenceRoot) return;

  const currentTimeEl = document.getElementById("confidenceCurrentTime");
  const projectedEndEl = document.getElementById("confidenceProjectedEnd");
  const offsetEl = document.getElementById("confidenceOffset");
  const statusEl = document.getElementById("confidenceStatus");
  const currentTitleEl = document.getElementById("confidenceCurrentTitle");
  const liveIndicatorEl = document.getElementById("confidenceLiveIndicator");
  const elapsedEl = document.getElementById("confidenceElapsed");
  const overUnderEl = document.getElementById("confidenceOverUnder");
  const estimatedEndEl = document.getElementById("confidenceEstimatedEnd");
  const nextTitleEl = document.getElementById("confidenceNextTitle");
  const estimatedStartEl = document.getElementById("confidenceEstimatedStart");
  const countdownEl = document.getElementById("confidenceCountdown");
  const recommendationEl = document.getElementById("confidenceRecommendation");
  const targetEndEl = document.getElementById("confidenceTargetEnd");

  let showData = null;
  let items = [];

  function activeSorted() {
    return activeItemsForPlan(items, planForShow(showData, items));
  }

  function currentAndNext() {
    const active = activeSorted();
    const live = active.find((item) => item.status === "live") || null;
    const current = live || active.find((item) => item.id === showData?.currentItemId) || active.find((item) => item.status === "backstage") || null;
    const currentIdx = current ? active.findIndex((item) => item.id === current.id) : -1;
    const next = active.slice(Math.max(0, currentIdx + 1)).find((item) => item.status !== "done") || null;
    return { current, next, isLive: !!live };
  }

  function fixedEstimatedEnd(item) {
    const start = normalizeTimestamp(item?.actualStartAt);
    if (!start || !item) return null;
    return new Date(start.getTime() + (item.plannedSeconds || 0) * 1000);
  }

  function applyExpired(el, expired) {
    if (!el) return;
    el.classList.toggle("expired-blink", !!expired);
  }

  function renderConfidence() {
    const now = new Date();
    const { current, next, isLive } = currentAndNext();
    const elapsed = getElapsedSeconds(current?.actualStartAt);
    const planned = current?.plannedSeconds || 0;
    const estimatedEnd = fixedEstimatedEnd(current);
    const endExpired = estimatedEnd ? now > estimatedEnd : false;
    const countdownSecondsRaw = estimatedEnd ? Math.round((estimatedEnd - now) / 1000) : null;
    const countdownSeconds = countdownSecondsRaw == null ? null : Math.max(0, countdownSecondsRaw);
    const countdownExpired = countdownSecondsRaw != null && countdownSecondsRaw <= 0;
    const offsetStatus = getOffsetStatus(showData?.offsetSeconds);
    const recommendation = getRecommendation(showData, items);

    currentTimeEl.textContent = formatClock(now);
    projectedEndEl.textContent = formatClock(showData?.projectedEndAt || showData?.plannedEndBaselineAt);
    offsetEl.textContent = showData?.offsetSeconds == null ? "-" : `${showData.offsetSeconds > 0 ? "+" : ""}${formatOffset(showData.offsetSeconds)}`;
    statusEl.textContent = offsetStatus;
    statusEl.className = `confidence-status ${offsetStatus.toLowerCase().replaceAll(" ", "-")}`;

    currentTitleEl.textContent = current?.title || "-";
    liveIndicatorEl.classList.toggle("is-live", isLive);
    liveIndicatorEl.querySelector("span:last-child").textContent = isLive ? "LIVE" : "STANDBY";
    elapsedEl.textContent = elapsed == null ? "-" : formatDuration(elapsed);
    if (elapsed == null) {
      overUnderEl.textContent = "-";
      applyExpired(overUnderEl, false);
    } else {
      const diff = elapsed - planned;
      overUnderEl.textContent = `${diff > 0 ? "+" : diff < 0 ? "-" : ""}${formatDuration(Math.abs(diff))}`;
      applyExpired(overUnderEl, diff > 0);
    }

    estimatedEndEl.textContent = formatClock(estimatedEnd);
    applyExpired(estimatedEndEl, endExpired);

    nextTitleEl.textContent = next?.title || "-";
    estimatedStartEl.textContent = formatClock(estimatedEnd);
    countdownEl.textContent = countdownSeconds == null ? "-" : formatDuration(countdownSeconds);
    applyExpired(countdownEl, countdownExpired);

    recommendationEl.textContent = recommendation;
    recommendationEl.className = `confidence-recommendation ${recommendationTone(recommendation)}`;
    targetEndEl.textContent = `Target end: ${formatClock(getTargetEndAt(showData))}`;
  }

  subscribeShow((data) => {
    showData = data;
    applyDisplaySettings(showData?.settings || {});
    renderConfidence();
  });
  subscribeItems((list) => {
    items = list;
    renderConfidence();
  });

  setInterval(renderConfidence, 1000);
  renderConfidence();
}

document.addEventListener("DOMContentLoaded", () => {
  initSidebarCollapse();
  initThemeToggle();
  applyDisplaySettings();
  if (document.getElementById("confidenceRoot")) initConfidenceView();
  else if (document.getElementById("operatorTime")) initOperatorView();
  else initOpenView();
});
