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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const TZ = 'Asia/Bishkek';

const SECTOR_LABEL: Record<string, string> = {
  private: 'Частный сектор',
  gov: 'Государственный сектор',
  other: 'Другое',
};

const INTEREST_LABEL: Record<string, string> = {
  turnkey: 'Сайт под ключ',
  landing: 'Сайт под ключ',
  ecommerce: 'Интернет-магазин',
  crm: 'CRM / внутренняя система',
  bots: 'Telegram-бот / AI-ассистент',
  aibots: 'Telegram-бот / AI-ассистент',
  automation: 'Интеграции и автоматизация',
  support: 'Сопровождение',
  other: 'Другое / комплексное IT-решение',
};

const LOCALE_LABEL: Record<string, string> = {
  ru: 'Русский',
  ky: 'Кыргызский',
  en: 'English',
};

function label(map: Record<string, string>, value: string): string {
  return map[value] || value;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function intlPhone(value: string): string {
  const digits = digitsOnly(value);
  if (digits.length === 9) return `996${digits}`;
  return digits;
}

function formatPhone(value: string): string {
  const digits = intlPhone(value);
  if (digits.length === 12 && digits.startsWith('996')) {
    return `+996 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return value;
}

function dateParts(now: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return map;
}

function shortHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
}

function orderId(now: Date, seed: string): string {
  const p = dateParts(now);
  const yy = (p.year || '').slice(-2);
  return `#ZW-${yy}${p.month}${p.day}-${shortHash(`${now.getTime()}|${seed}`)}`;
}

function formatReceived(now: Date): string {
  const p = dateParts(now);
  return `${p.day}.${p.month}.${p.year} • ${p.hour}:${p.minute}`;
}

function contactLine(contact: string): string {
  const formatted = formatPhone(contact);
  const digits = intlPhone(contact);
  if (digits.length >= 10) {
    return `📱 <b>Контакт:</b> <a href="tel:+${digits}">${escapeHtml(formatted)}</a>`;
  }
  return `📱 <b>Контакт:</b> ${escapeHtml(formatted)}`;
}

function messengerLine(contact: string): string | null {
  const digits = intlPhone(contact);
  if (digits.length >= 10) {
    const url = `https://wa.me/${digits}`;
    return `💬 <b>WhatsApp:</b> ${escapeHtml(url)}`;
  }
  if (contact.startsWith('@')) {
    const handle = contact.replace(/^@/, '');
    return `💬 <b>Telegram:</b> <a href="https://t.me/${encodeURIComponent(handle)}">${escapeHtml(contact)}</a>`;
  }
  return null;
}

function formatLead(input: {
  name: string;
  sector: string;
  interest: string;
  contact: string;
  message: string;
  locale: string;
}): string {
  const now = new Date();
  const messenger = messengerLine(input.contact);
  const lines = [
    `🟢 <b>НОВАЯ ЗАЯВКА</b> • ${escapeHtml(orderId(now, `${input.name}|${input.contact}`))}`,
    '',
    `👤 <b>Клиент:</b> ${escapeHtml(input.name)}`,
    `🏢 <b>Сектор:</b> ${escapeHtml(label(SECTOR_LABEL, input.sector))}`,
    `💼 <b>Интересует:</b> ${escapeHtml(label(INTEREST_LABEL, input.interest))}`,
    contactLine(input.contact),
    `🌐 <b>Язык сайта:</b> ${escapeHtml(label(LOCALE_LABEL, input.locale || 'ru'))}`,
    '',
    '📝 <b>Задача:</b>',
    escapeHtml(input.message),
    '',
  ];

  if (messenger) lines.push(messenger);
  lines.push(`🕐 <b>Получено:</b> ${escapeHtml(formatReceived(now))}`);
  lines.push('🌐 <b>Источник:</b> Сайт');

  return lines.join('\n');
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

    const text = formatLead({
      name,
      sector,
      interest,
      contact,
      message,
      locale,
    });

    const tgRes = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      },
    );

    if (!tgRes.ok) {
      return json({ ok: false, error: 'telegram_failed' }, 502, headers);
    }

    return json({ ok: true }, 200, headers);
  },
};
