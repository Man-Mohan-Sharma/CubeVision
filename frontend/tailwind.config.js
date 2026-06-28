/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT:'#6C63FF', light:'#857DFF', dark:'#4B45CC' },
        accent:   { DEFAULT:'#00D8A4', light:'#33E0B8', dark:'#00A87E' },
        dark:     { bg:'#0F0F1A', card:'#16162A', border:'#2A2A45' },
        cube: { white:'#F5F5F5', yellow:'#FFD700', red:'#EF2B24', orange:'#FF6B35', blue:'#0051A2', green:'#009B48' }
      },
      fontFamily: {
        display:['"Space Grotesk"','sans-serif'],
        body:['"Inter"','sans-serif'],
        mono:['"JetBrains Mono"','monospace'],
      },
      animation: {
        'float':'float 6s ease-in-out infinite',
        'pulse-glow':'pulseGlow 3s ease-in-out infinite',
      },
      keyframes: {
        float:{'0%,100%':{transform:'translateY(0)'},'50%':{transform:'translateY(-10px)'}},
        pulseGlow:{'0%,100%':{opacity:'0.6'},'50%':{opacity:'1'}},
      }
    }
  },
  plugins:[]
}
