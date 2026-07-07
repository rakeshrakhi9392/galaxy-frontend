import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        "muted-foreground": "hsl(var(--muted-foreground))",
        "brand-neutral-dark-900": "var(--brand-neutral-dark-900)",
        "surface-main-background": "var(--surface-main-background)",
        "surface-main-background-2": "var(--surface-main-background-2)",
        "surface-main-background-3": "var(--surface-main-background-3)",
        "surface-primary": "var(--surface-primary)",
        "surface-secondary": "var(--surface-secondary)",
        "surface-tertiary": "var(--surface-tertiary)",
        "surface-on-action": "var(--surface-on-action)",
        "surface-disabled": "var(--surface-disabled)",
        "surface-success-disabled": "var(--surface-success-disabled)",
        "surface-information-disabled": "var(--surface-information-disabled)",
        "surface-error-disabled": "var(--surface-error-disabled)",
        "text-success": "var(--text-success)",
        "text-success-disabled": "var(--text-success-disabled)",
        "text-information-disabled": "var(--text-information-disabled)",
        "text-error-disabled": "var(--text-error-disabled)",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        ring: "hsl(var(--ring))",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "text-on-action": "var(--icon-on-action)",
        "icon-primary": "var(--icon-primary)",
        "icon-tertiary": "var(--icon-tertiary)",
        "icon-on-action": "var(--icon-on-action)",
        "boarder-primary": "var(--boarder-primary)",
        "boarder-tertiary": "var(--boarder-tertiary)",
        "boarder-secondary": "var(--boarder-secondary)",
        "galaxy-surface-main": "var(--galaxy-surface-main)",
        "workflow-accent": {
          400: "var(--brand-indigo-400)",
          500: "var(--brand-indigo-500)",
          600: "var(--brand-indigo-600)",
          700: "var(--brand-indigo-700)",
        },
      },
      spacing: {
        "space-02": "var(--space-02)",
        "space-03": "var(--space-03)",
        "space-04": "var(--space-04)",
        "space-05": "var(--space-05)",
        "space-06": "var(--space-06)",
        "space-07": "var(--space-07)",
        "space-08": "var(--space-08)",
        "space-09": "var(--space-09)",
        "space-default-padding": "var(--space-default-padding)",
      },
      borderRadius: {
        "radius-l": "var(--radius-l)",
        "radius-xl": "var(--radius-xl)",
        "radius-xxl": "var(--radius-xxl)",
        "radius-m": "var(--radius-m)",
      },
      borderWidth: {
        "width-xs": "var(--border-width-xs)",
        "width-s": "var(--border-width-s)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
      },
      keyframes: {
        nodeExecutingGlow: {
          "0%, 100%": { boxShadow: "rgba(79, 70, 230, 0.3) 0px 0px 15px" },
          "50%": { boxShadow: "rgba(79, 70, 230, 0.5) 0px 0px 24px" },
        },
        nodeFailedGlow: {
          "0%, 100%": { boxShadow: "rgba(239, 68, 68, 0.3) 0px 0px 15px" },
          "50%": { boxShadow: "rgba(239, 68, 68, 0.5) 0px 0px 24px" },
        },
        runButtonExecutingGlow: {
          "0%, 100%": { boxShadow: "inset 0 0 0 1px rgba(93,63,211,0.35), 0 0 12px rgba(93,63,211,0.25)" },
          "50%": { boxShadow: "inset 0 0 0 1px rgba(93,63,211,0.55), 0 0 20px rgba(93,63,211,0.4)" },
        },
        requestFieldCopyToast: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        canvasMessageToast: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        dashdraw: {
          to: { strokeDashoffset: "-10" },
        },
      },
      animation: {
        "node-executing": "nodeExecutingGlow 1s ease-in-out infinite",
        "node-failed": "nodeFailedGlow 1.5s ease-in-out infinite",
        "run-button-executing": "runButtonExecutingGlow 1s ease-in-out infinite",
        "field-copy-toast": "requestFieldCopyToast 200ms ease-out",
        "canvas-message-toast": "canvasMessageToast 220ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
