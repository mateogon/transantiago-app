import pandas as pd
import os
from shapely.geometry import Point
from shapely.wkt import loads as load_wkt
from shapely.wkb import loads as load_wkb
from geopy.distance import geodesic

# Load data
DATA_DIR = "cplex"
paraderos = pd.read_csv(os.path.join(DATA_DIR, "paraderos.csv"))
conexiones_cercanas = pd.read_csv(os.path.join(DATA_DIR, "conexiones_cercanas.csv"))

# Configuration
MAX_HOPS = 3  # Maximum number of hops (services) allowed
MAX_DISTANCE = 300  # Increased max distance to 1 km for debugging

# Ensure the 'geom' column is loaded correctly
def parse_geom(geom_value):
    try:
        return load_wkt(geom_value)  # Try parsing as WKT
    except Exception:
        try:
            return load_wkb(bytes.fromhex(geom_value))  # Try parsing as WKB
        except Exception as e:
            print(f"Error parsing geometry: {geom_value}, Error: {e}")
            return None

paraderos['geom'] = paraderos['geom'].apply(parse_geom)

# Normalize servicios
def parse_servicios(servicio_str):
    try:
        servicios = eval(servicio_str)  # Convert string to list
        return {s['name'] for s in servicios} if isinstance(servicios, list) else set()
    except Exception as e:
        print(f"Error parsing servicios: {servicio_str}, Error: {e}")
        return set()

paraderos['servicios'] = paraderos['servicios'].apply(parse_servicios)

# Helper to calculate nearby paraderos
def get_nearby_paraderos(center_geom, radius):
    if center_geom is None or not isinstance(center_geom, Point):
        raise ValueError("Invalid center_geom: ensure it's a valid Point object")

    nearby = []
    for idx, row in paraderos.iterrows():
        point = row['geom']  # Assuming 'geom' is a Shapely Point
        if isinstance(point, Point):
            distance = geodesic((center_geom.y, center_geom.x), (point.y, point.x)).meters
            if distance <= radius:
                nearby.append(row['codigo'])
    print(f"Found {len(nearby)} nearby paraderos for center {center_geom}.")
    return nearby

# Helper to get servicios from nearby paraderos
def get_servicios(paradero_list):
    servicios = set()
    for paradero in paradero_list:
        row = paraderos[paraderos['codigo'] == paradero]
        if not row.empty:
            servicios.update(row.iloc[0]['servicios'])
    print(f"Extracted {len(servicios)} servicios.")
    return servicios

# Helper to get paraderos by servicios
def get_paraderos_by_servicios(servicios):
    paraderos_by_servicios = set()
    for idx, row in paraderos.iterrows():
        if not servicios.isdisjoint(row['servicios']):  # Check for intersection
            paraderos_by_servicios.add(row['codigo'])
    print(f"Found {len(paraderos_by_servicios)} paraderos for given servicios.")
    return paraderos_by_servicios

# Main route filter logic
def filter_routes(start_paradero_id, end_paradero_id):
    # Validate start and end paradero
    start_row = paraderos[paraderos['codigo'] == start_paradero_id]
    end_row = paraderos[paraderos['codigo'] == end_paradero_id]

    if start_row.empty or end_row.empty:
        raise ValueError("Start or end paradero not found in the data.")

    # Get geometries for start and end
    start_geom = start_row['geom'].iloc[0]
    end_geom = end_row['geom'].iloc[0]

    if not isinstance(start_geom, Point) or not isinstance(end_geom, Point):
        raise ValueError("Start or end paradero geometry is invalid.")

    # Get nearby paraderos for start and end
    start_nearby = get_nearby_paraderos(start_geom, MAX_DISTANCE)
    end_nearby = get_nearby_paraderos(end_geom, MAX_DISTANCE)

    # Step 1: Get servicios for end node
    end_servicios = get_servicios(end_nearby)

    # Debug output: Log nearby paraderos and servicios
    print(f"Nearby paraderos for start: {start_nearby}")
    print(f"Nearby paraderos for end: {end_nearby}")
    print(f"Servicios for end paraderos: {end_servicios}")

    # Step 2: Expand paraderos and servicios within MAX_HOPS
    allowed_paraderos = set(end_nearby)
    allowed_servicios = set(end_servicios)

    for hop in range(MAX_HOPS):
        new_paraderos = get_paraderos_by_servicios(allowed_servicios)
        new_servicios = get_servicios(new_paraderos)
        added_paraderos = new_paraderos - allowed_paraderos
        added_servicios = new_servicios - allowed_servicios

        print(f"Hop {hop + 1}: Added {len(added_paraderos)} new paraderos, {len(added_servicios)} new servicios.")

        allowed_paraderos.update(new_paraderos)
        allowed_servicios.update(new_servicios)

        # Stop early if no new paraderos are added
        if not added_paraderos:
            break

    print(f"Total allowed paraderos: {len(allowed_paraderos)}, allowed servicios: {len(allowed_servicios)}.")

    # Step 3: Filter conexiones_cercanas
    filtered_routes = conexiones_cercanas[
        (conexiones_cercanas['paradero_origen'].isin(allowed_paraderos)) &
        (conexiones_cercanas['paradero_destino'].isin(allowed_paraderos))
    ]

    # Debug output: Log filtered routes count
    print(f"Filtered routes after paradero constraints: {len(filtered_routes)} rows.")

    # Additional Filtering: Limit routes by servicios used
    filtered_routes = filtered_routes[
        (filtered_routes['recorrido_codigo'].isin(allowed_servicios))
    ]

    print(f"Filtered routes after servicio constraints: {len(filtered_routes)} rows out of {len(conexiones_cercanas)}.")
    return filtered_routes

# Filter routes
filtered_routes = filter_routes('PJ97', 'PA558')
filtered_routes.to_csv(os.path.join(DATA_DIR, "filtered_conexiones_cercanas.csv"), index=False)
print("Filtered routes saved.")
