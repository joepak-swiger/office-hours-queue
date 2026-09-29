import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172033',
        mist: '#F6F8FB',
        campus: '#234E70',
        slateBlue: '#375A7F',
        calm: '#E8F2F8',
        success: '#0F766E',
        warning: '#B45309',
        danger: '#B91C1C'
      },
      boxShadow: {
        soft: '0 18px 45px rgba(23, 32, 51, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
