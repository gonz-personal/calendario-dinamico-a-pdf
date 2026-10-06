import { getState, getEventsForDate } from "./state.js";
import { MONTH_NAMES, WEEKDAY_NAMES, dateKey, daysInMonth, formatTime12h, hexToRgba } from "./utils.js";

const MAX_VISIBLE_EVENTS = 3;

export function renderBrandHeader() {
  const { brand } = getState();
  document.getElementById("brandName").textContent = brand.name;
  document.getElementById("brandSubtitle").textContent = brand.subtitle.toUpperCase();

  const logoEl = document.getElementById("brandLogo");
  if (brand.logoType === "image" && brand.logoValue) {
    logoEl.innerHTML = `<img src="${brand.logoValue}" alt="Logo" />`;
  } else {
    logoEl.textContent = brand.logoValue || "📅";
  }
}

export function renderMonthTitle() {
  const { view } = getState();
  document.getElementById("monthName").textContent = MONTH_NAMES[view.month];
  document.getElementById("monthYear").textContent = String(view.year);
}

export function renderWeekdayRow() {
  const row = document.getElementById("weekdayRow");
  row.innerHTML = WEEKDAY_NAMES.map((d) => `<div>${d}</div>`).join("");
  const { layout, accentColor } = getState();
  row.style.backgroundColor = layout === "bold" ? hexToRgba(accentColor, 0.1) : "";
}

export function applyLayoutClass() {
  const { layout } = getState();
  const card = document.getElementById("calendarCapture");
  card.classList.remove("layout-classic", "layout-modern", "layout-bold");
  card.classList.add(`layout-${layout}`);
}

function typeById(id) {
  return getState().eventTypes.find((t) => t.id === id);
}

function buildChip(evt) {
  const { layout } = getState();
  const type = typeById(evt.typeId);
  const color = type ? type.color : "#6b7280";
  const icon = type ? type.icon : "🔖";
  const name = type ? type.name : "(tipo eliminado)";
  const timeHtml = evt.time
    ? `<div class="chip-time">🔔&nbsp;${formatTime12h(evt.time)}</div>`
    : "";
  const labelHtml = evt.label
    ? `<div class="chip-label">${escapeHtml(evt.label)}</div>`
    : "";
  const chip = document.createElement("div");
  chip.className = "event-chip";
  chip.dataset.eventId = evt.id;
  if (layout === "bold") {
    chip.style.backgroundColor = color;
    chip.style.setProperty("--chip-color", "#ffffff");
  } else {
    chip.style.backgroundColor = hexToRgba(color, layout === "modern" ? 0.16 : 0.12);
    chip.style.setProperty("--chip-color", color);
  }
  chip.innerHTML = `${timeHtml}<div class="chip-main">${icon} ${escapeHtml(name)}</div>${labelHtml}`;
  return chip;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function renderGrid(handlers) {
  const { view } = getState();
  const { year, month } = view;
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const firstWeekday = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const prevMonthDays = daysInMonth(year, month === 0 ? 11 : month - 1);

  const cells = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day, month: m, year: y, outside: true });
  }
  for (let day = 1; day <= totalDays; day++) {
    cells.push({ day, month, year, outside: false });
  }
  const remainder = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= remainder; day++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day, month: m, year: y, outside: true });
  }

  cells.forEach((cell) => {
    const key = dateKey(cell.year, cell.month, cell.day);
    const cellEl = document.createElement("div");
    cellEl.className = "day-cell" + (cell.outside ? " outside" : "");
    cellEl.dataset.date = key;

    const numberEl = document.createElement("div");
    numberEl.className = "day-number";
    numberEl.textContent = cell.day;
    if (cell.outside) {
      const tag = document.createElement("span");
      tag.className = "month-tag";
      tag.textContent = MONTH_NAMES[cell.month].slice(0, 3);
      numberEl.appendChild(tag);
    }
    cellEl.appendChild(numberEl);

    if (!cell.outside) {
      const addBtn = document.createElement("button");
      addBtn.className = "add-event-btn";
      addBtn.type = "button";
      addBtn.textContent = "+";
      addBtn.setAttribute("aria-label", "Agregar evento");
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.onAddEvent(key);
      });
      cellEl.appendChild(addBtn);
    }

    const dayEvents = getEventsForDate(key);
    const visible = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
    visible.forEach((evt) => {
      const chip = buildChip(evt);
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.onEditEvent(evt.id);
      });
      cellEl.appendChild(chip);
    });

    if (dayEvents.length > visible.length) {
      const moreBtn = document.createElement("button");
      moreBtn.className = "more-events-btn";
      moreBtn.type = "button";
      moreBtn.textContent = `+${dayEvents.length - visible.length} más`;
      moreBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.onShowDay(key);
      });
      cellEl.appendChild(moreBtn);
    }

    if (cell.outside) {
      cellEl.addEventListener("click", () => handlers.onNavigateToOutsideDay(cell.year, cell.month));
    } else {
      cellEl.addEventListener("click", () => handlers.onShowDay(key));
    }

    grid.appendChild(cellEl);
  });
}

export function renderAll(handlers) {
  applyLayoutClass();
  renderBrandHeader();
  renderMonthTitle();
  renderWeekdayRow();
  renderGrid(handlers);
}
