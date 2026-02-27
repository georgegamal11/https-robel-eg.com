import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#c9a23f',
                    dark: '#b08d2b',
                    light: '#e0c168',
                },
                secondary: '#64748b',
                navy: {
                    deep: '#0f172a',
                    light: '#1e293b',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                arabic: ['Tajawal', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
export default config;
