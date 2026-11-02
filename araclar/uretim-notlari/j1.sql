WITH olaylar(id, payload) AS (
  VALUES (1, '{"user": 7, "etiketler": ["indirim", "mobil"]}'),
         (2, '{"user": 9, "etiketler": ["mobil"]}'),
         (3, '{"user": 7, "etiketler": []}')
)
SELECT j.value AS etiket, COUNT(*) AS olay
FROM olaylar o, json_each(json_extract(o.payload, '$.etiketler')) j
GROUP BY j.value
ORDER BY olay DESC, etiket;
