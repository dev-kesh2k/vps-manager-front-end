/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#0b0f19',
          900: '#111827',
          850: '#1f2937',
          800: '#374151',
          750: '#4b5563',
          700: '#6b7280',
          600: '#9ca3af',
          500: '#cbd5e1',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        cloud: {
          bg: '#f8fafc',
          card: '#ffffff',
          sidebar: '#0f172a',
          border: '#e2e8f0',
          hover: '#f1f5f9',
          text: '#0f172a',
          muted: '#64748b',
          blue: '#0051c3',
          blueHover: '#003e99',
          blueLight: '#eff6ff',
        },
        accent: {
          cyan: '#0284c7',
          emerald: '#10b981',
          violet: '#6366f1',
          amber: '#f59e0b',
          rose: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'cf-card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'cf-card-hover': '0 4px 12px -2px rgba(0, 81, 195, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.05)',
        'cf-dropdown': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 12px -2px rgba(0, 81, 195, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.05)',
        'glow-brand': '0 0 20px -3px rgba(37, 99, 235, 0.25)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.25)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
      },
      backgroundImage: {
        'radial-fade': 'radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.04) 0%, transparent 70%)',
        'grid-pattern': 'linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
