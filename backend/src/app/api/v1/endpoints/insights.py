from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional
from datetime import datetime
from src.app.utils.db_utils import get_db_connection, prepare_data, get_csv_path
from pydantic import BaseModel

router = APIRouter()

class SQLQuery(BaseModel):
    query: str
    params: Optional[Dict[str, Any]] = None

def get_db():
    """Get database connection with prepared data"""
    conn = get_db_connection()
    prepare_data(conn, get_csv_path())
    return conn


@router.get("/operator-dashboard")
def get_operator_dashboard() -> Dict[str, Any]:
    """Get comprehensive operator dashboard"""
    try:
        conn = get_db()
        result = conn.execute("""
            WITH operator_summary AS (
                SELECT 
                    lp_csid,
                    COUNT(DISTINCT account_id) as nb_clients_total,
                    COUNT(DISTINCT ip) as nb_ips_total,
                    COUNT(*) as nb_connexions_total,
                    COUNT(DISTINCT country) as nb_pays_total,
                    MIN(timestamp) as premiere_activite,
                    MAX(timestamp) as derniere_activite,
                    MAX(timestamp) - MIN(timestamp) as periode_activite,
                    COUNT(CASE WHEN timestamp >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as connexions_7j,
                    COUNT(DISTINCT CASE WHEN timestamp >= CURRENT_DATE - INTERVAL '7 days' THEN account_id END) as clients_7j,
                    COUNT(*) / GREATEST(EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))/86400, 1) as connexions_par_jour
                FROM prepared_data 
                WHERE lp_csid IS NOT NULL 
                    AND timestamp >= CURRENT_DATE - INTERVAL '90 days'
                GROUP BY lp_csid
            )
            SELECT 
                lp_csid,
                nb_clients_total,
                nb_ips_total,
                nb_connexions_total,
                nb_pays_total,
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
        """).fetchdf()
        
        return {"operator_dashboard": result.to_dict('records')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/top-operators/{top_x}")
def get_top_operators(top_x: int = 10) -> Dict[str, Any]:
    """Get top x operators by volume with detailed metrics"""
    try:
        conn = get_db()
        result = conn.execute("""
            SELECT 
                lp_csid,
                COUNT(DISTINCT account_id) as nb_clients_uniques,
                COUNT(DISTINCT ip) as nb_ips_uniques,
                COUNT(*) as nb_total_connexions,
                MIN(timestamp) as premiere_activite,
                MAX(timestamp) as derniere_activite,
                COUNT(DISTINCT country) as nb_pays_differents
            FROM prepared_data 
            WHERE lp_csid IS NOT NULL 
            GROUP BY lp_csid
            ORDER BY nb_total_connexions DESC
            LIMIT ?
        """, (top_x,)).fetchdf()    
        
        return {"top_operators": result.to_dict('records')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/monthly-stats/{top_x}")
def get_monthly_stats(top_x: int = 10) -> Dict[str, Any]:
    """Get monthly statistics for top x operators.
    """
    try:
        conn = get_db()
        result = conn.execute("""
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
        """, (top_x,)).fetchdf()
        
        return {"monthly_stats": result.to_dict('records')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/weekly-patterns")
def get_weekly_patterns() -> Dict[str, Any]:
    """Get weekly activity patterns for operators"""
    try:
        conn = get_db()
        result = conn.execute("""
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
        """).fetchdf()
        
        return {"weekly_patterns": result.to_dict('records')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/anomalies")
def get_anomalies() -> Dict[str, Any]:
    """Get detected anomalies in operator activity"""
    try:
        conn = get_db()
        result = conn.execute("""
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
        """).fetchdf()
        
        return {"anomalies": result.to_dict('records')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activity-gaps")
def get_activity_gaps() -> Dict[str, Any]:
    """Get detected activity gaps and pauses for operators"""
    try:
        conn = get_db()
        result = conn.execute("""
            WITH daily_activity AS (
                SELECT 
                    lp_csid,
                    date as jour,
                    COUNT(*) as nb_connexions_jour,
                    COUNT(DISTINCT account_id) as nb_clients_jour
                FROM prepared_data 
                WHERE lp_csid IS NOT NULL 
                    AND timestamp >= CURRENT_DATE - INTERVAL '90 days'
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
        """).fetchdf()
        
        return {"activity_gaps": result.to_dict('records')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


