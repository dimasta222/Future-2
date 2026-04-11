import { useState, useEffect } from "react";

const DEFAULTS = { rating: 5.0, reviewCount: 66, ratingCount: 74 };

export default function useYandexReviews() {
  const [data, setData] = useState(DEFAULTS);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/yandex-reviews.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json && json.rating) setData(json);
      })
      .catch(() => {});
  }, []);

  return data;
}
