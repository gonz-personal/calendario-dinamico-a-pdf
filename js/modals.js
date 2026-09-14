import {
  getState, updateBrand, setAccentColor, setTheme, setView, setLayout,
  addEventType, updateEventType, deleteEventType,
  getEventsForDate, upsertEvent, deleteEvent, replaceAllData, exportData,
} from "./state.js";
import { applyTheme } from "./theme.js";
import { MONTH_NAMES, formatTime12h, readFileAsDataUrl, resizeImageDataUrl } from "./utils.js";

let rerender = () => {};
let reopenEventModalAfterSettings = false;

export function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 2600);
}

function el(id) { return document.getElementById(id); }

/* ---------------- Event modal ---------------- */

let editingEventId = null;

function populateTypeSelect(preserveValue) {
  const select = el("eventTypeSelect");
  const prev = preserveValue !== undefined ? preserveValue : select.value;
  select.innerHTML = getState().eventTypes
    .map((t) => `<option value="${t.id}">${t.icon} ${escapeHtml(t.name)}</option>`)
    .join("");
  if (prev && getState().eventTypes.some((t) => t.id === prev)) {
    select.value = prev;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function openEventModal(dateStr, eventId = null) {
  editingEventId = eventId;
  populateTypeSelect();

  const dateInput = el("eventDateInput");
  const labelInput = el("eventLabelInput");
  const hasTimeCheckbox = el("eventHasTimeCheckbox");
  const timeInput = el("eventTimeInput");
  const timeField = el("eventTimeField");
  const deleteBtn = el("deleteEventBtn");
  const title = el("eventModalTitle");

  if (eventId) {
    const evt = getState().events.find((e) => e.id === eventId);
    if (!evt) return;
    title.textContent = "Editar evento";
    dateInput.value = evt.date;
    el("eventTypeSelect").value = evt.typeId;
    labelInput.value = evt.label || "";
    hasTimeCheckbox.checked = !!evt.time;
    timeInput.value = evt.time || "09:30";
    deleteBtn.hidden = false;
  } else {
    title.textContent = "Nuevo evento";
    dateInput.value = dateStr;
    labelInput.value = "";
    hasTimeCheckbox.checked = false;
    timeInput.value = "09:30";
    deleteBtn.hidden = true;
  }
  timeField.style.display = hasTimeCheckbox.checked ? "flex" : "none";

  el("eventModalOverlay").classList.remove("hidden");
}

function closeEventModal() {
  el("eventModalOverlay").classList.add("hidden");
}

function saveEvent() {
  const dateInput = el("eventDateInput");
  const typeSelect = el("eventTypeSelect");
  const labelInput = el("eventLabelInput");
  const hasTimeCheckbox = el("eventHasTimeCheckbox");
  const timeInput = el("eventTimeInput");

  if (!dateInput.value) { showToast("Selecciona una fecha"); return; }
  if (!typeSelect.value) { showToast("Selecciona un tipo de evento"); return; }

  upsertEvent({
    id: editingEventId || undefined,
    date: dateInput.value,
    typeId: typeSelect.value,
    label: labelInput.value.trim(),
    time: hasTimeCheckbox.checked ? timeInput.value : null,
  });

  closeEventModal();
  rerender();
  showToast(editingEventId ? "Evento actualizado" : "Evento creado");
}

function removeEvent() {
  if (!editingEventId) return;
  if (!confirm("¿Eliminar este evento?")) return;
  deleteEvent(editingEventId);
  closeEventModal();
  rerender();
  showToast("Evento eliminado");
}

function initEventModal() {
  el("eventModalClose").addEventListener("click", closeEventModal);
  el("cancelEventBtn").addEventListener("click", closeEventModal);
  el("saveEventBtn").addEventListener("click", saveEvent);
  el("deleteEventBtn").addEventListener("click", removeEvent);
  el("eventModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "eventModalOverlay") closeEventModal();
  });
  el("eventHasTimeCheckbox").addEventListener("change", (e) => {
    el("eventTimeField").style.display = e.target.checked ? "flex" : "none";
  });
  el("addTypeQuickBtn").addEventListener("click", () => {
    reopenEventModalAfterSettings = true;
    el("eventModalOverlay").classList.add("hidden");
    openSettingsModal();
  });
}

/* ---------------- Day modal ---------------- */

let currentDayKey = null;

export function openDayModal(dateStr) {
  currentDayKey = dateStr;
  const list = el("dayModalList");
  const events = getEventsForDate(dateStr);
  const [y, m, d] = dateStr.split("-").map(Number);
  el("dayModalTitle").textContent = `${d} de ${MONTH_NAMES[m - 1]}, ${y}`;

  if (!events.length) {
    list.innerHTML = `<p class="hint-text">No hay eventos este día.</p>`;
  } else {
    list.innerHTML = "";
    events.forEach((evt) => {
      const type = getState().eventTypes.find((t) => t.id === evt.typeId);
      const item = document.createElement("div");
      item.className = "day-modal-item";
      item.style.setProperty("--item-color", type ? type.color : "#6b7280");
      const sub = [evt.time ? formatTime12h(evt.time) : null, evt.label || null].filter(Boolean).join(" · ");
      item.innerHTML = `
        <div class="item-icon">${type ? type.icon : "🔖"}</div>
        <div class="item-text">
          <div class="item-title">${escapeHtml(type ? type.name : "(tipo eliminado)")}</div>
          ${sub ? `<div class="item-sub">${escapeHtml(sub)}</div>` : ""}
        </div>`;
      item.addEventListener("click", () => {
        closeDayModal();
        openEventModal(null, evt.id);
      });
      list.appendChild(item);
    });
  }

  el("dayModalOverlay").classList.remove("hidden");
}

function closeDayModal() {
  el("dayModalOverlay").classList.add("hidden");
}

function initDayModal() {
  el("dayModalClose").addEventListener("click", closeDayModal);
  el("dayModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "dayModalOverlay") closeDayModal();
  });
  el("dayModalAddBtn").addEventListener("click", () => {
    closeDayModal();
    openEventModal(currentDayKey);
  });
}

