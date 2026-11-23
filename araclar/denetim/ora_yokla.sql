SELECT COUNT(DISTINCT customer_id) FROM orders WHERE order_date >= DATE '2024-07-01';;
SELECT COUNT(*) FROM (SELECT customer_id FROM orders GROUP BY customer_id HAVING MIN(order_date) < DATE '2024-07-01' AND MAX(order_date) >= DATE '2024-07-01');;
SELECT customer_id, MAX(CASE WHEN order_date >= DATE '2024-07-01' THEN 1 ELSE 0 END) AS sonra, MIN(order_date), MAX(order_date) FROM orders WHERE customer_id <= 5 GROUP BY customer_id ORDER BY 1;;
SELECT customer_id, MAX(CASE WHEN order_date >= DATE '2024-07-01' THEN 1 ELSE 0 END) AS sonra FROM orders WHERE customer_id <= 5 GROUP BY customer_id HAVING MIN(order_date) < DATE '2024-07-01' ORDER BY 1;;
SELECT customer_id, MAX(CASE WHEN order_date >= DATE '2024-07-01' THEN 1 END) AS sonra FROM orders WHERE customer_id <= 5 GROUP BY customer_id HAVING MIN(order_date) < DATE '2024-07-01' ORDER BY 1;;
SELECT banner_full FROM v$version
