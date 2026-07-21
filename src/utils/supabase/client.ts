import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isPlaceholder = (url?: string, key?: string) => {
  if (!url || !key) return true;
  if (url.includes("placeholder") || key.includes("placeholder") || url.includes("your-") || key.includes("your-")) {
    return true;
  }
  return false;
};

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey || isPlaceholder(supabaseUrl, supabaseKey)) {
    console.warn("Supabase credentials missing or set to placeholder. Using safe dummy client proxy to prevent runtime crashes.");
    // Return a dummy proxy to prevent any crashes from unconfigured environment
    const dummy: any = new Proxy(() => dummy, {
      get: (target, prop) => {
        if (prop === "then") {
          // When awaited, resolve immediately to a safe mock response
          return (resolve: any) => resolve({ data: null, error: null });
        }
        return dummy;
      },
      apply: () => dummy,
    });
    return dummy;
  }
  try {
    return createBrowserClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
    const dummy: any = new Proxy(() => dummy, {
      get: (target, prop) => {
        if (prop === "then") {
          return (resolve: any) => resolve({ data: null, error: null });
        }
        return dummy;
      },
      apply: () => dummy,
    });
    return dummy;
  }
};