/* ---------------- Jump to month modal ---------------- */

export function openJumpModal() {
  const monthSelect = el("jumpMonthSelect");
  monthSelect.innerHTML = MONTH_NAMES.map((m, i) => `<option value="${i}">${m}</option>`).join("");
  const { view } = getState();
  monthSelect.value = view.month;
  el("jumpYearInput").value = view.year;
  el("jumpModalOverlay").classList.remove("hidden");
}

function closeJumpModal() {
  el("jumpModalOverlay").classList.add("hidden");
}

function initJumpModal() {
  el("jumpModalClose").addEventListener("click", closeJumpModal);
  el("jumpCancelBtn").addEventListener("click", closeJumpModal);
  el("jumpModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "jumpModalOverlay") closeJumpModal();
  });
  el("jumpGoBtn").addEventListener("click", () => {
    const month = Number(el("jumpMonthSelect").value);
    const year = Number(el("jumpYearInput").value);
    if (!year || year < 1970) { showToast("Año inválido"); return; }
    setView(year, month);
    closeJumpModal();
    rerender();
  });
}

/* ---------------- Layout picker modal ---------------- */

function renderLayoutOptions() {
  const { layout } = getState();
  document.querySelectorAll(".layout-option-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.layout === layout);
  });
}

export function openLayoutModal() {
  renderLayoutOptions();
  el("layoutModalOverlay").classList.remove("hidden");
}

function closeLayoutModal() {
  el("layoutModalOverlay").classList.add("hidden");
}

function initLayoutModal() {
  el("layoutModalClose").addEventListener("click", closeLayoutModal);
  el("layoutModalDoneBtn").addEventListener("click", closeLayoutModal);
  el("layoutModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "layoutModalOverlay") closeLayoutModal();
  });
  document.querySelectorAll(".layout-option-card").forEach((card) => {
    card.addEventListener("click", () => {
      setLayout(card.dataset.layout);
      renderLayoutOptions();
      rerender();
    });
  });
}

/* ---------------- Settings modal ---------------- */

