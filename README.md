# zairov

Визитка / портфолио IT-студии **zairov**: сайты под ключ, магазины, CRM, Telegram-боты, интеграции и сопровождение для частного и гос. сектора.

- Стек: Astro 7 + TypeScript
- Языки: RU (default) / KY / EN
- Продакшен: https://zairov.kg
- Заявки: Cloudflare Worker → Telegram

## Требования

- Node.js **22+** (см. `.nvmrc`)

```bash
nvm use
npm install
npm run dev
```

Сайт: http://localhost:4321/

Языки: `/` (RU), `/ky/`, `/en/`

```bash
npm run build
npm run preview
```

## Логотип

SVG lockup и mark в `public/brand/` и inline-компонент `src/components/Logo.astro`  
(Z из трёх сегментов + разделитель + `zairov`, цвет через `currentColor`).

## Форма → Telegram

1. Создайте бота у [@BotFather](https://t.me/BotFather), получите `TELEGRAM_BOT_TOKEN`.
2. Напишите боту и узнайте `TELEGRAM_CHAT_ID` (например через `@userinfobot` или `getUpdates`).
3. В каталоге `worker/`:

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
# при необходимости поправьте ALLOWED_ORIGINS в wrangler.toml
npm run deploy
```

4. Скопируйте URL воркера в `.env`:

```bash
PUBLIC_FORM_ENDPOINT=https://zairov-leads.<subdomain>.workers.dev
```

5. Для GitHub Actions добавьте repository variable `PUBLIC_FORM_ENDPOINT` с тем же URL.

## Деплой

Продакшен: https://zairov.kg (`site` и `base: '/'` уже заданы в `astro.config.mjs`).

Локальная проверка сборки:

```bash
npm run build
npm run preview
```

GitHub Pages workflow (`.github/workflows/deploy.yml`) запускается только вручную. На production его не публикует.

## ИП

ИП Заиров Кутман Сыраждинович — указан в футере и блоке About.
