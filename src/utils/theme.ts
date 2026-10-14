export const DEFAULT_THEME_COLOR = '#6b7280';

export function buildThemePalette(hex: string) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/i.test(hex)) {
    hex = DEFAULT_THEME_COLOR;
  }
  return {
    deepest: '#1f2937',
    strong: '#374151',
    dark: '#4b5563',
    hover: '#4b5563',
    base: hex,
    light: '#9ca3af',
    lighter: '#d1d5db'
  };
}

export function applyThemeColor(hex: string) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/i.test(hex)) {
    hex = '#6b7280';
  }

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const clamp = (val: number) => Math.min(255, Math.max(0, Math.round(val)));

  // Lighter variant (400 grade)
  const rLight = clamp(r + (255 - r) * 0.25);
  const gLight = clamp(g + (255 - g) * 0.25);
  const bLight = clamp(b + (255 - b) * 0.25);
  const lightHex = `#${rLight.toString(16).padStart(2, '0')}${gLight.toString(16).padStart(2, '0')}${bLight.toString(16).padStart(2, '0')}`;

  // Even lighter variant (300 grade)
  const rLighter = clamp(r + (255 - r) * 0.5);
  const gLighter = clamp(g + (255 - g) * 0.5);
  const bLighter = clamp(b + (255 - b) * 0.5);
  const lighterHex = `#${rLighter.toString(16).padStart(2, '0')}${gLighter.toString(16).padStart(2, '0')}${bLighter.toString(16).padStart(2, '0')}`;

  // Darker variant (600 grade)
  const rDark = clamp(r * 0.82);
  const gDark = clamp(g * 0.82);
  const bDark = clamp(b * 0.82);
  const hoverHex = `#${rDark.toString(16).padStart(2, '0')}${gDark.toString(16).padStart(2, '0')}${bDark.toString(16).padStart(2, '0')}`;

  // Even darker variant (700 grade)
  const rDarker = clamp(r * 0.65);
  const gDarker = clamp(g * 0.65);
  const bDarker = clamp(b * 0.65);
  const darkHex = `#${rDarker.toString(16).padStart(2, '0')}${gDarker.toString(16).padStart(2, '0')}${bDarker.toString(16).padStart(2, '0')}`;

  const root = document.documentElement;
  root.style.setProperty('--theme-color', hex);
  root.style.setProperty('--theme-color-rgb', `${r}, ${g}, ${b}`);
  root.style.setProperty('--theme-color-light', lightHex);
  root.style.setProperty('--theme-color-lighter', lighterHex);
  root.style.setProperty('--theme-color-hover', hoverHex);
  root.style.setProperty('--theme-color-dark', darkHex);
}
