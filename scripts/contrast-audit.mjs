#!/usr/bin/env node

/**
 * Reproducible WCAG contrast checks for geoMaster's authored UI palette.
 * Normal text uses 4.5:1. Focus indicators and component boundaries use 3:1.
 */
function channel(hex, offset) {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const normalized = hex.replace('#', '').toUpperCase();
  const value = normalized.length === 3
    ? [...normalized].map((part) => part + part).join('')
    : normalized;
  if (!/^[0-9A-F]{6}$/.test(value)) throw new Error(`Invalid colour: ${hex}`);
  return 0.2126 * channel(value, 0) + 0.7152 * channel(value, 2) + 0.0722 * channel(value, 4);
}
function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

const checks = [
  // Landing mode labels and descriptions (same foreground is inherited by both).
  ['Daily Expedition text', '#FFFFFF', '#5242B8', 4.5],
  ['Country text', '#FFFFFF', '#1F5E9C', 4.5],
  ['Flag text', '#FFFFFF', '#A83D2F', 4.5],
  ['Capital text', '#FFFFFF', '#5A439F', 4.5],
  ['Guesser text', '#26233A', '#E7B64C', 4.5],
  // Primary, secondary and selected answer controls.
  ['Primary button normal', '#FFFFFF', '#4F42B7', 4.5],
  ['Primary button hover', '#FFFFFF', '#40349F', 4.5],
  ['Light secondary button', '#29273C', '#FFFDF8', 4.5],
  ['Dark secondary button', '#FBFAFF', '#272741', 4.5],
  ['Light correct answer', '#17354B', '#EAF4FA', 4.5],
  ['Dark correct answer', '#F5FAFF', '#1E3B55', 4.5],
  ['Light wrong answer', '#4C201C', '#FFF0ED', 4.5],
  ['Dark wrong answer', '#FFF7F5', '#4B292E', 4.5],
  // Page, panel and secondary copy.
  ['Light main text on page', '#29273C', '#F5F1E9', 4.5],
  ['Light muted text on panel', '#53516A', '#FFFDF8', 4.5],
  ['Light muted text on secondary surface', '#53516A', '#EEE9DF', 4.5],
  ['Dark main text on page', '#FBFAFF', '#19192D', 4.5],
  ['Dark muted text on panel', '#C6C3D6', '#272741', 4.5],
  ['Dark muted text on secondary surface', '#C6C3D6', '#343451', 4.5],
  // Feedback and timer states.
  ['Light correct feedback', '#175D85', '#FFFDF8', 4.5],
  ['Dark correct feedback', '#8DCEF4', '#272741', 4.5],
  ['Light incorrect feedback', '#A4332B', '#FFFDF8', 4.5],
  ['Dark incorrect feedback', '#FFAAA1', '#272741', 4.5],
  ['Light timer warning', '#8A5B0A', '#FFFDF8', 4.5],
  ['Dark timer warning', '#FFD078', '#272741', 4.5],
  ['Light timer critical', '#A4332B', '#FFFDF8', 4.5],
  ['Dark timer critical', '#FFAAA1', '#272741', 4.5],
  // Step indicators.
  ['Completed step number', '#FFFFFF', '#1F5E9C', 4.5],
  ['Current step number', '#FFFFFF', '#5242B8', 4.5],
  ['Upcoming step number, light', '#53516A', '#EEE9DF', 4.5],
  ['Upcoming step number, dark', '#C6C3D6', '#343451', 4.5],
  // Focus and control boundaries.
  ['Focus indicator, light', '#4939B5', '#F5F1E9', 3],
  ['Focus indicator, dark', '#B7AFFF', '#19192D', 3],
  ['Light control outline', '#29273C', '#F5F1E9', 3],
  ['Dark control outline', '#F4F0FF', '#19192D', 3],
];

let failed = 0;
for (const [name, foreground, background, minimum] of checks) {
  const value = contrast(foreground, background);
  const passed = value >= minimum;
  if (!passed) failed += 1;
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'}  ${name}: ${value.toFixed(2)}:1 (minimum ${minimum}:1)\n`);
}
process.stdout.write(`\n${checks.length - failed}/${checks.length} checks passed.\n`);
if (failed) process.exitCode = 1;
