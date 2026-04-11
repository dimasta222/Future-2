#!/usr/bin/env node
/**
 * Скрипт получения данных отзывов с Яндекс Карт.
 *
 * Стратегии извлечения (по приоритету):
 *   1. Yandex Geosearch API (нужен YANDEX_MAPS_API_KEY)
 *   2. HTML-парсинг schema.org микроданных страницы организации
 *
 * Если обе стратегии не сработали — сохраняет прежние данные (файл не перезаписывается).
 *
 * Использование:
 *   node scripts/fetch-yandex-reviews.mjs
 *
 * Env:
 *   YANDEX_MAPS_API_KEY — ключ из https://developer.tech.yandex.ru/
 *
 * Результат записывается в public/data/yandex-reviews.json
 */

import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "../public/data/yandex-reviews.json");

const ORG_URL =
  "https://yandex.ru/maps/org/future_studio/220314499581/reviews/";
const GEOSEARCH_URL = "https://search-maps.yandex.ru/v1/";
const ORG_NAME = "Future Studio";
const ORG_COORDS = "30.3158,59.9390"; // Санкт-Петербург

/* ── Стратегия 1: Yandex Geosearch API ─────────────────────────── */

async function fetchViaGeosearchAPI() {
  const apiKey = process.env.YANDEX_MAPS_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    apikey: apiKey,
    text: ORG_NAME,
    type: "biz",
    lang: "ru_RU",
    results: "1",
    ll: ORG_COORDS,
    spn: "0.1,0.1",
  });

  const res = await fetch(`${GEOSEARCH_URL}?${params}`);
  if (!res.ok) {
    console.warn(`Geosearch API: HTTP ${res.status}`);
    return null;
  }

  const json = await res.json();
  const feature = json.features?.[0];
  const props = feature?.properties;
  if (!props) return null;

  const meta =
    props.CompanyMetaData?.References?.[0] ||
    props.CompanyMetaData ||
    {};

  // Geosearch возвращает rating в CompanyMetaData
  const rating = parseFloat(
    meta.rating?.score ?? meta.Ratings?.Score ?? props.rating?.score ?? "0",
  );
  const ratingCount = parseInt(
    meta.rating?.ratings ?? meta.Ratings?.Ratings ?? props.rating?.ratings ?? "0",
    10,
  );
  const reviewCount = parseInt(
    meta.rating?.reviews ?? meta.Ratings?.Reviews ?? props.rating?.reviews ?? "0",
    10,
  );

  if (!rating && !ratingCount && !reviewCount) return null;

  return { rating, reviewCount, ratingCount };
}

/* ── Стратегия 2: HTML-парсинг schema.org микроданных ──────────── */

async function fetchViaHTML() {
  const res = await fetch(ORG_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ru-RU,ru;q=0.9",
    },
    redirect: "follow",
  });

  if (!res.ok) return null;

  const html = await res.text();

  // Проверяем что это не страница капчи
  if (html.includes("showcaptcha") || html.includes("Вы не робот")) {
    console.warn("HTML: заблокировано капчей");
    return null;
  }

  // Schema.org микроданные
  const ratingMatch = html.match(
    /itemProp="ratingValue"\s+content="([^"]+)"/i,
  );
  const reviewCountMatch = html.match(
    /itemProp="reviewCount"\s+content="([^"]+)"/i,
  );
  const ratingCountMatch = html.match(
    /itemProp="ratingCount"\s+content="([^"]+)"/i,
  );

  if (ratingMatch && reviewCountMatch && ratingCountMatch) {
    return {
      rating: parseFloat(ratingMatch[1]),
      reviewCount: parseInt(reviewCountMatch[1], 10),
      ratingCount: parseInt(ratingCountMatch[1], 10),
    };
  }

  // Фолбэк: JSON в теле страницы
  const ratingJson = html.match(/"rating"\s*:\s*([\d.]+)/);
  const reviewCountJson = html.match(/"reviewCount"\s*:\s*(\d+)/);
  const ratingCountJson = html.match(/"ratingCount"\s*:\s*(\d+)/);

  if (ratingJson || reviewCountJson || ratingCountJson) {
    return {
      rating: ratingJson ? parseFloat(ratingJson[1]) : null,
      reviewCount: reviewCountJson
        ? parseInt(reviewCountJson[1], 10)
        : null,
      ratingCount: ratingCountJson
        ? parseInt(ratingCountJson[1], 10)
        : null,
    };
  }

  console.warn("HTML: данные отзывов не найдены в разметке");
  return null;
}

/* ── Основной процесс ──────────────────────────────────────────── */

async function main() {
  let prev = {};
  try {
    prev = JSON.parse(readFileSync(OUTPUT, "utf-8"));
  } catch {
    /* файл не существует */
  }

  console.log("Текущие данные:", JSON.stringify(prev));

  // Пробуем стратегии по порядку
  let data = null;

  console.log("Стратегия 1: Yandex Geosearch API...");
  data = await fetchViaGeosearchAPI();
  if (data) console.log("  → успех:", JSON.stringify(data));

  if (!data) {
    console.log("Стратегия 2: HTML-парсинг...");
    data = await fetchViaHTML();
    if (data) console.log("  → успех:", JSON.stringify(data));
  }

  if (!data) {
    console.log("Все стратегии не сработали. Данные не изменены.");
    return false;
  }

  data.updatedAt = new Date().toISOString().slice(0, 10);

  const changed =
    prev.rating !== data.rating ||
    prev.reviewCount !== data.reviewCount ||
    prev.ratingCount !== data.ratingCount;

  if (changed) {
    writeFileSync(OUTPUT, JSON.stringify(data, null, 2) + "\n");
    console.log("Файл обновлён:", OUTPUT);
  } else {
    console.log("Данные не изменились, пропуск.");
  }

  return changed;
}

main()
  .then((changed) => {
    // Всегда exit 0 — не ломаем CI при неудаче
    process.exit(0);
  })
  .catch((err) => {
    console.error("Ошибка:", err.message);
    // exit 0 чтобы workflow не падал
    process.exit(0);
  });
