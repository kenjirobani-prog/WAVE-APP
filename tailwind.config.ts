import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        display: ['var(--font-anton)', 'Impact', 'sans-serif'],
        sans: ['var(--font-inter)', 'var(--font-noto-jp)', 'system-ui', 'sans-serif'],
        jp: ['var(--font-noto-jp)', 'sans-serif'],
      },
      keyframes: {
        'bounce-x': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(4px)' },
        },
        'pulse-right': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(4px)' },
        },
      },
      animation: {
        'bounce-x': 'bounce-x 1s ease-in-out infinite',
        'pulse-right': 'pulse-right 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
