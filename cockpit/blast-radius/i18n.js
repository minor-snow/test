/**
 * P15.2 — i18n module for Blast Radius Cockpit
 *
 * Loads locale JSON files and provides t() translation function.
 * Technical IDs (node_id, block_id, file_path, symbol_name) are NEVER translated.
 *
 * Principle: Translate the view, never the truth.
 */

let currentLocale = "en";
let strings = {};
let fallbackStrings = {};

/**
 * Initialize i18n by loading the locale JSON files.
 * @param {string} locale - "en" or "zh-CN"
 */
async function initI18n(locale) {
  currentLocale = locale || detectLocale();

  // Always load English as fallback
  try {
    const enRes = await fetch("./i18n/en.json");
    fallbackStrings = await enRes.json();
  } catch (e) {
    console.warn("Failed to load en.json fallback");
    fallbackStrings = {};
  }

  if (currentLocale === "en") {
    strings = fallbackStrings;
  } else {
    try {
      const res = await fetch(`./i18n/${currentLocale}.json`);
      strings = await res.json();
    } catch (e) {
      console.warn(`Failed to load ${currentLocale}.json, falling back to en`);
      strings = fallbackStrings;
      currentLocale = "en";
    }
  }

  // Persist preference
  try { localStorage.setItem("pantheon-locale", currentLocale); } catch (e) { /* noop */ }
}

/**
 * Detect locale from localStorage or browser settings.
 */
function detectLocale() {
  try {
    const saved = localStorage.getItem("pantheon-locale");
    if (saved) return saved;
  } catch (e) { /* noop */ }

  const browserLang = navigator.language || "en";
  if (browserLang.startsWith("zh")) return "zh-CN";
  return "en";
}

/**
 * Get translated string by key. Falls back to English, then to key itself.
 * @param {string} key - Dot-separated key like "impact.title"
 * @returns {string}
 */
function t(key) {
  return strings[key] || fallbackStrings[key] || key;
}

/**
 * Get current locale.
 * @returns {string}
 */
function getLocale() {
  return currentLocale;
}

/**
 * Switch locale and reload UI.
 * @param {string} newLocale
 */
async function switchLocale(newLocale) {
  await initI18n(newLocale);
  applyI18nToDOM();
  // Trigger re-render if impact is showing
  if (typeof renderImpact === "function") renderImpact();
}

/**
 * Apply i18n strings to all DOM elements with data-i18n attribute.
 */
function applyI18nToDOM() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const translated = t(key);
    if (el.tagName === "INPUT") {
      el.placeholder = translated;
    } else {
      el.textContent = translated;
    }
  });

  // Update locale switcher active state
  document.querySelectorAll(".locale-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.locale === currentLocale);
  });
}

/**
 * Translate a risk reason based on node kind.
 * @param {string} kind
 * @returns {string}
 */
function tRiskReason(kind) {
  const map = {
    "conflict_policy": t("risk.reason.conflictPolicy"),
    "forbidden_assumption": t("risk.reason.forbiddenAssumption"),
    "state_machine": t("risk.reason.stateMachine"),
    "data_model": t("risk.reason.dataModel"),
  };
  return map[kind] || kind;
}

/**
 * Translate a layer name for display.
 * @param {string} layerKey
 * @returns {string}
 */
function tLayer(layerKey) {
  return t(`layer.${layerKey}`) || layerKey;
}

/**
 * Translate a risk level for display.
 * @param {string} level - "high" | "medium" | "low"
 * @returns {string}
 */
function tRiskLevel(level) {
  return t(`risk.${level}`) || level.toUpperCase();
}

/**
 * Translate a node kind for display.
 * @param {string} kind
 * @returns {string}
 */
function tKind(kind) {
  return t(`kind.${kind}`) || kind;
}
