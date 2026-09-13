import { getState } from "./state.js";
import { MONTH_NAMES } from "./utils.js";
import { showToast } from "./modals.js";

export async function exportCalendarToPdf() {
  const target = document.getElementById("calendarCapture");
  const { jsPDF } = window.jspdf || {};
  if (!window.html2canvas || !jsPDF) {
    showToast("No se pudo cargar el generador de PDF (revisa tu conexión)");
    return;
  }

  const btn = document.getElementById("pdfBtn");
  const originalLabel = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "Generando…";

  try {
    const bg = getComputedStyle(target).backgroundColor;
    const canvas = await window.html2canvas(target, {
      scale: 2,
      backgroundColor: bg,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const marginPt = 24;
    // canvas was rendered at scale:2, so divide back to CSS px, then convert px(96dpi) -> pt
    const pxToPt = 0.75;
    const imgWidthPt = (canvas.width / 2) * pxToPt;
    const imgHeightPt = (canvas.height / 2) * pxToPt;

    const pdf = new jsPDF({
      orientation: imgWidthPt >= imgHeightPt ? "landscape" : "portrait",
      unit: "pt",
      format: [imgWidthPt + marginPt * 2, imgHeightPt + marginPt * 2],
    });

    pdf.addImage(imgData, "PNG", marginPt, marginPt, imgWidthPt, imgHeightPt, undefined, "FAST");

    const { view } = getState();
    const { brand } = getState();
    const fileName = `${brand.name.replace(/\s+/g, "-")}-${MONTH_NAMES[view.month]}-${view.year}.pdf`
      .toLowerCase()
      .normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
    pdf.save(fileName);
    showToast("PDF generado");
  } catch (err) {
    console.error(err);
    showToast("Ocurrió un error al generar el PDF");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalLabel;
  }
}
