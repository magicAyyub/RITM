WITH monthly_stats AS (
    SELECT 
        lp_csid,
        DATE_TRUNC('month', timestamp) as mois,
        COUNT(DISTINCT account_id) as nb_clients_uniques,
        COUNT(DISTINCT ip) as nb_ips_uniques,
        COUNT(*) as nb_connexions,
        COUNT(DISTINCT country) as nb_pays
    FROM prepared_data 
    WHERE lp_csid IS NOT NULL 
        AND timestamp >= CURRENT_DATE - INTERVAL '12 months'
        AND asn_domain != 'docaposte.com'
    GROUP BY lp_csid, DATE_TRUNC('month', timestamp)
),
ranked_monthly AS (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY mois ORDER BY nb_connexions DESC) as rank_mois
    FROM monthly_stats
)
SELECT 
    mois,
    lp_csid,
    nb_clients_uniques,
    nb_ips_uniques,
    nb_connexions,
    nb_pays,
    rank_mois
FROM ranked_monthly 
WHERE rank_mois <= ?
ORDER BY mois ASC, rank_mois