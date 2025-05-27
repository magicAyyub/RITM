import duckdb
import os
from typing import Optional

def get_db_connection() -> duckdb.DuckDBPyConnection:
    """Get a connection to the DuckDB database"""
    return duckdb.connect(database=':memory:')

def prepare_data(conn: duckdb.DuckDBPyConnection, csv_path: str) -> None:
    """Prepare the data by creating a view with transformed data"""
    # First create a temporary view with the raw data
    conn.execute(f"""
        CREATE VIEW raw_data AS
        SELECT * FROM read_csv_auto('{csv_path}')
    """)
    
    # Then create the prepared view with proper date conversion
    conn.execute("""
        CREATE VIEW prepared_data AS
        SELECT 
            *,
            strptime(Dernier_log, '%m/%d/%Y %H:%M:%S') as timestamp,
            DATE(strptime(Dernier_log, '%m/%d/%Y %H:%M:%S')) as date,
            EXTRACT(DOW FROM strptime(Dernier_log, '%m/%d/%Y %H:%M:%S')) as day_of_week,
            EXTRACT(DOW FROM strptime(Dernier_log, '%m/%d/%Y %H:%M:%S')) IN (5, 6) as is_weekend,
            EXTRACT(HOUR FROM strptime(Dernier_log, '%m/%d/%Y %H:%M:%S')) as hour,
            SUBSTRING(lp_csid, 1, 8) || '...' as operator_short
        FROM raw_data
    """)

def get_csv_path() -> str:
    """Get the path to the CSV file"""
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 
        'data', 
        'joined_df2.csv'
    ) 