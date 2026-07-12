/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Design system: Vibrant Analytical System ---
        primary: {
          DEFAULT: '#650cd9',
          container: '#7e3af2',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#006973',
          container: '#85efff',
          foreground: '#ffffff',
        },
        surface: {
          DEFAULT: '#f9f9ff',
          dim: '#d2daef',
          bright: '#f9f9ff',
          lowest: '#ffffff',
          low: '#f1f3ff',
          mid: '#e8eeff',
          high: '#e0e8fd',
          highest: '#dbe2f8',
        },
        background: '#f9f9ff',
        foreground: '#141c2b',
        'on-surface': '#141c2b',
        'on-surface-variant': '#4a4455',
        'inverse-surface': '#293040',
        'inverse-on-surface': '#ecf0ff',
        outline: '#7b7487',
        'outline-variant': '#ccc3d8',
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
          foreground: '#ffffff',
        },
        // Semantic status colors
        status: {
          available: '#006d78',
          'available-bg': '#85efff',
          'on-trip': '#5a00c6',
          'on-trip-bg': '#eaddff',
          'in-shop': '#952a00',
          'in-shop-bg': '#ffe2da',
          retired: '#ba1a1a',
          'retired-bg': '#ffdad6',
          dispatched: '#5a00c6',
          'dispatched-bg': '#eaddff',
          completed: '#006d78',
          'completed-bg': '#85efff',
          cancelled: '#ba1a1a',
          'cancelled-bg': '#ffdad6',
          draft: '#4a4455',
          'draft-bg': '#dbe2f8',
          suspended: '#952a00',
          'suspended-bg': '#ffe2da',
          'off-duty': '#4a4455',
          'off-duty-bg': '#dbe2f8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      fontSize: {
        'kpi': ['24px', { lineHeight: '30px', fontWeight: '700' }],
        'headline-xl': ['30px', { lineHeight: '38px', fontWeight: '700', letterSpacing: '-0.02em' }],
        'headline-lg': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      spacing: {
        'sidebar': '260px',
      },
      boxShadow: {
        card: '0px 1px 3px rgba(0,0,0,0.1)',
        modal: '0px 8px 24px rgba(0,0,0,0.15)',
        'card-hover': '0px 4px 12px rgba(101,12,217,0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
