import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert hex color to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 50 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Convert HSL to hex color
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate a color variation for a cue based on its index within a track.
 * This creates different shades/hues so cues on the same track are distinguishable.
 * @param baseColor - The base color (hex format, e.g., '#14B8A6')
 * @param index - The cue's index within its track
 * @param total - Total number of cues in the track (for better distribution)
 * @returns A varied hex color
 */
export function getCueColorVariation(baseColor: string, index: number, total: number = 10): string {
  if (!baseColor || !baseColor.startsWith('#')) return baseColor || '#888888';
  
  const hsl = hexToHsl(baseColor);
  
  // Create variations by adjusting hue slightly and lightness
  // Use a cycling pattern that creates distinct but related colors
  const hueShift = ((index % 5) - 2) * 8; // -16, -8, 0, 8, 16 degree shifts
  const lightnessShift = ((index % 3) - 1) * 8; // -8, 0, 8 percent shifts
  
  // Apply variations
  let newHue = (hsl.h + hueShift + 360) % 360;
  let newLightness = Math.max(25, Math.min(75, hsl.l + lightnessShift));
  
  // Slightly vary saturation for additional differentiation
  const saturationShift = ((index % 4) - 1.5) * 5;
  let newSaturation = Math.max(40, Math.min(100, hsl.s + saturationShift));
  
  return hslToHex(newHue, newSaturation, newLightness);
}
