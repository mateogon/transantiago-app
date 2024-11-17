import pandas as pd
import numpy as np
from docplex.mp.model import Model
import os
import logging

# Set up logging
logging.basicConfig(filename="optimization_progress.log", level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger()

# Define the input data directory
DATA_DIR = "cplex"

# Load data from CSV files
conexiones_cercanas = pd.read_csv(os.path.join(DATA_DIR, "conexiones_cercanas.csv"))
paraderos = pd.read_csv(os.path.join(DATA_DIR, "paraderos.csv"))
aglomeracion = pd.read_csv(os.path.join(DATA_DIR, "aglomeracion.csv"))
subidas = pd.read_csv(os.path.join(DATA_DIR, "subidas.csv"))
trafico = pd.read_csv(os.path.join(DATA_DIR, "trafico.csv"))

# Define start and end paradero codes
start_paradero_id = 'PJ97'  # Replace with actual start paradero code
end_paradero_id = 'PA558'   # Replace with actual end paradero code

# Create the model
mdl = Model("Routing with Threats and Resilience")

# Extract unique paraderos
paradero_ids = paraderos['codigo'].unique()
paradero_id_to_index = {pid: idx for idx, pid in enumerate(paradero_ids)}
index_to_paradero_id = {idx: pid for idx, pid in enumerate(paradero_ids)}

# Sets
I = conexiones_cercanas['id'].unique()  # Routes (edges)
J = paradero_ids  # Paraderos

# Parameters
W_j = {pid: 1 for pid in paradero_ids}  # Time penalties
A_j = {pid: 1 for pid in paradero_ids}  # Congestion penalties
F_j = {pid: 0.01 for pid in paradero_ids}  # Failure probabilities
F_jk = {}  # Failure probabilities between paraderos
P_jk = {}  # Transfer penalties
d_jk = {}  # Distance between paraderos
h_ij = {}  # Indicator if route i passes through paradero j

# Populate F_jk, P_jk, and d_jk from conexiones_cercanas
for idx, row in conexiones_cercanas.iterrows():
    j = row['paradero_origen']
    k = row['paradero_destino']
    edge_id = row['id']
    F_jk[(j, k)] = row.get('failure_probability', 0.01)
    P_jk[(j, k)] = row.get('penalty', 1)
    d_jk[(j, k)] = row['distancia']
    h_ij[(edge_id, j)] = 1
    h_ij[(edge_id, k)] = 1

# Filter edges using problem-specific cuts
D_max = 500  # Maximum allowed transfer distance in meters
filtered_edges = [
    (j, k) for j, k in F_jk if d_jk[j, k] <= D_max
]
filtered_conexiones = conexiones_cercanas[
    conexiones_cercanas.apply(lambda row: (row['paradero_origen'], row['paradero_destino']) in filtered_edges, axis=1)
]

# Decision Variables
X_ij = mdl.binary_var_dict(((i, j) for i in I for j in J if h_ij.get((i, j), 0)), name='X')
T_jk = mdl.binary_var_dict(((j, k) for j, k in filtered_edges), name='T')

# Objective Function
mdl.minimize(
    mdl.sum(X_ij[i, j] * W_j[j] * A_j[j] for i in I for j in J if (i, j) in X_ij) +
    mdl.sum(T_jk[j, k] * P_jk.get((j, k), 1) * A_j[j] * F_jk.get((j, k), 0.01) for j, k in T_jk)
)

# Constraints
mdl.add_constraint(mdl.sum(X_ij[i, start_paradero_id] for i in I if (i, start_paradero_id) in X_ij) == 1, f"StartAt_{start_paradero_id}")
mdl.add_constraint(mdl.sum(X_ij[i, end_paradero_id] for i in I if (i, end_paradero_id) in X_ij) == 1, f"EndAt_{end_paradero_id}")
Failure_Threshold = 0.05
for j, k in F_jk:
    mdl.add_constraint(F_jk[j, k] <= Failure_Threshold, f"FailureLimit_{j}_{k}")

# Enable multithreading
mdl.parameters.threads = 4

# Enable logging for progress
mdl.context.solver.log_output = True

# Redirect CPLEX logs to Python logger
class CPLEXLogger:
    def __init__(self, logger):
        self.logger = logger

    def write(self, message):
        message = message.strip()
        if message:
            self.logger.info(message)

    def flush(self):
        pass  # No flush behavior needed


mdl.context.cplex_log_stream = CPLEXLogger(logger)

# Solve the model
solution = mdl.solve()

if solution:
    logger.info("Optimal Solution Found.")
    print("Optimal Solution Found:")
    
    # Extract the selected routes (edges)
    selected_edges = [i for i, j in X_ij if X_ij[i, j].solution_value > 0.5]
    logger.info(f"Selected Routes: {selected_edges}")
    print(f"Selected Routes: {selected_edges}")

    # Map selected edges back to conexiones_cercanas to find the services
    selected_services = conexiones_cercanas[conexiones_cercanas['id'].isin(selected_edges)]

    # Display the services
    print("Services on the Selected Route:")
    print(selected_services[['id', 'paradero_origen', 'paradero_destino', 'recorrido_codigo']])
    logger.info(f"Services on the Selected Route:\n{selected_services[['id', 'paradero_origen', 'paradero_destino', 'recorrido_codigo']]}")
else:
    logger.error("No feasible solution found.")
    print("No feasible solution found.")

