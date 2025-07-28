SELECT 
    lp_csid,
    COUNT(*) AS count,
    COUNT(DISTINCT ip) AS unique_ips,
    COUNT(DISTINCT account_id) AS unique_clients
FROM prepared_data
WHERE lp_csid IS NOT NULL 
    AND asn_domain != 'docaposte.com'
    AND (CASE WHEN ? THEN client_id_identification_avancee LIKE '%IN App%' ELSE 1 END)
GROUP BY lp_csid
ORDER BY count DESC
LIMIT ?