import { uid } from "./utils.js";

const STORAGE_KEY = "calendarioDinamico:v1";

function defaultState() {
  const now = new Date();
  return {
    brand: {
      name: "Mi Empresa",
      subtitle: "Calendario operativo mensual",
      logoType: "emoji", // "emoji" | "image"
      logoValue: "📅",
    },
    accentColor: "#a9822f",
    theme: "light", // "light" | "dark" | "system"
    eventTypes: [
      { id: "capacitacion", name: "Capacitación", icon: "📖", color: "#2563eb" },
      { id: "guardia", name: "Guardia", icon: "🛡️", color: "#b8860b" },
      { id: "feriado", name: "Feriado Oficial", icon: "🚫", color: "#dc2626" },
      { id: "junta", name: "Junta de Seguimiento", icon: "📊", color: "#16a34a" },
    ],
    events: [],
    view: { year: now.getFullYear(), month: now.getMonth() },
  };
}

function migrate(loaded) {
  const base = defaultState();
  return {
    ...base,
    ...loaded,
    brand: { ...base.brand, ...(loaded.brand || {}) },
    view: { ...base.view, ...(loaded.view || {}) },
    eventTypes: Array.isArray(loaded.eventTypes) && loaded.eventTypes.length ? loaded.eventTypes : base.eventTypes,
    events: Array.isArray(loaded.events) ? loaded.events : [],
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn("No se pudo leer el almacenamiento local, usando valores por defecto.", e);
    return defaultState();
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("No se pudo guardar en el almacenamiento local (¿espacio lleno?).", e);
  }
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  persist();
  listeners.forEach((fn) => fn(state));
}

export function updateBrand(patch) {
  state.brand = { ...state.brand, ...patch };
  notify();
}

export function setAccentColor(color) {
  state.accentColor = color;
  notify();
}

export function setTheme(theme) {
  state.theme = theme;
  notify();
}

export function setView(year, month) {
  let y = year, m = month;
  if (m < 0) { m = 11; y -= 1; }
  if (m > 11) { m = 0; y += 1; }
  state.view = { year: y, month: m };
  notify();
}

export function addEventType(type) {
  const t = { id: uid("type"), icon: "🔖", name: "Nuevo tipo", color: "#6b7280", ...type };
  state.eventTypes.push(t);
  notify();
  return t;
}

export function updateEventType(id, patch) {
  state.eventTypes = state.eventTypes.map((t) => (t.id === id ? { ...t, ...patch } : t));
  notify();
}

export function deleteEventType(id) {
  const inUse = state.events.some((e) => e.typeId === id);
  if (inUse) return { ok: false, reason: "in-use" };
  state.eventTypes = state.eventTypes.filter((t) => t.id !== id);
  notify();
  return { ok: true };
}

export function getEventsForDate(dateStr) {
  return state.events
    .filter((e) => e.date === dateStr)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
}

export function upsertEvent(evt) {
  if (evt.id) {
    state.events = state.events.map((e) => (e.id === evt.id ? { ...e, ...evt } : e));
  } else {
    state.events.push({ ...evt, id: uid("evt") });
  }
  notify();
}

export function deleteEvent(id) {
  state.events = state.events.filter((e) => e.id !== id);
  notify();
}

export function replaceAllData(data) {
  state = migrate(data);
  notify();
}

export function exportData() {
  return JSON.stringify(state, null, 2);
}
