/**
 * Tailwind runs alongside the original design-system stylesheet (src/styles/index.css).
 * Preflight is disabled so the existing base styles stay exactly as they were;
 * the theme maps Tailwind names onto the same CSS variables (see DESIGN.md).
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        brand: {
          green: "var(--color-brand-green)",
          accent: "var(--color-brand-accent)",
          house: "var(--color-brand-house)",
          uplift: "var(--color-brand-uplift)",
          light: "var(--color-brand-light)",
        },
        gold: {
          DEFAULT: "var(--color-gold)",
          light: "var(--color-gold-light)",
          lightest: "var(--color-gold-lightest)",
        },
        canvas: {
          warm: "var(--color-canvas-warm)",
          ceramic: "var(--color-canvas-ceramic)",
        },
        surface: {
          white: "var(--color-surface-white)",
          cool: "var(--color-surface-cool)",
        },
        ink: {
          DEFAULT: "var(--text-primary)",
          soft: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        danger: "var(--color-error)",
        warning: "var(--color-warning)",
      },
      fontFamily: {
        sans: ["Inter", "Plus Jakarta Sans", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        serif: ["Lora", "Iowan Old Style", "Georgia", "serif"],
        script: ["Kalam", "cursive"],
      },
      borderRadius: {
        pill: "50px",
        card: "12px",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        modal: "var(--shadow-modal)",
      },
      screens: {
        xs: "480px",
      },
    },
  },
  plugins: [],
};
