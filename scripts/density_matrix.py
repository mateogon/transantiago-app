import os
import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow import keras
from sklearn.preprocessing import MinMaxScaler
import seaborn as sns
import matplotlib.pyplot as plt
import requests
import zipfile
import math
from sklearn.metrics import mean_absolute_error, mean_squared_error

url = "https://www.dtpm.cl/descargas/modelos_y_matrices/Tablas%20de%20subidas%20y%20bajadas%20nov23.zip"
response = requests.get(url)

with open("Tablas_de_subidas_y_bajadas_nov23.zip", "wb") as file:
    file.write(response.content)


with zipfile.ZipFile("Tablas_de_subidas_y_bajadas_nov23.zip", "r") as zip_ref:
    zip_ref.extractall("extracted_files")


extracted_files_path = "extracted_files"
extracted_files = os.listdir(extracted_files_path)
print("Extracted files:", extracted_files)


file_path = os.path.join(extracted_files_path, '2023.11 Matriz_sub_SS_MH.xlsb')


df = pd.read_excel(file_path, engine='pyxlsb')


print("Initial columns:", df.columns.tolist())


new_header = df.iloc[1]
df = df[2:]
df.columns = new_header


print("Columns after setting new header:", df.columns.tolist())

df = df.drop(df.index[:22])


print("Columns after dropping initial rows:", df.columns.tolist())


columns_to_delete = ['Semana', 'zona paga', 'parada SIMT', 'servicio Sonda', 'TOTAL', 'servicio usuario']
try:
    df = df.drop(columns_to_delete, axis=1)
    print("Columns after dropping specified columns:", df.columns.tolist())
except KeyError as e:
    print("Error while dropping columns:", e)


columns_to_delete = ['0:00:00', '0:30:00', '1:00:00', '1:30:00', '2:00:00', '2:30:00', '3:00:00', '3:30:00', '4:00:00', '4:30:00', '5:00:00']
df = df.drop(columns_to_delete, axis=1)
df1 = df.groupby(['paradero', 'Comuna'], dropna=True).sum()


scaler = MinMaxScaler()
scaled_data = scaler.fit_transform(df1.values)


model = keras.Sequential([
    keras.layers.Dense(64, activation='relu', input_shape=(scaled_data.shape[1],)),
    keras.layers.Dense(32, activation='relu'),
    keras.layers.Dense(scaled_data.shape[1], activation='linear') 
])

model.compile(optimizer='adam', loss='mse')
model.fit(scaled_data, scaled_data, epochs=50, batch_size=32)


predictions = model.predict(scaled_data)
predicted_data = scaler.inverse_transform(predictions)
predicted_df = pd.DataFrame(predicted_data, columns=df1.columns, index=df1.index)


predicted_df.to_csv('../predicted_density_matrix.csv')


plt.figure(figsize=(12, 8))
sns.heatmap(predicted_df, cmap='viridis', vmin=0, vmax=150)
plt.title('Heatmap de predicción de personas en paraderos en cierto horario')
plt.xlabel('Horas')
plt.ylabel('Paraderos')
plt.savefig('heatmap_prediction.png')
plt.show()


# Calculate performance metrics
mae = mean_absolute_error(df1.values, predicted_data)
mse = mean_squared_error(df1.values, predicted_data)
rmse = math.sqrt(mse)