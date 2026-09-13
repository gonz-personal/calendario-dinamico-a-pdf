import { getState, setView, setTheme } from "./state.js";
import { applyTheme } from "./theme.js";
import { renderAll } from "./render.js";
import { initModals, openEventModal, openDayModal, openJumpModal, openSettingsModal } from "./modals.js";
import { exportCalendarToPdf } from "./pdf.js";

const handlers = {
  onAddEvent: (dateStr) => openEventModal(dateStr),
  onEditEvent: (eventId) => openEventModal(null, eventId),
  onShowDay: (dateStr) => openDayModal(dateStr),
  onNavigateToOutsideDay: (year, month) => { setView(year, month); rerender(); },
};

function rerender() {
  renderAll(handlers);
}

function initToolbar() {
  document.getElementById("prevMonthBtn").addEventListener("click", () => {
    const { view } = getState();
    setView(view.year, view.month - 1);
    rerender();
  });
  document.getElementById("nextMonthBtn").addEventListener("click", () => {
    const { view } = getState();
    setView(view.year, view.month + 1);
    rerender();
  });
  document.getElementById("todayBtn").addEventListener("click", () => {
    const now = new Date();
    setView(now.getFullYear(), now.getMonth());
    rerender();
  });
  document.getElementById("jumpBtn").addEventListener("click", openJumpModal);
  document.getElementById("settingsBtn").addEventListener("click", openSettingsModal);
  document.getElementById("pdfBtn").addEventListener("click", exportCalendarToPdf);
  document.getElementById("themeToggleBtn").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme();
  });
}

applyTheme();
initToolbar();
initModals(rerender);
rerender();
