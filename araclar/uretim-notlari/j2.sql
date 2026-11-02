WITH olaylar AS (
  SELECT * FROM (VALUES
    (1, N'{"user": 7, "etiketler": ["indirim", "mobil"]}'),
    (2, N'{"user": 9, "etiketler": ["mobil"]}'),
    (3, N'{"user": 7, "etiketler": []}')
  ) AS v(id, payload)
)
SELECT j.value AS etiket, COUNT(*) AS olay
FROM olaylar o
CROSS APPLY OPENJSON(o.payload, '$.etiketler') AS j
GROUP BY j.value
ORDER BY olay DESC, etiket;
