export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#0E1C2B',
          800: '#152638',
          700: '#1F3349',
          600: '#2B425C',
          400: '#8FA0B5',
        },
        primary: {
          50: '#E8F5EF',
          100: '#CDEBDD',
          500: '#12825F',
          600: '#0B6E4F',
          700: '#08583F',
        },
        gold: {
          100: '#FDF1D3',
          400: '#F2B84B',
          500: '#E9A21B',
          600: '#C98A0E',
        },
        canvas: '#F5F6F8',
        line: '#E3E6EB',
        fg: {
          DEFAULT: '#0F172A',
          muted: '#5B6576',
          subtle: '#8A93A3',
        },
        danger: {
          50: '#FDECEC',
          500: '#D93A3A',
          600: '#B92C2C',
          700: '#992323',
        },
        warn: {
          50: '#FEF4E2',
          500: '#E08E0B',
          600: '#A15F00',
        },
        info: {
          50: '#E9F0FD',
          500: '#3B6FD8',
          600: '#2457C5',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
        pop: '0 16px 40px -12px rgba(15,23,42,0.28)',
      },
    },
  },
};

