/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#ffffff',
          alt1: '#fafaf9',
          alt2: '#f9f9f8',
          alt3: '#f5f5f3',
          alt4: '#f0f0ee',
        },
        border: {
          DEFAULT: '#ebebea',
          alt1: '#e8e8e4',
          alt2: '#e4e4e0',
          alt3: '#deded8',
        },
        text: {
          primary: '#080808',
          secondary: '#5a5a55',
          muted1: '#a0a09a',
          muted2: '#b0b0a8',
          muted3: '#c8c8c2',
        },
        accent: '#080808',
        success: '#22c55e',
        error: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'Helvetica Neue', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 6px rgba(8, 8, 8, 0.06)',
      }
    },
  },
  plugins: [],
}
