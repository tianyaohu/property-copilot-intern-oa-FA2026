import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function lin(channel: number): number {
  const c = channel / 255;
  // WCAG 2 relative luminance. The 0.03928 cutoff is the one in the spec.
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function contrast(a: number[], b: number[]): number {
  const lum = (rgb: number[]) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
  return (hi + 0.05) / (lo + 0.05);
}

function block(css: string, which: "light" | "dark"): string {
  if (which === "light") {
    const match = css.match(/:root\s*\{([^}]*)\}/);
    if (!match) throw new Error("missing :root tokens");
    return match[1];
  }
  const match = css.match(/@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)\s*\{([\s\S]*?)\n\}/);
  if (!match) throw new Error("missing prefers-color-scheme: dark tokens");
  return match[1];
}

function channels(cssBlock: string, name: string): number[] {
  const match = cssBlock.match(new RegExp(`--${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)`));
  if (!match) throw new Error(`missing --${name}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

describe("design tokens", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  it("gives UI borders at least 3:1 against both the page and the surface", () => {
    for (const which of ["light", "dark"] as const) {
      const tokens = block(css, which);
      const border = channels(tokens, "border");
      const bg = channels(tokens, "bg");
      const surface = channels(tokens, "surface");
      expect(contrast(border, bg), `${which} border vs bg`).toBeGreaterThanOrEqual(3);
      expect(contrast(border, surface), `${which} border vs surface`).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps text, muted text, and danger text at 4.5:1 in both color schemes", () => {
    for (const which of ["light", "dark"] as const) {
      const tokens = block(css, which);
      const bg = channels(tokens, "bg");
      const surface = channels(tokens, "surface");
      const fg = channels(tokens, "fg");
      const muted = channels(tokens, "muted");
      const danger = channels(tokens, "danger");
      const accent = channels(tokens, "accent");
      const accentFg = channels(tokens, "accent-fg");
      expect(contrast(fg, bg), `${which} fg vs bg`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(fg, surface), `${which} fg vs surface`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(muted, bg), `${which} muted vs bg`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(muted, surface), `${which} muted vs surface`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(danger, bg), `${which} danger vs bg`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(danger, surface), `${which} danger vs surface`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(accentFg, accent), `${which} accent text`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("tells the browser which color scheme the tokens are, so native controls match", () => {
    expect(block(css, "light")).toContain("color-scheme: light");
    expect(block(css, "dark")).toContain("color-scheme: dark");
  });
});
