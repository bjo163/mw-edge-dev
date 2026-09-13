export type ThemePreference = "system" | "light" | "dark";
export type DensityPreference = "compact" | "comfortable" | "touch";

const THEME_KEY = "mw-edge.theme";
const DENSITY_KEY = "mw-edge.density";

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* preference persistence is best-effort */ }
}

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function isDensityPreference(value: string | null): value is DensityPreference {
  return value === "compact" || value === "comfortable" || value === "touch";
}

export function getThemePreference(): ThemePreference {
  const value = safeGet(THEME_KEY);
  return isThemePreference(value) ? value : "system";
}

export function getDensityPreference(): DensityPreference {
  const value = safeGet(DENSITY_KEY);
  return isDensityPreference(value) ? value : "comfortable";
}

export function applyTheme(theme: ThemePreference): void {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export function applyDensity(density: DensityPreference): void {
  if (density === "comfortable") delete document.documentElement.dataset.density;
  else document.documentElement.dataset.density = density;
}

export function setThemePreference(theme: ThemePreference): void {
  safeSet(THEME_KEY, theme);
  applyTheme(theme);
}

export function setDensityPreference(density: DensityPreference): void {
  safeSet(DENSITY_KEY, density);
  applyDensity(density);
}

export function applyAppearancePreferences(): void {
  applyTheme(getThemePreference());
  applyDensity(getDensityPreference());
}
