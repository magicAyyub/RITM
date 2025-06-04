from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional, List
from datetime import datetime, date
from src.app.utils.db_utils import get_db_connection, prepare_data, get_csv_path
from pydantic import BaseModel
from pathlib import Path

router = APIRouter(prefix="/operators", tags=["operators"])

def get_db():
    """Get database connection with prepared data"""
    conn = get_db_connection()
    prepare_data(conn, get_csv_path())
    return conn

def sql_from_file(file_path: str) -> str:
    """Read SQL query from a file"""
    file_path = Path.cwd() / "src" / "app" / "sql" / Path(file_path)
    with open(file_path, 'r') as file:
        return file.read()

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



@router.get("/operator-dashboard")
def get_operator_dashboard() -> Dict[str, Any]:
    """Get comprehensive operator dashboard"""
    try:
        conn = get_db()
        query_str = sql_from_file("operator-dashboard.sql")
        result = conn.execute(query_str).fetchdf()
        if result.empty:
            return {"operator_dashboard": []}
        return {"operator_dashboard": result.to_dict('records')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 

@router.get("/monthly-stats")
def get_monthly_stats(top_x: int = 10) -> Dict[str, Any]:
    """Get monthly statistics for top x operators.
    """
    try:
        conn = get_db()
        query_str = sql_from_file("monthly-stats.sql")
        result = conn.execute(f"""
            {query_str}
        """, (top_x,)).fetchdf()

        if result.empty:
            return {"monthly_stats": []}
        return {"monthly_stats": result.to_dict('records')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/weekly-patterns")
def get_weekly_patterns() -> Dict[str, Any]:
    """Get weekly activity patterns for operators"""
    try:
        conn = get_db()
        query_str = sql_from_file("weekly-patterns.sql")
        result = conn.execute(query_str).fetchdf()
        if result.empty:
            return {"weekly_patterns": []}   
        return {"weekly_patterns": result.to_dict('records')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/anomalies")
def get_anomalies() -> Dict[str, Any]:
    """Get detected anomalies in operator activity"""
    try:
        conn = get_db()
        query_str = sql_from_file("anomalies.sql")
        result = conn.execute(query_str).fetchdf()
        if result.empty:
            return {"anomalies": []}
        return {"anomalies": result.to_dict('records')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activity-gaps")
def get_activity_gaps() -> Dict[str, Any]:
    """Get detected activity gaps and pauses for operators"""
    try:
        conn = get_db()
        query_str = sql_from_file("activity-gaps.sql")
        result = conn.execute(query_str).fetchdf()
        if result.empty:
            return {"activity_gaps": []}
        return {"activity_gaps": result.to_dict('records')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    query_str = sql_from_file("top-operators.sql")
    df = conn.execute(f"""
        {query_str}
    """, (limit,)).fetchdf()
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
    query_str = sql_from_file("inactivity-periods.sql")
    df = conn.execute(f"""
        {query_str}
    """, (lp_csid, min_gap_days)).fetchdf()
    return df.to_dict(orient='records')