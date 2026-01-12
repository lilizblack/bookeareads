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
                background: "var(--color-bg-primary)",
                // We can map other variables if we want fully custom utilities, 
                // but often standard tailwind colors (+ arbitrary values) work well.
            },
        },
    },
    plugins: [],
}
