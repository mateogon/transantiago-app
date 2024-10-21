SELECT * FROM pgr_dijkstra(
    'SELECT id, origen, destino, distancia AS cost FROM recorridos',
    start_id,  -- ID del paradero de inicio
    end_id,     -- ID del paradero de destino
    directed := false
);