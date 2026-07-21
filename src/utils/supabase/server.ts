import { createServerClient } from "@supabase/ssr";
import { Request, Response } from "express";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (req: Request, res: Response) => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials missing from server environment.");
  }
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          const cookieHeader = req.headers.cookie || "";
          const cookiesMap: { [key: string]: string } = {};
          cookieHeader.split(";").forEach((str) => {
            const parts = str.split("=");
            const name = parts[0]?.trim();
            const value = parts[1]?.trim();
            if (name) cookiesMap[name] = value;
          });
          return Object.entries(cookiesMap).map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookie(name, value, {
                httpOnly: options?.httpOnly,
                secure: options?.secure,
                sameSite: options?.sameSite as any,
                maxAge: options?.maxAge ? options.maxAge * 1000 : undefined,
                path: options?.path,
                domain: options?.domain,
              });
            });
          } catch {
            // Silence headers sent or environment errors
          }
        },
      },
    }
  );
};
