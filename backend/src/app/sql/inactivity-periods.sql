WITH ordered_logs AS (
    SELECT DISTINCT date
    FROM prepared_data
    WHERE lp_csid = ?
    AND asn_domain != 'docaposte.com'
    ORDER BY date
),
gaps AS (
    SELECT 
        date,
        LEAD(date) OVER (ORDER BY date) AS next_date,
        DATEDIFF('day', date, LEAD(date) OVER (ORDER BY date)) AS gap_days
    FROM ordered_logs
)
SELECT 
    date AS gap_start,
    next_date AS gap_end,
    gap_days
FROM gaps
WHERE gap_days >= ?
ORDER BY gap_days DESC