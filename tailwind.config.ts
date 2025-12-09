import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        claude: "#5B68DF",
        gpt: "#10A37F",
        gemini: {
          start: "#9334EA",
          end: "#EA4335",
        },
        consensus: "#F59E0B",
      },
    },
  },
  plugins: [],
} satisfies Config;
