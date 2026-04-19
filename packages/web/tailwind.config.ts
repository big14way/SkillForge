import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // "Electric mint" accent — close to the 0G brand palette, high-contrast on dark.
        accent: {
          DEFAULT: '#00FFB2',
          muted: '#00cc8e',
        },
        bg: {
          DEFAULT: '#0a0a0b',
          raised: '#131316',
          hover: '#1a1a1f',
          border: '#26262d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Space Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
