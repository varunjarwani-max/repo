/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Redesign design tokens: Linear / Vercel-like palette
        bg: '#0B0D10',
        surface: '#12151A',
        'surface-2': '#181C22',
        border: 'rgba(255, 255, 255, 0.06)',
        text: '#E6E8EB',
        muted: '#8B919A',
        accent: '#34D399',

        category: {
          recyclable: '#10B981',
          organic: '#F59E0B',
          hazardous: '#EF4444',
          nonrecyclable: '#64748B',
        },
        bin: {
          recyclable: '#2563EB',
          organic: '#16A34A',
          hazardous: '#DC2626',
          nonrecyclable: '#0F172A',
        }
      },
      borderRadius: {
        card: '12px',
        panel: '16px',
      },
      fontSize: {
        'xs-12': ['12px', '16px'],
        'sm-14': ['14px', '20px'],
        'base-16': ['16px', '24px'],
        'lg-20': ['20px', '28px'],
        'xl-32': ['32px', '40px'],
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        // No outer glows except hazard per redesign brief
        'glow-hazardous': '0 0 16px -2px rgba(239, 68, 68, 0.45)',
        'panel-highlight': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
      keyframes: {
        pulseHazard: {
          '0%, 100%': { boxShadow: '0 0 14px 2px rgba(239, 68, 68, 0.45)', opacity: '1' },
          '50%': { boxShadow: '0 0 6px 0px rgba(239, 68, 68, 0.15)', opacity: '0.85' },
        },
        scanSweep: {
          '0%': { top: '0%', opacity: '0.85' },
          '50%': { top: '96%', opacity: '1' },
          '100%': { top: '0%', opacity: '0.85' },
        }
      },
      animation: {
        'pulse-hazard': 'pulseHazard 2.4s ease-in-out infinite',
        'scan-sweep': 'scanSweep 2.2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
