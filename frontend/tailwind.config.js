/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            colors: {
                scientific: {
                    bg: '#0f172a',    // slate-900
                    surface: '#1e293b', // slate-800
                    text: '#f8fafc',    // slate-50
                    muted: '#94a3b8',   // slate-400
                    accent: '#38bdf8',  // light blue
                    border: '#334155'   // slate-700
                }
            }
        },
    },
    plugins: [],
}
