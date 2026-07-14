// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ⚠️ QUAN TRỌNG: Phải dùng getUser() thay vì getSession()
  // getUser() gọi lên Supabase Auth server → không bị clock skew
  // getSession() chỉ đọc cookie local → có thể throw JWTIssuedAtFuture
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // --- Route protection logic ---
  const { pathname } = request.nextUrl

  // Protect /teacher routes
  if (pathname.startsWith('/teacher')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }

    // Kiểm tra role teacher nếu cần
    // (role nên được lưu trong user_metadata hoặc app_metadata)
    const role = user.user_metadata?.role ?? user.app_metadata?.role
    if (role !== 'teacher' && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }
  }

  // Redirect nếu đã login mà vào trang login/register
  if ((pathname === '/login' || pathname === '/register') && user) {
    const url = request.nextUrl.clone()
    url.pathname = role === 'teacher' ? '/teacher' : '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match tất cả paths NGOẠI TRỪ:
     * - _next/static (static files)
     * - _next/image  (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
