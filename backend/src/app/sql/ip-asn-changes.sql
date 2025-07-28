SELECT 
    lp_csid,
    COUNT(DISTINCT asn_domain) AS nb_asn_diff,
    COUNT(DISTINCT ip) AS nb_ips_diff,
    COUNT(DISTINCT http_user_agent) AS nb_user_agents_diff
FROM prepared_data
WHERE timestamp >= CURRENT_DATE - INTERVAL '8 weeks'
    AND lp_csid IS NOT NULL
    --AND client_id_identification_avancee LIKE '%IN App%'
GROUP BY lp_csid
ORDER BY nb_asn_diff DESC;