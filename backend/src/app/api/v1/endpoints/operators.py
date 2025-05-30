from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional, List
from datetime import datetime, date
from src.app.utils.db_utils import get_db_connection, prepare_data, get_csv_path
from pydantic import BaseModel
import duckdb

router = APIRouter(prefix="/operators", tags=["operators"])

def get_db():
    """Get database connection with prepared data"""
    conn = get_db_connection()
    prepare_data(conn, get_csv_path())
    return conn

class OperatorStats(BaseModel):
    lp_csid: str
    count: int
    unique_ips: int
    unique_clients: int

class TemporalStats(BaseModel):
    period: str  # day/month/hour
    value: str
    count: int

class GeoDistribution(BaseModel):
    country: str
    count: int
    percentage: float

class ConnectionTypeStats(BaseModel):
    type: str  # vpn/proxy/etc
    count: int
    percentage: float

class SQLQuery(BaseModel):
    query: str
    params: Optional[Dict[str, Any]] = None

@router.get("/top-operators", response_model=List[OperatorStats])
def get_top_operators(limit: int = Query(10, ge=1)):
    """
    Récupère les N opérateurs les plus actifs par volume de logs.<br> 
    Cette fonction retourne les N opérateurs les plus actifs en fonction du nombre d'événements de log qu'ils ont générés.<br>
    Chaque opérateur est identifié par son `lp_csid`, et la réponse inclut le nombre total d'événements de log, le nombre d'IPs uniques, et le nombre de clients uniques associés à cet opérateur.

    Exemple de réponse:
    ```json
    [
        {
            "lp_csid": "operator1",
            "count": 1000,
            "unique_ips": 500,
            "unique_clients": 300
        },
        {
            "lp_csid": "operator2",
            "count": 800,
            "unique_ips": 400,
            "unique_clients": 250
        }
    ]
    ```

    Cela signifie que "operator1" a 1000 événements de log, 500 IPs uniques, et 300 clients uniques.<br>
    Le paramètre `limit` permet de spécifier le nombre d'opérateurs à retourner, avec un minimum de 1.<br>
    La limite par défaut est de 10.
    """
    conn = get_db()
    query = f"""
        SELECT 
            lp_csid,
            COUNT(*) AS count,
            COUNT(DISTINCT ip) AS unique_ips,
            COUNT(DISTINCT account_id) AS unique_clients
        FROM prepared_data
        GROUP BY lp_csid
        ORDER BY count DESC
        LIMIT {limit}
    """
    df = conn.execute(query).fetchdf()
    return df.to_dict(orient='records')


@router.get("/temporal-activity", response_model=List[TemporalStats])
def get_temporal_activity(
    lp_csid: str,
    granularity: str = Query("hour", regex="^(hour|day|month)$"),
    period: Optional[str] = None,
    specific_date: Optional[date] = None  # Add this parameter
):
    """
    Récupère la distribution de l'activité pour un opérateur spécifique par période de temps.
    C'est un découpage de l'activité (événements de log) pour un opérateur spécifique (lp_csid) sur différentes périodes de temps. <br>
    Voici un exemple de réponse:
    ```json
    [
        {
            "period": "hour",
            "value": "0",
            "count": 300
        },
        {
            "period": "hour",
            "value": "1",
            "count": 189
        },
        {
            "period": "hour",
            "value": "2",
            "count": 87
        }
    ]
    ```
    Cela signifie:

    - "Hour 0" représente le nombre d'événements de 12:00 AM à 12:59 AM sur toutes les dates
    - "Hour 1" représente le nombre d'événements de 1:00 AM à 1:59 AM sur toutes les dates
    - Et ainsi de suite...

    Le paramètre `granularity` permet de spécifier la période de temps pour l'agrégation: "hour", "day", ou "month".<br>
    Le paramètre `period` permet de filtrer les résultats par un mois spécifique (au format 'YYYY-MM').<br>
    Si vous voulez voir la distribution horaire pour une date ou une période spécifique, vous pouvez utiliser le paramètre `specific_date`. Le paramètre `specific_date` permet de filtrer les résultats par une date spécifique (au format 'YYYY-MM-DD').
    """
    conn = get_db()
    
    if granularity == "hour":
        group_expr = "EXTRACT(HOUR FROM timestamp)"
    elif granularity == "day":
        group_expr = "day_of_week"
    else:  # month
        group_expr = "strftime(timestamp, '%Y-%m')"
    
    where_clause = f"WHERE lp_csid = '{lp_csid}'" 
    if period:
        where_clause += f" AND strftime(timestamp, '%Y-%m') = '{period}'"
    if specific_date:
        where_clause += f" AND DATE(timestamp) = '{specific_date}'"
    
    query = f"""
        SELECT 
            '{granularity}' AS period,
            CAST({group_expr} AS VARCHAR) AS value,
            COUNT(*) AS count
        FROM prepared_data
        {where_clause}
        GROUP BY {group_expr}
        ORDER BY {group_expr}
    """
    
    df = conn.execute(query).fetchdf()
    return df.to_dict(orient='records')

