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
                // Primary - Violet
                violet: {
                    primary: 'var(--violet-primary)',
                    light: 'var(--violet-light)',
                    dark: 'var(--violet-dark)',
                    darker: 'var(--violet-darker)',
                },
                // Secondary - Emerald
                emerald: {
                    secondary: 'var(--emerald-secondary)',
                    light: 'var(--emerald-light)',
                    dark: 'var(--emerald-dark)',
                },
                // Accents
                accent: {
                    amber: 'var(--amber-accent)',
                    rose: 'var(--rose-accent)',
                    blue: 'var(--blue-accent)',
                },
                // Semantic
                success: 'var(--success)',
                warning: 'var(--warning)',
                error: 'var(--error)',
                info: 'var(--info)',
            },
            fontFamily: {
                ui: 'var(--font-ui)',
                content: 'var(--font-content)',
            },
            spacing: {
                'safe-top': 'env(safe-area-inset-top)',
                'safe-bottom': 'env(safe-area-inset-bottom)',
                'safe-left': 'env(safe-area-inset-left)',
                'safe-right': 'env(safe-area-inset-right)',
            },
            minWidth: {
                'touch': 'var(--touch-min)',
                'touch-comfortable': 'var(--touch-comfortable)',
                'touch-large': 'var(--touch-large)',
            },
            minHeight: {
                'touch': 'var(--touch-min)',
                'touch-comfortable': 'var(--touch-comfortable)',
                'touch-large': 'var(--touch-large)',
            },
            boxShadow: {
                'soft-sm': 'var(--shadow-sm)',
                'soft-md': 'var(--shadow-md)',
                'soft-lg': 'var(--shadow-lg)',
                'soft-xl': 'var(--shadow-xl)',
                'soft-2xl': 'var(--shadow-2xl)',
                'violet': 'var(--shadow-violet)',
                'emerald': 'var(--shadow-emerald)',
                'rose': 'var(--shadow-rose)',
            },
            transitionDuration: {
                'fast': '150ms',
                'base': '200ms',
                'slow': '300ms',
            },
            transitionTimingFunction: {
                'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            },
        },
    },
    plugins: [],
}
