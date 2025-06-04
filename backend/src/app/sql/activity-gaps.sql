WITH daily_activity AS (
    SELECT 
        lp_csid,
        date as jour,
        COUNT(*) as nb_connexions_jour,
        COUNT(DISTINCT account_id) as nb_clients_jour
    FROM prepared_data 
    WHERE lp_csid IS NOT NULL 
        AND timestamp >= CURRENT_DATE - INTERVAL '90 days'
        AND asn_domain != 'docaposte.com'
    GROUP BY lp_csid, date
),
activity_gaps AS (
    SELECT 
        lp_csid,
        jour,
        nb_connexions_jour,
        LAG(jour) OVER (PARTITION BY lp_csid ORDER BY jour) as jour_precedent,
        jour - LAG(jour) OVER (PARTITION BY lp_csid ORDER BY jour) as gap_jours
    FROM daily_activity
),
significant_gaps AS (
    SELECT 
        lp_csid,
        jour_precedent as debut_pause,
        jour as fin_pause,
        gap_jours as duree_pause_jours,
        CASE 
            WHEN gap_jours >= 7 THEN 'Pause longue (7+ jours)'
            WHEN gap_jours >= 3 THEN 'Pause moyenne (3-6 jours)'
            ELSE 'Pause courte (2 jours)'
        END as type_pause
    FROM activity_gaps 
    WHERE gap_jours >= 2
)
SELECT 
    lp_csid,
    COUNT(*) as nb_pauses_detectees,
    AVG(duree_pause_jours) as duree_moyenne_pause,
    MAX(duree_pause_jours) as plus_longue_pause,
    COUNT(CASE WHEN type_pause = 'Pause longue (7+ jours)' THEN 1 END) as nb_pauses_longues,
    STRING_AGG(
        debut_pause || ' à ' || fin_pause || ' (' || duree_pause_jours || 'j)', 
        '; ' ORDER BY debut_pause
    ) as detail_pauses
FROM significant_gaps
GROUP BY lp_csid
ORDER BY nb_pauses_detectees DESC, duree_moyenne_pause DESC