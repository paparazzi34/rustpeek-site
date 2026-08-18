// RustPeek — Worker поверх статики (Workers Assets / Pages advanced mode).
//
// Делает три вещи:
//   1. /api/stats — отдаёт JSON из STATS_KV (ключ "stats"), как и раньше;
//   2. SPA-фолбэк — любой маршрут вида /servers/123 отдаёт index.html,
//      иначе прямой заход по ссылке отдавал бы 404;
//   3. всё остальное — статика как есть.

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/stats') {
      return handleStats(request, env)
    }

    const res = await env.ASSETS.fetch(request)
    const isHtml = (res.headers.get('content-type') || '').includes('text/html')

    // Cloudflare Pages на несуществующий путь и так отдаёт index.html — это
    // ровно то, что нужно клиентскому роутингу. Но у этого поведения есть
    // побочка: пропавший бандл (например, у пользователя закэширован старый
    // index.html со ссылкой на удалённый хэш) тоже приходит как HTML с кодом
    // 200, и браузер падает с невнятным "MIME type text/html". Честнее
    // ответить 404 — тогда причина видна сразу.
    if (isHtml && url.pathname.startsWith('/assets/')) {
      return new Response('Not Found', { status: 404 })
    }

    // Подстраховка для Workers Static Assets: там ASSETS отдаёт настоящий 404,
    // и SPA-фолбэк нужно делать самим.
    if (res.status === 404 && request.method === 'GET') {
      const accept = request.headers.get('accept') || ''
      if (accept.includes('text/html')) {
        const shell = await env.ASSETS.fetch(new Request(new URL('/index.html', url), request))
        return new Response(shell.body, {
          status: 200,
          headers: {
            ...Object.fromEntries(shell.headers),
            'Content-Type': 'text/html; charset=utf-8',
          },
        })
      }
    }

    return res
  },
}

async function handleStats(request, env) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let raw
  try {
    raw = await env.STATS_KV.get('stats')
  } catch {
    // KV недоступен — честный 503, а не 500: фронт просто не покажет цифры.
    return json({ error: 'kv_unavailable' }, 503)
  }

  if (!raw) return json({ error: 'no_data' }, 404)

  try {
    return new Response(raw, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // 60 сек edge-кэша поверх 15-минутного пуша с VPS — не долбим KV.
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch {
    return json({ error: 'bad_data' }, 500)
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
