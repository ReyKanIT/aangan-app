import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'haldi-gold': '#C8A84B',
        'haldi-gold-light': '#E8D68B',
        'haldi-gold-dark': '#A88A2B',
        'mehndi-green': '#7A9A3A',
        'mehndi-green-light': '#A8C870',
        'cream': '#FDFAF0',
        'cream-dark': '#F5F0E0',
        'brown': '#5C3D1E',
        'brown-light': '#8C6D4E',
        'unread-bg': '#FFF8E1',
        'error': '#D32F2F',
      },
      fontFamily: {
        heading: ['TiroDevanagariHindi', 'serif'],
        body: ['Poppins', 'sans-serif'],
      },
      minHeight: {
        dadi: '52px',
      },
      minWidth: {
        tap: '44px',
        dadi: '52px',
      },
      fontSize: {
        dadi: ['16px', '24px'],
      },
    },
  },
  plugins: [],
};

export default config;
