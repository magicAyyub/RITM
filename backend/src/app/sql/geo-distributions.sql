SELECT 
    lp_csid,
    country,
    COUNT(DISTINCT ip) AS nb_ips_uniques,
    COUNT(*) AS nb_connexions
FROM prepared_data
WHERE timestamp >= CURRENT_DATE - INTERVAL '8 weeks'
    AND lp_csid IS NOT NULL
    AND asn_domain != 'docaposte.com'
    --AND client_id_identification_avancee LIKE '%IN App%'
GROUP BY lp_csid, country
ORDER BY lp_csid, nb_connexions DESC;