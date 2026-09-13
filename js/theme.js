import { getState } from "./state.js";

const mql = window.matchMedia("(prefers-color-scheme: dark)");

export function applyTheme() {
  const { theme, accentColor } = getState();
  const effective = theme === "system" ? (mql.matches ? "dark" : "light") : theme;
  document.documentElement.setAttribute("data-theme", effective);
  document.documentElement.style.setProperty("--accent", accentColor);
}

mql.addEventListener("change", () => {
  if (getState().theme === "system") applyTheme();
});
