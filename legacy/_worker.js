// RustPeek — Worker поверх статики (Workers Assets).
// /api/stats читает JSON из STATS_KV (ключ "stats"), всё остальное — fallthrough на статику.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/stats") {
      return handleStats(request, env);
    }

    // Всё остальное — как раньше, отдаём статические файлы.
    return env.ASSETS.fetch(request);
  },
};

async function handleStats(request, env) {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let raw;
  try {
    raw = await env.STATS_KV.get("stats");
  } catch (err) {
    // KV недоступен — не 500, а честный 503, фронт тихо останется на захардкоженных цифрах.
    return new Response(JSON.stringify({ error: "kv_unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!raw) {
    // Ещё ни разу не запушено с VPS — это ожидаемо при первом деплое.
    return new Response(JSON.stringify({ error: "no_data" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let stats;
  try {
    stats = JSON.parse(raw);
  } catch (err) {
    return new Response(JSON.stringify({ error: "bad_data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Не долбим KV на каждый чих — 60 сек edge-кэш поверх 15-минутного пуша с VPS.
      "Cache-Control": "public, max-age=60",
    },
  });
}
