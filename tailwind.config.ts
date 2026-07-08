import type { Config } from "tailwindcss";

/**
 * Design tokens live as CSS variables (see app/globals.css) and are surfaced
 * here as semantic Tailwind colors. Components reference intent — `bg-surface`,
 * `text-muted`, `bg-accent` — never raw palette values, so the whole look is
 * retuned in one place. The `rgb(var(--x) / <alpha-value>)` form keeps opacity
 * utilities like `bg-accent/10` working.
 */
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          fg: "rgb(var(--accent-fg) / <alpha-value>)"
        },
        danger: "rgb(var(--danger) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-sans)"]
      },
      boxShadow: {
        popover: "0 12px 32px -8px rgb(0 0 0 / 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
