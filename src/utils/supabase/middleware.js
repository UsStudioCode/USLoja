import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { getSupabaseConfig } from './config';

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({request});
  const { url, key } = getSupabaseConfig();

  const supabase = createServerClient(url, key,
    { cookies: {
        getAll() { return request.cookies.getAll();},
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({request});
          
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {data: { user },} = await supabase.auth.getUser();

  const protectedPath =
    request.nextUrl.pathname === '/buyers' ||
    request.nextUrl.pathname.startsWith('/buyers/') ||
    request.nextUrl.pathname === '/admin/painel' ||
    request.nextUrl.pathname.startsWith('/admin/painel/');

  if (!user && protectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}