@router.get("/geo-distribution", response_model=List[GeoDistribution])
def get_geo_distribution(lp_csid: str, limit: int = 5):
    """
    Récupère la distribution géographique pour un opérateur spécifique.<br>
    Cette fonction retourne la distribution géographique des événements de log pour un opérateur spécifique identifié par `lp_csid`.<br>
    La réponse inclut le pays, le nombre d'événements de log de ce pays, et le pourcentage de l'ensemble des événements de log que ce nombre représente.<br>
    Le paramètre `limit` permet de spécifier le nombre de pays à retourner, avec un minimum de 5.

    Exemple de réponse:
    ```json
    [
        {
            "country": "US",
            "count": 500,
            "percentage": 50.0
        },
        {
            "country": "CA",
            "count": 300,
            "percentage": 30.0
        },
        {
            "country": "GB",
            "count": 200,
            "percentage": 20.0
        }
    ]
    ```

    Cela signifie que "US" a 500 événements de log, ce qui représente 50% de l'ensemble des événements de log pour cet opérateur.<br>
    Le paramètre `limit` permet de spécifier le nombre de pays à retourner, avec un minimum de 5.

    """
    conn = get_db()
    query = f"""
        WITH total AS (
            SELECT COUNT(*) AS total_count 
            FROM prepared_data 
            WHERE lp_csid = '{lp_csid}'
        )
        SELECT 
            country,
            COUNT(*) AS count,
            (COUNT(*) * 100.0 / NULLIF(total.total_count, 0)) AS percentage
        FROM prepared_data, total
        WHERE lp_csid = '{lp_csid}'
        GROUP BY country, total.total_count
        ORDER BY count DESC
        LIMIT {limit}
    """
    df = conn.execute(query).fetchdf()
    return df.to_dict(orient='records')

@router.get("/connection-types", response_model=List[ConnectionTypeStats])
def get_connection_types(lp_csid: str):
    """
    Récupère la distribution des types de connexion (VPN, Proxy, etc) pour un opérateur spécifique.<br>
    Cette fonction retourne la distribution des différents types de connexion (comme VPN, Proxy, Tor) utilisés par un opérateur spécifique identifié par `lp_csid`.<br>
    La réponse inclut le type de connexion, le nombre d'événements de log pour ce type, et le pourcentage de l'ensemble des événements de log que ce nombre représente.<br>
    Exemple de réponse:
    ```json
    [
        {
            "type": "vpn",
            "count": 300,
            "percentage": 30.0
        },
        {
            "type": "proxy",
            "count": 200,
            "percentage": 20.0
        },
        {
            "type": "tor",
            "count": 500,
            "percentage": 50.0
        }
    ]
    ```

    Cela signifie que "vpn" a 300 événements de log, ce qui représente 30% de l'ensemble des événements de log pour cet opérateur.<br>
    Le paramètre `lp_csid` permet de spécifier l'opérateur pour lequel vous souhaitez récupérer les statistiques de type de connexion.
    """
    conn = get_db()
    query = f"""
        WITH total AS (
            SELECT COUNT(*) AS total_count 
            FROM prepared_data 
            WHERE lp_csid = '{lp_csid}'
        )
        SELECT 
            'vpn' AS type,
            SUM(vpn) AS count,
            (SUM(vpn) * 100.0 / (SELECT total_count FROM total)) AS percentage
        FROM prepared_data
        WHERE lp_csid = '{lp_csid}'
        
        UNION ALL
        
        SELECT 
            'proxy' AS type,
            SUM(proxy) AS count,
            (SUM(proxy) * 100.0 / (SELECT total_count FROM total)) AS percentage
        FROM prepared_data
        WHERE lp_csid = '{lp_csid}'
        
        UNION ALL
        
        SELECT 
            'tor' AS type,
            SUM(tor) AS count,
            (SUM(tor) * 100.0 / (SELECT total_count FROM total)) AS percentage
        FROM prepared_data
        WHERE lp_csid = '{lp_csid}'
    """
    df = conn.execute(query).fetchdf()
    return df.to_dict(orient='records')