function renderThemeOptions() {
  const { theme } = getState();
  document.querySelectorAll(".theme-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });
}

function renderLogoPreview() {
  const { brand } = getState();
  const preview = el("logoPreview");
  if (brand.logoType === "image" && brand.logoValue) {
    preview.innerHTML = `<img src="${brand.logoValue}" alt="Logo" />`;
    el("logoEmojiInput").value = "";
  } else {
    preview.textContent = brand.logoValue || "📅";
    el("logoEmojiInput").value = brand.logoValue || "";
  }
}

function renderTypesList() {
  const container = el("typesList");
  container.innerHTML = "";
  getState().eventTypes.forEach((type) => {
    const row = document.createElement("div");
    row.className = "type-row";
    row.innerHTML = `
      <input type="text" class="type-icon-input" value="${escapeHtml(type.icon)}" maxlength="4" title="Ícono (emoji)" />
      <input type="text" class="type-name-input" value="${escapeHtml(type.name)}" maxlength="40" title="Nombre" />
      <input type="color" value="${type.color}" title="Color" />
      <button class="icon-btn" title="Eliminar" aria-label="Eliminar tipo">🗑</button>
    `;
    const [iconInput, nameInput] = row.querySelectorAll("input[type=text]");
    const colorInput = row.querySelector("input[type=color]");
    const deleteBtn = row.querySelector("button");

    iconInput.addEventListener("change", () => { updateEventType(type.id, { icon: iconInput.value || "🔖" }); rerender(); });
    nameInput.addEventListener("change", () => { updateEventType(type.id, { name: nameInput.value || "Sin nombre" }); rerender(); });
    colorInput.addEventListener("input", () => { updateEventType(type.id, { color: colorInput.value }); rerender(); });
    deleteBtn.addEventListener("click", () => {
      if (!confirm(`¿Eliminar el tipo "${type.name}"?`)) return;
      const result = deleteEventType(type.id);
      if (!result.ok) {
        showToast("No se puede eliminar: hay eventos usando este tipo.");
        return;
      }
      renderTypesList();
      rerender();
    });

    container.appendChild(row);
  });
}

export function openSettingsModal() {
  const { brand, accentColor } = getState();
  el("brandNameInput").value = brand.name;
  el("brandSubtitleInput").value = brand.subtitle;
  el("accentColorInput").value = accentColor;
  renderLogoPreview();
  renderThemeOptions();
  renderTypesList();
  el("settingsModalOverlay").classList.remove("hidden");
}

function closeSettingsModal() {
  el("settingsModalOverlay").classList.add("hidden");
  if (reopenEventModalAfterSettings) {
    reopenEventModalAfterSettings = false;
    populateTypeSelect(el("eventTypeSelect").value);
    el("eventModalOverlay").classList.remove("hidden");
  }
}

function initSettingsModal() {
  el("settingsModalClose").addEventListener("click", closeSettingsModal);
  el("settingsDoneBtn").addEventListener("click", closeSettingsModal);
  el("settingsModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "settingsModalOverlay") closeSettingsModal();
  });

  el("brandNameInput").addEventListener("input", (e) => { updateBrand({ name: e.target.value || "Mi Empresa" }); rerender(); });
  el("brandSubtitleInput").addEventListener("input", (e) => { updateBrand({ subtitle: e.target.value }); rerender(); });
  el("accentColorInput").addEventListener("input", (e) => { setAccentColor(e.target.value); applyTheme(); rerender(); });

  el("logoEmojiInput").addEventListener("input", (e) => {
    updateBrand({ logoType: "emoji", logoValue: e.target.value || "📅" });
    renderLogoPreview();
    rerender();
  });
  el("logoFileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const raw = await readFileAsDataUrl(file);
      const resized = await resizeImageDataUrl(raw, 160);
      updateBrand({ logoType: "image", logoValue: resized });
      renderLogoPreview();
      rerender();
    } catch {
      showToast("No se pudo cargar la imagen");
    }
    e.target.value = "";
  });
  el("logoRemoveBtn").addEventListener("click", () => {
    updateBrand({ logoType: "emoji", logoValue: "📅" });
    renderLogoPreview();
    rerender();
  });

  document.querySelectorAll(".theme-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      setTheme(btn.dataset.theme);
      applyTheme();
      renderThemeOptions();
    });
  });

  el("addTypeBtn").addEventListener("click", () => {
    addEventType({});
    renderTypesList();
    rerender();
  });

  el("exportDataBtn").addEventListener("click", () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const { brand } = getState();
    a.href = url;
    a.download = `${brand.name.replace(/\s+/g, "-").toLowerCase()}-calendario-respaldo.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  el("importDataInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!confirm("Esto reemplazará todos tus datos actuales (marca, tipos y eventos). ¿Continuar?")) return;
      replaceAllData(data);
      applyTheme();
      openSettingsModal();
      rerender();
      showToast("Respaldo importado");
    } catch {
      showToast("Archivo inválido");
    }
    e.target.value = "";
  });
}

/* ---------------- Init ---------------- */

export function initModals(rerenderFn) {
  rerender = rerenderFn;
  initEventModal();
  initDayModal();
  initJumpModal();
  initLayoutModal();
  initSettingsModal();

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    [
      "eventModalOverlay", "dayModalOverlay", "jumpModalOverlay", "layoutModalOverlay", "settingsModalOverlay",
    ].forEach((id) => {
      const overlay = el(id);
      if (!overlay.classList.contains("hidden")) overlay.classList.add("hidden");
    });
  });
}
