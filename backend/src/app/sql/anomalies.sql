WITH daily_stats AS (
    SELECT 
        lp_csid,
        date,
        COUNT(*) as nb_connexions,
        COUNT(DISTINCT account_id) as nb_clients,
        COUNT(DISTINCT ip) as nb_ips
    FROM prepared_data 
    WHERE lp_csid IS NOT NULL 
        AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
        AND asn_domain != 'docaposte.com'
    GROUP BY lp_csid, date
),
operator_stats AS (
    SELECT 
        lp_csid,
        AVG(nb_connexions) as moyenne_connexions,
        STDDEV(nb_connexions) as ecart_type_connexions,
        AVG(nb_clients) as moyenne_clients,
        STDDEV(nb_clients) as ecart_type_clients
    FROM daily_stats
    GROUP BY lp_csid
),
anomalies AS (
    SELECT 
        d.lp_csid,
        d.date,
        d.nb_connexions,
        d.nb_clients,
        d.nb_ips,
        o.moyenne_connexions,
        o.ecart_type_connexions,
        o.moyenne_clients,
        o.ecart_type_clients,
        CASE 
            WHEN d.nb_connexions > (o.moyenne_connexions + 2 * o.ecart_type_connexions) THEN 'Pic d''activité'
            WHEN d.nb_connexions < (o.moyenne_connexions - 2 * o.ecart_type_connexions) THEN 'Chute d''activité'
            ELSE 'Normal'
        END as type_anomalie,
        CASE 
            WHEN d.nb_connexions > (o.moyenne_connexions + 2 * o.ecart_type_connexions) THEN 
                ROUND(100.0 * (d.nb_connexions - o.moyenne_connexions) / o.moyenne_connexions, 2)
            WHEN d.nb_connexions < (o.moyenne_connexions - 2 * o.ecart_type_connexions) THEN 
                ROUND(100.0 * (o.moyenne_connexions - d.nb_connexions) / o.moyenne_connexions, 2)
            ELSE 0
        END as variation_pourcentage
    FROM daily_stats d
    JOIN operator_stats o ON d.lp_csid = o.lp_csid
    WHERE d.nb_connexions > (o.moyenne_connexions + 2 * o.ecart_type_connexions)
        OR d.nb_connexions < (o.moyenne_connexions - 2 * o.ecart_type_connexions)
)
SELECT 
    lp_csid,
    date,
    nb_connexions,
    nb_clients,
    nb_ips,
    type_anomalie,
    variation_pourcentage,
    ROUND(moyenne_connexions, 2) as moyenne_connexions,
    ROUND(ecart_type_connexions, 2) as ecart_type_connexions
FROM anomalies
ORDER BY date DESC, ABS(variation_pourcentage) DESC
LIMIT 50