import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    // Validar el paràmetre 'next' per evitar Open Redirect
    // Només permetre paths relatius que comencin amb / (no // ni URLs externes)
    let next = searchParams.get('next') ?? '/dashboard'
    if (!next.startsWith('/') || next.startsWith('//')) {
        next = '/dashboard'
    }

    // Si es una invitación, redirigir a /auth/confirm con los parámetros
    if (type === 'invite' && token_hash) {
        return NextResponse.redirect(
            `${origin}/auth/confirm?token_hash=${token_hash}&type=${type}`
        )
    }

    // Si es recuperación de contraseña, procesar el token y redirigir
    if (type === 'recovery' && token_hash) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        cookieStore.set({ name, value, ...options })
                    },
                    remove(name: string, options: CookieOptions) {
                        cookieStore.delete({ name, ...options })
                    },
                },
            }
        )
        
        const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'recovery',
        })

        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    if (code) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        cookieStore.set({ name, value, ...options })
                    },
                    remove(name: string, options: CookieOptions) {
                        cookieStore.delete({ name, ...options })
                    },
                },
            }
        )
        const { error, data } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.user) {
            // Marcar onboarding com a completat en el primer login exitós
            await supabase
                .from('users')
                .update({ onboarding_status: 'active' })
                .eq('id', data.user.id)
                .eq('onboarding_status', 'invited')
            
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
