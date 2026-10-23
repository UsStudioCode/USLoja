import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/buyers'

  if (code) {
    const supabase = await createClient();    
    
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && sessionData?.user) {
      const user = sessionData.user
      const email = user.email

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, phone')
        .eq('id', user.id)
        .single()

      if (profile && profile.phone) {
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        return NextResponse.redirect(`${origin}/signup/verify?provider=google&email=${encodeURIComponent(email)}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could not authenticate with provider`)
}