@router.get("/inactivity-periods")
def get_inactivity_periods(
    lp_csid: str,
    min_gap_days: int = 7
):
    """
    Détecte les périodes d'inactivité significatives pour un opérateur.
    <br>
    Cette fonction identifie les périodes d'inactivité pour un opérateur spécifique identifié par `lp_csid`.
    Elle retourne une liste de périodes d'inactivité où l'intervalle entre les événements de log dépasse un nombre de jours spécifié (`min_gap_days`). <br>
    Exemple de réponse:
    ```json
    [
        {
            "gap_start": "2023-01-01",
            "gap_end": "2023-01-08",
            "gap_days": 7
        },
        {
            "gap_start": "2023-02-15",
            "gap_end": "2023-02-22",
            "gap_days": 7
        }
    ]
    ```

    Cela signifie : 
    
    Il y a eu une période d'inactivité de 7 jours entre "2023-01-01" et "2023-01-08" pour cet opérateur.<br>
    Le paramètre `min_gap_days` permet de spécifier le nombre minimal de jours pour que l'intervalle soit considéré comme significatif, avec une valeur par défaut de 7.
    """
    conn = get_db()
    query = f"""
        WITH ordered_logs AS (
            SELECT DISTINCT date
            FROM prepared_data
            WHERE lp_csid = '{lp_csid}'
            ORDER BY date
        ),
        gaps AS (
            SELECT 
                date,
                LEAD(date) OVER (ORDER BY date) AS next_date,
                DATEDIFF('day', date, LEAD(date) OVER (ORDER BY date)) AS gap_days
            FROM ordered_logs
        )
        SELECT 
            date AS gap_start,
            next_date AS gap_end,
            gap_days
        FROM gaps
        WHERE gap_days >= {min_gap_days}
        ORDER BY gap_days DESC
    """
    df = conn.execute(query).fetchdf()
    return df.to_dict(orient='records')

@router.get("/operator-anomalies", response_model=Dict)
def detect_operational_anomalies(
    lp_csid: str,
    min_activity_drop: float = Query(0.5, description="Drop relatif (>50% par défaut)"),
    min_activity_spike: float = Query(2.0, description="Pic relatif (>200% par défaut)")
):
    """
    Détecte les anomalies opérationnelles pour un opérateur spécifique.<br>
    Détecte 3 types d'anomalies critiques :
    1. **Chutes brutales d'activité** (possible désactivation de comptes compromis)<br>
    2. **Pics d'activité** (possible attaque DDoS ou campagne de phishing)<br>
    3. **Changement de localisation** (possible takeover de compte)<br>
    
    Exemple de retour :<br>
    ```json
    {
        "operator": "OP123",
        "last_7_days": {
            "avg_daily_activity": 1200,
            "current_day_activity": 2500,
            "spike_detected": true,
            "drop_detected": false
        },
        "geo_anomalies": [
            {
                "date": "2023-05-01",
                "usual_country": "FR",
                "suspicious_country": "RU",
                "ip_count": 15
            }
        ]
    }
    ```

    Cela signifie que l'opérateur "OP123" a eu une activité moyenne de 1200 logs par jour au cours des 7 derniers jours, mais aujourd'hui il y a eu un pic à 2500 logs, ce qui est plus de 200% de l'activité moyenne, indiquant une possible attaque DDoS ou phishing.<br>
    De plus, il y a eu une anomalie géographique détectée le 1er mai 2023, où l'activité habituelle était en France (FR) mais a été détectée en Russie (RU) avec 15 adresses IP suspectes.
    Le paramètre `min_activity_drop` permet de définir le seuil de chute d'activité (par défaut 50%), et `min_activity_spike` le seuil de pic d'activité (par défaut 200%).
    """
    conn = get_db()
    
    # 1. Analyse d'activité (7 derniers jours vs moyenne historique)
    activity_query = f"""
        WITH daily_activity AS (
            SELECT 
                DATE(timestamp) AS day,
                COUNT(*) AS activity
            FROM prepared_data
            WHERE lp_csid = '{lp_csid}'
            GROUP BY day
            ORDER BY day DESC
            LIMIT 30
        )
        SELECT
            AVG(activity) AS avg_activity,
            (SELECT activity FROM daily_activity ORDER BY day DESC LIMIT 1) AS last_day_activity
        FROM daily_activity
    """
    activity = conn.execute(activity_query).fetchone()
    
    # 2. Détection de changements géographiques
    geo_query = f"""
        WITH usual_country AS (
            SELECT country 
            FROM prepared_data 
            WHERE lp_csid = '{lp_csid}'
            GROUP BY country 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ),
        anomalies AS (
            SELECT
                DATE(timestamp) AS day,
                country,
                COUNT(*) AS ip_count
            FROM prepared_data
            WHERE 
                lp_csid = '{lp_csid}'
                AND country NOT IN (SELECT country FROM usual_country)
            GROUP BY day, country
            HAVING COUNT(*) > 5  -- Seuil minimal
        )
        SELECT * FROM anomalies
        ORDER BY day DESC
    """
    geo_anomalies = conn.execute(geo_query).fetchall()
    
    return {
        "operator": lp_csid,
        "last_7_days": {
            "avg_daily_activity": activity[0],
            "current_day_activity": activity[1],
            "spike_detected": activity[1] > activity[0] * min_activity_spike,
            "drop_detected": activity[1] < activity[0] * min_activity_drop
        },
        "geo_anomalies": [
            {"date": str(row[0]), "suspicious_country": row[1], "ip_count": row[2]}
            for row in geo_anomalies
        ]
    }

