# Creación del entorno
Antes de comenzar, asegúrate de tener Node.js y npm instalados en tu máquina. Puedes descargarlos desde [nodejs.org](https://nodejs.org/).

1. **Clona el repositorio:**

   ```bash
   git clone https://github.com/AkumuKernel/transantiago-app.git
   cd transantiago-app
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```   
## Creación de variables de entorno
Para poder utilizar esta aplicación sin problemas se debe crear el archivp `.env` en la carpeta raíz con los siguientes datos
   ```bash
   DB_USER=<USUARIO_POSTGRES>
   DB_HOST=<HOST_DE_SERVICIO_POSTGRES>
   DB_DATABASE=<BASE_DE_DATOS_A_UTILIZAR_EN_POSTGRES>
   DB_PASSWORD=<PASSCODE_DE_USUARIO_POSTGRES>
   DB_PORT=<PUERTO_DEL_SERVICIO_POSTGRES>
   API_KEY=<API_KEY_DE_GOOGLE_CLOUD_CONSOLE>
   ```

## Ejecución

1. **Inicia la aplicación:**
   ```bash
   npm start
   ```
Esto iniciará la aplicación en modo producción.

2.  **Desarrollo**

   ```bash
   npm run dev
   ```

Este comando utiliza Nodemon para reiniciar automáticamente la aplicación cuando se detectan cambios en los archivos.

## Contribución

1. **Cambiar de rama**
   ```bash
   git checkout -b nueva-rama
   git add .
   git commit -m 'Agrega nueva funcionalidad'
   git push origin nueva-rama
   ```
2. **Publicar request**

Luego de hacer subir el archivo debes ir a pull request y hacer un pull request de la rama que acabas de crear.

3. **Hacer merge**

Cuando sea autorizado el merge debes hacer click en el botón de "Merge pull request" para combinarlo con el master.

4. **Volver a la rama original**
   ```bash
   git checkout master
   ```
