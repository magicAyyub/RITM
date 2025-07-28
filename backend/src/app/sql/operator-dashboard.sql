WITH operator_summary AS (
    SELECT 
        lp_csid,
        COUNT(*) as nb_connexions_total,
        MIN(timestamp) as premiere_activite,
        MAX(timestamp) as derniere_activite,
        MAX(timestamp) - MIN(timestamp) as periode_activite,
        COUNT(CASE WHEN timestamp >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as connexions_7j,
        COUNT(DISTINCT CASE WHEN timestamp >= CURRENT_DATE - INTERVAL '7 days' THEN account_id END) as clients_7j,
        COUNT(*) / GREATEST(EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))/86400, 1) as connexions_par_jour
    FROM prepared_data 
    WHERE lp_csid IS NOT NULL 
        AND timestamp >= CURRENT_DATE - INTERVAL '90 days'
        AND asn_domain != 'docaposte.com'
        AND (CASE WHEN ? THEN client_id_identification_avancee LIKE '%IN App%' ELSE 1 END)
    GROUP BY lp_csid
)
SELECT 
    lp_csid,
    nb_connexions_total,
    premiere_activite,
    derniere_activite,
    periode_activite,
    connexions_7j,
    clients_7j,
    ROUND(connexions_par_jour, 2) as connexions_moy_par_jour,
    CASE 
        WHEN connexions_7j = 0 THEN 'Inactif'
        WHEN connexions_7j < (nb_connexions_total * 0.1) THEN 'Faible activité'
        WHEN connexions_7j > (nb_connexions_total * 0.3) THEN 'Forte activité récente'
        ELSE 'Activité normale'
    END as statut_activite,
    CASE 
        WHEN periode_activite < INTERVAL '7 days' THEN 'Nouveau'
        WHEN periode_activite > INTERVAL '60 days' THEN 'Établi'
        ELSE 'Intermédiaire'
    END as anciennete
FROM operator_summary
ORDER BY nb_connexions_total DESC