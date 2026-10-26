import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base backgrounds & text
        warm: {
          50: '#FDFBF7',   // Main page background (Warm Ivory)
          100: '#FAF6EF',  // Secondary background (Soft Cream)
          200: '#F4ECE1',  // Subtle dividers and borders
          300: '#E8DCB8',  // Accent border
          400: '#D5C4A1',
          500: '#998D7B',
          600: '#6E6659',
          700: '#575046',
          800: '#4A4641',  // Secondary body text (Soft Espresso)
          900: '#2D2A26',  // Primary heading text (Deep Warm Charcoal)
        },
        // Sage Green (Natural Calm & Stability) - Primary brand
        sage: {
          50: '#F2F7F3',   // Light card tint
          100: '#E4EFE6',  // Soft highlight
          200: '#C7DEC9',  // Border accent
          300: '#AECDB1',
          400: '#95BD99',
          500: '#7C9A82',  // Primary action button & active state
          600: '#68866E',  // Hover button state
          700: '#536D58',  // Deep text accent
          800: '#3F5343',
          900: '#2C3A2F',
        },
        // Honey / Butter Yellow (Warmth & Pending Status)
        honey: {
          50: '#FEFBF0',   // Light notification banner
          100: '#FEF8E1',  // Soft badge background
          200: '#FCECB8',  // Notice border
          300: '#F9DF8E',
          400: '#F6D974',
          500: '#F4D35E',  // Pending badge text & warm stars
          600: '#DAB842',  // Hover state
          700: '#B8972E',
          800: '#8C7221',
          900: '#635117',
        },
        // Blush Coral (Care, Emotional Category, Heart)
        blush: {
          50: '#FDF4F2',   // Light card tint
          100: '#FBE8E4',  // Soft badge background
          200: '#F6C9BF',  // Border accent
          300: '#F0A393',
          400: '#EA846E',
          500: '#E76F51',  // Accent highlight & urgent tag
          600: '#CF593C',  // Hover state
          700: '#B0472D',
          800: '#893521',
          900: '#632517',
        },
        // Sky Blue / Mist (Clarity & Anonymous Suggestions)
        mist: {
          50: '#F3F7FA',   // Light card tint
          100: '#E5EFF5',  // Badge background
          200: '#C4DCE9',  // Border
          300: '#A6C9DC',
          400: '#94B8CE',
          500: '#8EA8C3',  // Anonymous badge text
          600: '#7590AB',  // Hover state
          700: '#5C7691',
          800: '#465B72',
          900: '#324254',
        },
      },
      borderRadius: {
        '2xl': '1rem',      // 16px - Standard cards & inputs
        '3xl': '1.5rem',    // 24px - Large containers & modals
        '4xl': '2rem',      // 32px - Hero section banners
      },
      boxShadow: {
        'warm-sm': '0 2px 8px -2px rgba(74, 70, 65, 0.05)',
        'warm-md': '0 8px 24px -4px rgba(74, 70, 65, 0.08)',
        'warm-lg': '0 16px 32px -6px rgba(74, 70, 65, 0.10)',
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'Helvetica Neue',
          'Segoe UI',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
