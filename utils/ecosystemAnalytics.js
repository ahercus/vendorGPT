/**
 * Noble People Ecosystem Analytics
 * Tracks activity for the Everything dashboard.
 *
 * Direct-REST insert into ecosystem_analytics (noble-people-products) — no
 * @supabase/supabase-js client needed, matching the canonical pattern in
 * forge/src/lib/analytics.ts. Credentials come from env, never hardcoded
 * (the previous literal legacy anon JWT here was disabled on 2026-05-01,
 * which silently killed every insert — see no-hardcoded-supabase-keys.mdc).
 */

const PROJECT_ID = "stalker";
const PROJECT_NAME = "Stalker";

const ANALYTICS_SUPABASE_URL = process.env.NEXT_PUBLIC_ANALYTICS_SUPABASE_URL || "";
const ANALYTICS_SUPABASE_KEY = process.env.NEXT_PUBLIC_ANALYTICS_SUPABASE_ANON_KEY || "";

function analyticsEnabled() {
  return !!(ANALYTICS_SUPABASE_URL && ANALYTICS_SUPABASE_KEY);
}

function postEvent(data) {
  if (!analyticsEnabled()) return Promise.resolve();
  return fetch(`${ANALYTICS_SUPABASE_URL}/rest/v1/ecosystem_analytics`, {
    method: "POST",
    headers: {
      apikey: ANALYTICS_SUPABASE_KEY,
      Authorization: `Bearer ${ANALYTICS_SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  }).catch((error) => {
    console.warn("[Ecosystem Analytics] Failed:", error.message);
  });
}

let anonymousId = null;
function getAnonymousId() {
  if (typeof window === "undefined") return "";
  if (anonymousId) return anonymousId;
  const stored = localStorage.getItem("np_analytics_id");
  if (stored) { anonymousId = stored; return stored; }
  anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem("np_analytics_id", anonymousId);
  return anonymousId;
}

function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let sessionId = null;
let sessionStartTime = null;

function getSessionId() {
  if (typeof window === "undefined") return "";
  if (sessionId) return sessionId;
  const stored = sessionStorage.getItem("np_session_id");
  if (stored) {
    sessionId = stored;
    sessionStartTime = parseInt(sessionStorage.getItem("np_session_start") || String(Date.now()));
    return stored;
  }
  sessionId = generateUUID();
  sessionStartTime = Date.now();
  sessionStorage.setItem("np_session_id", sessionId);
  sessionStorage.setItem("np_session_start", String(sessionStartTime));
  trackEvent({ eventType: "session_start" });
  return sessionId;
}

function parseUserAgent() {
  if (typeof window === "undefined") return { browser: null, browserVersion: null, os: null, osVersion: null, deviceType: "desktop" };
  const ua = navigator.userAgent;
  let browser = "Unknown", browserVersion = "";
  if (ua.includes("Chrome") && !ua.includes("Edg")) { browser = "Chrome"; browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || ""; }
  else if (ua.includes("Safari") && !ua.includes("Chrome")) { browser = "Safari"; browserVersion = ua.match(/Version\/(\d+)/)?.[1] || ""; }
  else if (ua.includes("Firefox")) { browser = "Firefox"; browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || ""; }
  else if (ua.includes("Edg")) { browser = "Edge"; browserVersion = ua.match(/Edg\/(\d+)/)?.[1] || ""; }
  let os = "Unknown", osVersion = "";
  if (ua.includes("Windows")) { os = "Windows"; } else if (ua.includes("Mac OS X")) { os = "macOS"; } else if (ua.includes("Linux")) { os = "Linux"; }
  let deviceType = "desktop";
  if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) deviceType = "mobile";
  return { browser, browserVersion, os, osVersion, deviceType };
}

export async function trackEvent(event) {
  if (typeof window === "undefined") return;
  try {
    const { browser, browserVersion, os, osVersion, deviceType } = parseUserAgent();
    const data = {
      project_id: PROJECT_ID, project_name: PROJECT_NAME, event_type: event.eventType, event_name: event.eventName || null,
      session_id: getSessionId(), user_id: event.userId || null, anonymous_id: getAnonymousId(), is_authenticated: !!event.userId,
      page_path: event.pagePath || window.location.pathname, page_title: event.pageTitle || document.title,
      referrer: document.referrer || null, user_agent: navigator.userAgent,
      browser, browser_version: browserVersion || null, os, os_version: osVersion || null, device_type: deviceType,
      metadata: event.metadata || {}, client_timestamp: new Date().toISOString()
    };
    postEvent(data);
  } catch (error) { console.warn("[Ecosystem Analytics] Error:", error); }
}

export const trackPageView = (path, title, metadata) => trackEvent({ eventType: "pageview", pagePath: path, pageTitle: title, metadata });
export const trackLogin = (userId, metadata) => trackEvent({ eventType: "login", userId, metadata });
export const trackClick = (elementName, metadata) => trackEvent({ eventType: "click", eventName: elementName, metadata });

if (typeof window !== "undefined") {
  const trackSessionEnd = () => {
    if (!sessionId || !sessionStartTime || !analyticsEnabled()) return;
    const duration = Date.now() - sessionStartTime;
    const data = { project_id: PROJECT_ID, project_name: PROJECT_NAME, event_type: "session_end", session_id: sessionId, anonymous_id: getAnonymousId(), session_duration_ms: duration, page_path: window.location.pathname, metadata: { duration_seconds: Math.round(duration / 1000) }, client_timestamp: new Date().toISOString() };
    // sendBeacon can't set headers, so PostgREST's apikey has to travel as a
    // query param — a bare POST here 401s silently (fire-and-forget, no
    // response to inspect) since the Authorization header would be missing.
    const url = `${ANALYTICS_SUPABASE_URL}/rest/v1/ecosystem_analytics?apikey=${encodeURIComponent(ANALYTICS_SUPABASE_KEY)}`;
    navigator.sendBeacon(url, new Blob([JSON.stringify(data)], { type: "application/json" }));
  };
  window.addEventListener("beforeunload", trackSessionEnd);
  window.addEventListener("pagehide", trackSessionEnd);
}