@router.get("/operator-seasonality", response_model=Dict)
def analyze_seasonality(
    lp_csid: str,
    min_weeks: int = Query(4, description="Nombre minimal de semaines pour l'analyse")
):
    """
    Analyse la saisonnalité et l'automatisation des activités d'un opérateur.
    <br>
    Cette fonction analyse les données d'activité d'un opérateur spécifique (`lp_csid`) pour détecter la saisonnalité et l'automatisation de ses activités.
    Elle retourne un modèle contenant :
    - Un modèle hebdomadaire de l'activité (moyenne par jour de la semaine)
    - Des pics mensuels d'activité (hors saisonnalité normale)
    - Un indicateur si l'activité est automatisée (basé sur la stabilité de l'activité hebdomadaire)
    
    Exemple de retour :
    ```json
    {
        "operator": "OP123",
        "is_automated": true,
        "weekly_pattern": {
            "monday": 120.5,
            "tuesday": 130.0,
            "wednesday": 125.0,
            "thursday": 140.0,
            "friday": 150.0,
            "saturday": 110.0,
            "sunday": 100.0
        },
        "monthly_peaks": [
            {"month": "2023-01", "activity": 2000, "deviation": "+20%"},
            {"month": "2023-02", "activity": 1800, "deviation": "+15%"}
        ]
    }
    ```
    Cela signifie que l'opérateur "OP123" a une activité hebdomadaire stable, indiquant une automatisation, avec des pics mensuels d'activité significatifs.
    Le paramètre `min_weeks` permet de définir le nombre minimal de semaines pour l'analyse (par défaut 4).
    """
    conn = get_db()
    
    # 1. Analyse hebdomadaire
    weekly_query = f"""
        SELECT
            day_of_week,
            AVG(daily_count) AS avg_activity
        FROM (
            SELECT
                day_of_week,
                DATE(timestamp) AS day,
                COUNT(*) AS daily_count
            FROM prepared_data
            WHERE lp_csid = '{lp_csid}'
            GROUP BY day_of_week, day
        ) t
        GROUP BY day_of_week
        HAVING COUNT(*) >= {min_weeks}  -- Ensure we have enough weeks of data
    """
    weekly_data = conn.execute(weekly_query).fetchall()
    
    # Handle case when we don't have enough weekly data
    if not weekly_data:
        return {
            "operator": lp_csid,
            "is_automated": False,
            "weekly_pattern": {},
            "monthly_peaks": [],
            "message": f"Not enough weekly data for this operator. Minimum required: {min_weeks} weeks per day."
        }
    
    # Calcul de l'écart type pour déterminer si c'est un automate
    avg_activity = sum(w[1] for w in weekly_data) / len(weekly_data)
    deviations = [abs(row[1] - avg_activity) for row in weekly_data]
    is_automated = max(deviations) < 0.1 * avg_activity  # Écart < 10%
    
    # 2. Pics mensuels (hors saisonnalité normale)
    monthly_query = f"""
        WITH monthly_avg AS (
            SELECT AVG(activity) AS avg_activity
            FROM (
                SELECT strftime(timestamp, '%Y-%m') AS month, COUNT(*) AS activity
                FROM prepared_data
                WHERE lp_csid = '{lp_csid}'
                GROUP BY month
            )
        )
        SELECT
            strftime(timestamp, '%Y-%m') AS month,
            COUNT(*) AS activity,
            ROUND((COUNT(*) * 100.0 / (SELECT avg_activity FROM monthly_avg)) - 100, 1) AS deviation
        FROM prepared_data
        WHERE lp_csid = '{lp_csid}'
        GROUP BY month
        HAVING ABS(deviation) > 15  -- Seuil de 15%
        ORDER BY deviation DESC
    """
    monthly_peaks = conn.execute(monthly_query).fetchall()
    
    # Map day numbers to day names
    day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    
    return {
        "operator": lp_csid,
        "is_automated": is_automated,
        "weekly_pattern": {
            day_names[int(row[0])]: float(row[1])  # Convert to float to ensure JSON serialization
            for row in weekly_data
        },
        "monthly_peaks": [
            {"month": row[0], "activity": int(row[1]), "deviation": f"{row[2]}%"}
            for row in monthly_peaks
        ]
    }

