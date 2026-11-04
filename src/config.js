// Reads the two Supabase settings. On your computer they come from the .env file;
// on Netlify they come from Site configuration → Environment variables.
// Vite only passes variables whose names start with VITE_ to the browser.
const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();

// The values in .env.example are placeholders, not a real project.
const isPlaceholder = url.includes("your-project-id") || key.includes("paste-your-key");

export const SUPABASE_URL = url;
export const SUPABASE_KEY = key;

// Local mode: Supabase isn't connected yet, so data is saved in this browser (localStorage).
export const LOCAL_MODE = !url || !key || isPlaceholder;
