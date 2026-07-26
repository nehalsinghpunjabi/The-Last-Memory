import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#000000',
        ash: '#0a0b0d',
        signal: '#9fd8ff', // cold AI light
        ember: '#ffb774', // human warmth
        gold: '#ffd9a0',
        decay: '#ff5a4a',
        bone: '#e8e4dc',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['var(--font-display)', 'Georgia', 'Times New Roman', 'serif'],
      },
      letterSpacing: {
        cinema: '0.42em',
        wide2: '0.22em',
      },
      transitionTimingFunction: {
        cinema: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '41%': { opacity: '1' },
          '42%': { opacity: '0.25' },
          '43%': { opacity: '1' },
          '77%': { opacity: '1' },
          '78%': { opacity: '0.55' },
          '79%': { opacity: '1' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        flicker: 'flicker 6s linear infinite',
        breathe: 'breathe 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