@router.get("/risk-benchmark", response_model=List[Dict])
def benchmark_operators(
    min_logs: int = Query(1000, description="Filtre les petits opérateurs"),
    risk_factors: List[str] = Query(["vpn", "proxy"], description="Facteurs de risque à inclure")
):
    """
    Benchmark des opérateurs en fonction de leur activité et de leurs facteurs de risque.
    <br>
    Cette fonction permet de comparer les opérateurs en fonction de leur volume d'activité et de divers facteurs de risque (comme l'utilisation de VPN, Proxy, etc.).<br>
    Elle retourne une liste d'opérateurs avec leur score de risque calculé à partir des facteurs sélectionnés.

    Exemple de retour :
    ```json
    [
        {
            "lp_csid": "OP123",
            "total_logs": 15000,
            "risk_score": 83,
            "risk_factors": {
                "vpn": "62%",
                "proxy": "45%",
                "countries": 8
            },
            "last_activity": "2023-05-15"
        }
    ]
    ```
    Cela signifie que l'opérateur "OP123" a généré 15000 logs, avec un score de risque de 83, indiquant une utilisation significative de VPN (62%) et Proxy (45%), et a été actif pour la dernière fois le 15 mai 2023.<br>
    Le paramètre `min_logs` permet de filtrer les opérateurs ayant moins de logs (par défaut 1000), et `risk_factors` permet de sélectionner les facteurs de risque à inclure dans l'analyse (par défaut "vpn" et "proxy").
    """
    conn = get_db()
    
    factors_mapping = {
        "vpn": "SUM(vpn) * 100.0 / COUNT(*)",
        "proxy": "SUM(proxy) * 100.0 / COUNT(*)",
        "tor": "SUM(tor) * 100.0 / COUNT(*)",
        "countries": "COUNT(DISTINCT country)"
    }
    
    selected_factors = [f"{factors_mapping[factor]} AS {factor}_score" 
                       for factor in risk_factors if factor in factors_mapping]
    
    query = f"""
        SELECT
            lp_csid,
            COUNT(*) AS total_logs,
            {', '.join(selected_factors)},
            MAX(DATE(timestamp)) AS last_activity
        FROM prepared_data
        GROUP BY lp_csid
        HAVING total_logs >= {min_logs}
        ORDER BY total_logs DESC
    """
    df = conn.execute(query).fetchdf()
    
    # Calcul d'un score global (pondération arbitraire)
    df["risk_score"] = (
        df.get("vpn_score", 0) * 0.4 +
        df.get("proxy_score", 0) * 0.3 +
        df.get("tor_score", 0) * 0.3 +
        df.get("countries_score", 0) * 0.1
    ).astype(int)
    
    return df.to_dict(orient='records')

@router.post("/custom-query")
def execute_custom_query(sql_query: SQLQuery):
    """
    Exécute une requête SQL personnalisée (pour une analyse avancée).
    <br>
    Cette fonction permet d'exécuter une requête SQL personnalisée pour une analyse avancée.
    Elle retourne un dictionnaire contenant le résultat de la requête.
    Exemple de retour :
    ```json
    {"success": true, "result": [{"column1": "value1", "column2": "value2"}]}
    """
    conn = get_db()
    try:
        if sql_query.params:
            result = conn.execute(sql_query.query, sql_query.params).fetchdf().to_dict(orient='records')
        else:
            result = conn.execute(sql_query.query).fetchdf().to_dict(orient='records')
        return {"success": True, "result": result}
    except duckdb.Error as e:
        raise HTTPException(status_code=400, detail=str(e))