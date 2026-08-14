export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  ALLOWED_ORIGINS: string;
}

interface LeadPayload {
  name?: string;
  sector?: string;
  interest?: string;
  contact?: string;
  message?: string;
  locale?: string;
  company?: string;
}

const rateMap = new Map<string, { count: number; reset: number }>();
const MAX = {
  name: 80,
  sector: 32,
  interest: 32,
  contact: 80,
  message: 2000,
  locale: 8,
};

function allowedList(env: Env): string[] {
  return (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null, allowed: string[]): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(data: unknown, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function limited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 8;
  const current = rateMap.get(ip);
  if (!current || current.reset < now) {
    rateMap.set(ip, { count: 1, reset: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > max;
}

function clip(value: unknown, max: number): string {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, max);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowed = allowedList(env);
    const origin = request.headers.get('Origin');
    const headers = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') {
      if (origin && !allowed.includes(origin)) {
        return new Response(null, { status: 403, headers });
      }
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, 405, headers);
    }

    if (origin && allowed.length && !allowed.includes(origin)) {
      return json({ ok: false, error: 'origin_not_allowed' }, 403, headers);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (limited(ip)) {
      return json({ ok: false, error: 'rate_limited' }, 429, headers);
    }

    let body: LeadPayload;
    try {
      body = (await request.json()) as LeadPayload;
    } catch {
      return json({ ok: false, error: 'invalid_json' }, 400, headers);
    }

    if (body.company && String(body.company).trim()) {
      return json({ ok: true }, 200, headers);
    }

    const name = clip(body.name, MAX.name);
    const sector = clip(body.sector, MAX.sector);
    const interest = clip(body.interest, MAX.interest);
    const contact = clip(body.contact, MAX.contact);
    const message = String(body.message || '').trim().slice(0, MAX.message);
    const locale = clip(body.locale, MAX.locale);

    if (!name || !sector || !interest || !contact || !message) {
      return json({ ok: false, error: 'validation' }, 400, headers);
    }

    const text = [
      'Заявка zairov',
      `Имя: ${name}`,
      `Сектор: ${sector}`,
      `Интересует: ${interest}`,
      `Контакт: ${contact}`,
      `Задача: ${message}`,
      `Язык сайта: ${locale || 'ru'}`,
    ].join('\n');

    const tgRes = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text,
        }),
      },
    );

    if (!tgRes.ok) {
      return json({ ok: false, error: 'telegram_failed' }, 502, headers);
    }

    return json({ ok: true }, 200, headers);
  },
};
