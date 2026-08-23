import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerConfig } from "@/lib/config";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[2];
};

export async function createSupabaseServerClient() {
  const config = getServerConfig();
  const url = config.NEXT_PUBLIC_SUPABASE_URL;
  const key = config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase MVP v3 project is not configured");

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items: CookieToSet[]) {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies. Middleware/actions handle refresh writes.
        }
      }
    }
  });
}
