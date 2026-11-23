SELECT COUNT(*), (SELECT COUNT(*) FROM customers) FROM orders;;
SELECT COUNT(*), (SELECT COUNT(*) FROM customers) FROM orders GROUP BY ();;
SELECT COUNT(*), MAX((SELECT COUNT(*) FROM customers)) FROM orders;;
SELECT COUNT(*), ANY_VALUE((SELECT COUNT(*) FROM customers)) FROM orders;;
SELECT ROUND(100.0 * (SELECT COUNT(*) FROM orders WHERE status = 'cancelled') / COUNT(*), 2) FROM orders GROUP BY ();;
SELECT o.c, s.k FROM (SELECT COUNT(*) c FROM orders) o CROSS JOIN (SELECT COUNT(*) k FROM customers) s;;
SELECT c.customer_id, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) FROM customers c WHERE c.customer_id < 3;;
WITH m AS (SELECT customer_id, MAX(CASE WHEN order_date >= DATE '2024-07-01' THEN 1 ELSE 0 END) AS sonra FROM orders GROUP BY customer_id HAVING MIN(order_date) < DATE '2024-07-01') SELECT sonra, COUNT(*) FROM m GROUP BY sonra;;
WITH m AS (SELECT customer_id, MAX(CASE WHEN order_date >= DATE '2024-07-01' THEN 1 ELSE 0 END) AS sonra FROM orders GROUP BY customer_id HAVING MIN(order_date) < DATE '2024-07-01') SELECT 1 - sonra AS churn, COUNT(*) FROM m GROUP BY 1 - sonra;;
WITH m AS (SELECT customer_id, MAX(CASE WHEN order_date >= DATE '2024-07-01' THEN 1 ELSE 0 END) AS sonra FROM orders GROUP BY customer_id HAVING MIN(order_date) < DATE '2024-07-01') SELECT (1 - sonra) AS churn, COUNT(*) FROM m GROUP BY (1 - sonra);;
WITH m AS (SELECT customer_id, MAX(CASE WHEN order_date >= DATE '2024-07-01' THEN 1 ELSE 0 END) AS sonra FROM orders GROUP BY customer_id HAVING MIN(order_date) < DATE '2024-07-01') SELECT churn, COUNT(*) FROM (SELECT 1 - sonra AS churn FROM m) GROUP BY churn;;
SELECT * FROM v$parameter WHERE name IN ('optimizer_features_enable', 'compatible');;
SELECT UPPER('ıiİI'), LOWER('ıiİI'), NLS_UPPER('ıi', 'NLS_SORT=XTURKISH') FROM dual;;
SELECT TO_CHAR(DATE '2024-03-05', 'YYYY-MM-DD HH24":00:00"'), TO_CHAR(DATE '2024-03-05', 'YYYY-"Q"Q') FROM dual;;
SELECT ROUND(AVG(x), 2) FROM (SELECT 4 x FROM dual UNION ALL SELECT 4.45 FROM dual);;
SELECT ROUND(338/80, 2), ROUND(CAST(338/80 AS BINARY_DOUBLE), 2) FROM dual;;
SELECT * FROM nls_session_parameters WHERE parameter IN ('NLS_DATE_FORMAT', 'NLS_TIMESTAMP_FORMAT', 'NLS_SORT', 'NLS_COMP', 'NLS_LANGUAGE');;
SELECT COUNT(*) FROM employees WHERE salary < (SELECT AVG(x.salary) FROM employees x WHERE x.dept_id = employees.dept_id);;
SELECT emp_id, dept_id, salary, (SELECT ROUND(AVG(x.salary)) FROM employees x WHERE x.dept_id = e.dept_id) FROM employees e WHERE dept_id IN (SELECT dept_id FROM employees WHERE emp_id = 11)
