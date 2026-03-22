# NovaSound — фронтенд

React (Vite). Сайт.

## Запуск локально

```bash
npm install
npm run dev
```

Скопируй `.env.example` → `.env`, заполни `VITE_API_URL`, при необходимости `VITE_YM_ID`.

## Продакшен

```bash
npm run build
```

Готовые файлы — папка **`dist/`** (её выкладываешь на хостинг).

## В Git не класть

`node_modules/`, `dist/`, `.env` (секреты).
