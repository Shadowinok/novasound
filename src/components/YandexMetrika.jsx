import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** ID счётчика: VITE_YM_ID в .env / Render — если пусто, Метрика не подключается */
const YM_ID = import.meta.env.VITE_YM_ID;

/** Вне компонента: иначе в StrictMode скрипт мог бы инициализироваться дважды */
let ymInitStarted = false;

/**
 * Яндекс.Метрика + хиты при смене маршрута (SPA).
 * @see https://yandex.ru/support/metrica/code/counter-spa-setup.html
 */
export default function YandexMetrika() {
  const location = useLocation();
  const skipFirstHit = useRef(true);

  useEffect(() => {
    if (!YM_ID || ymInitStarted) return;
    ymInitStarted = true;

    (function (m, e, t, r, i, k, a) {
      m[i] =
        m[i] ||
        function () {
          (m[i].a = m[i].a || []).push(arguments);
        };
      m[i].l = 1 * new Date();
      for (let j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) return;
      }
      k = e.createElement(t);
      a = e.getElementsByTagName(t)[0];
      k.async = 1;
      k.src = r;
      a.parentNode.insertBefore(k, a);
    })(window, document, 'script', `https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}`, 'ym');

    // Параметры как в «Код счётчика» в кабинете Метрики (+ SPA hit ниже)
    window.ym(YM_ID, 'init', {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: 'dataLayer',
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    });
  }, []);

  useEffect(() => {
    if (!YM_ID) return;
    if (skipFirstHit.current) {
      skipFirstHit.current = false;
      return;
    }
    const path = location.pathname + location.search;
    if (typeof window.ym === 'function') {
      window.ym(YM_ID, 'hit', path);
    }
  }, [location]);

  if (!YM_ID) return null;

  return (
    <noscript>
      <div>
        <img
          src={`https://mc.yandex.ru/watch/${YM_ID}`}
          style={{ position: 'absolute', left: '-9999px' }}
          alt=""
        />
      </div>
    </noscript>
  );
}
