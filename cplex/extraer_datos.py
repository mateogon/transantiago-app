import psycopg2
import pandas as pd
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Database connection details from .env file
DB_CONFIG = {
    'dbname': os.getenv('DB_DATABASE'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'host': os.getenv('DB_HOST'),
    'port': os.getenv('DB_PORT')
}

# Tables to export
TABLES_TO_EXPORT = [
    "conexiones_cercanas",
    "paraderos",
    "aglomeracion",
    "subidas",
    "trafico"
]

# Ensure the 'cplex' folder exists
OUTPUT_FOLDER = "cplex"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Export tables to CSV files
def export_to_csv():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        for table in TABLES_TO_EXPORT:
            query = f"SELECT * FROM {table}"
            df = pd.read_sql_query(query, conn)
            output_path = os.path.join(OUTPUT_FOLDER, f"{table}.csv")
            df.to_csv(output_path, index=False)
            print(f"Exported {table} to {output_path}")
    except Exception as e:
        print(f"Error exporting table {table}: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    export_to_csv()
