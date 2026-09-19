import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#008BEA',
          light: '#3FA9F5',
          dark: '#006FBD',
        },
      },
    },
  },
  plugins: [],
};

export default config;
