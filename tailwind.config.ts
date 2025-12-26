import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			sans: [
  				'Montserrat',
  				'ui-sans-serif',
  				'system-ui',
  				'sans-serif',
  				'Apple Color Emoji',
  				'Segoe UI Emoji',
  				'Segoe UI Symbol',
  				'Noto Color Emoji'
  			],
  			serif: [
  				'Cormorant Garamond',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			],
  			mono: [
  				'IBM Plex Mono',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		},
		colors: {
			border: "hsl(var(--border) / <alpha-value>)",
			input: "hsl(var(--input) / <alpha-value>)",
			ring: "hsl(var(--ring) / <alpha-value>)",
			background: "hsl(var(--background) / <alpha-value>)",
			foreground: "hsl(var(--foreground) / <alpha-value>)",
			primary: {
				DEFAULT: "hsl(var(--primary) / <alpha-value>)",
				foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
			},
			secondary: {
				DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
				foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
			},
			destructive: {
				DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
				foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
			},
			muted: {
				DEFAULT: "hsl(var(--muted) / <alpha-value>)",
				foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
			},
			accent: {
				DEFAULT: "hsl(var(--accent) / <alpha-value>)",
				foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
			},
			popover: {
				DEFAULT: "hsl(var(--popover) / <alpha-value>)",
				foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
			},
			card: {
				DEFAULT: "hsl(var(--card) / <alpha-value>)",
				foreground: "hsl(var(--card-foreground) / <alpha-value>)",
			},
			sidebar: {
				DEFAULT: "var(--sidebar-background)",
				foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
				primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
				"primary-foreground": "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
				accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
				"accent-foreground": "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
				border: "hsl(var(--sidebar-border) / <alpha-value>)",
				ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
			},
			chart: {
				"1": "hsl(var(--chart-1) / <alpha-value>)",
				"2": "hsl(var(--chart-2) / <alpha-value>)",
				"3": "hsl(var(--chart-3) / <alpha-value>)",
				"4": "hsl(var(--chart-4) / <alpha-value>)",
				"5": "hsl(var(--chart-5) / <alpha-value>)",
			},
		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			DEFAULT: 'var(--shadow)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'slide-in': {
  				'0%': {
  					transform: 'translateX(-100%)'
  				},
  				'100%': {
  					transform: 'translateX(0)'
  				}
  			},
  			'pulse-glow': {
  				'0%, 100%': {
  					boxShadow: '0 0 20px color-mix(in oklch, var(--primary) 30%, transparent)'
  				},
  				'50%': {
  					boxShadow: '0 0 30px color-mix(in oklch, var(--primary) 50%, transparent)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.5s ease-out',
  			'slide-in': 'slide-in 0.3s ease-out',
  			'pulse-glow': 'pulse-glow 2s ease-in-out infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
