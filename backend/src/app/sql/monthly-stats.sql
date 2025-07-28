WITH monthly_stats AS (
    SELECT 
        lp_csid,
        DATE_TRUNC('month', timestamp) AS mois,
        COUNT(DISTINCT account_id) AS nb_clients_uniques,
        COUNT(DISTINCT ip) AS nb_ips_uniques,
        COUNT(*) AS nb_connexions,
        COUNT(DISTINCT country) AS nb_pays
    FROM prepared_data 
    WHERE lp_csid IS NOT NULL 
        AND timestamp >= CURRENT_DATE - INTERVAL '12 months'
        AND asn_domain != 'docaposte.com'
        --AND client_id_identification_avancee LIKE '%IN App%'
    GROUP BY lp_csid, DATE_TRUNC('month', timestamp)
),
with_variation AS (
    SELECT *,
        LAG(nb_connexions) OVER (PARTITION BY lp_csid ORDER BY mois) AS connexions_precedentes,
        ROUND(
            100.0 * (nb_connexions - LAG(nb_connexions) OVER (PARTITION BY lp_csid ORDER BY mois)) 
            / NULLIF(LAG(nb_connexions) OVER (PARTITION BY lp_csid ORDER BY mois), 0), 
            2
        ) AS variation_connexions_pct
    FROM monthly_stats
),
ranked_monthly AS (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY mois ORDER BY nb_connexions DESC) AS rank_mois
    FROM with_variation
)
SELECT 
    mois,
    lp_csid,
    nb_clients_uniques,
    nb_ips_uniques,
    nb_connexions,
    nb_pays,
    connexions_precedentes,
    variation_connexions_pct,
    rank_mois
FROM ranked_monthly 
WHERE rank_mois <= ?
ORDER BY mois ASC, rank_mois;