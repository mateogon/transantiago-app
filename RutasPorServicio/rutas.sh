#/bin/bash
for layer in "U2 - SuBus" "U3 - Buses Vule" "U4 - Voy Santiago" "U5 - Metbus" "U7 - STP" "U8 - Metropol" "U9 - Metropol" "U10 - STU" "U11 - RBU" "U12 - STU" "U13 - RBU"
do
    # Reemplaza espacios en el nombre de la capa por guiones bajos para el nombre del archivo
    output_name=$(echo "$layer" | sed 's/ /_/g')
    ogr2ogr -f "GeoJSON" "${output_name}.geojson" doc.kml "$layer"
done
