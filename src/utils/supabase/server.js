import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from './config';

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseConfig();

  return createServerClient(url, key,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try{
            for (const cookie of cookiesToSet){
              cookieStore.set(cookie.name, cookie.value, cookie.options)
            }
          }catch(_){}
        }        
      }
    }
  );
}

