WITH filtered_data AS (
    SELECT 
        lp_csid,
        EXTRACT(DOW FROM timestamp) AS jour_semaine,
        strftime('%A', DATE(timestamp)) AS nom_jour,
        DATE(timestamp) AS jour,
        COUNT(*) AS nb_connexions,
        COUNT(DISTINCT account_id) AS nb_clients_uniques,
        COUNT(DISTINCT ip) AS nb_ips_uniques
    FROM prepared_data
    WHERE timestamp >= CURRENT_DATE - INTERVAL '8 weeks'
        AND lp_csid IS NOT NULL
        AND asn_domain != 'docaposte.com'
        AND (CASE WHEN ? THEN client_id_identification_avancee LIKE '%IN App%' ELSE 1 END)
    GROUP BY lp_csid, DATE(timestamp), EXTRACT(DOW FROM timestamp)
)
SELECT 
    lp_csid,
    jour_semaine,
    nom_jour,
    jour,
    nb_connexions,
    nb_clients_uniques,
    nb_ips_uniques
FROM filtered_data
ORDER BY jour ASC;