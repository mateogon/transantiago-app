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
Para poder utilizar esta aplicación sin problemas se debe crear el archivo `.env` en la carpeta raíz con los siguientes datos
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

# Contribución
## Haciendo fork del repositorio

### 1. Haz un fork del repositorio
Primero, realiza un fork del repositorio oficial para tener una copia del proyecto en tu cuenta de GitHub.

1. Ve al [repositorio original](https://github.com/AkumuKernel/transantiago-app).
2. Haz clic en el botón **Fork** en la esquina superior derecha.
3. Ahora tendrás una copia del repositorio en tu cuenta de GitHub.

### 2. Clona tu fork localmente

Clona tu fork a tu máquina local para poder trabajar en los cambios:

   ```bash
   git clone https://github.com/tu-usuario/transantiago-app.git
   ```

Recuerda reemplazar tu-usuario por tu nombre de usuario en GitHub.

### 3. Crea una rama nueva
Antes de realizar cambios, crea una nueva rama para trabajar. Asegúrate de que el nombre de la rama sea descriptivo de los cambios que vas a hacer:

   ```bash
   git checkout -b nombre-de-tu-rama
   ```

### 4. Realiza los cambios
Haz los cambios necesarios en tu entorno local. Una vez que hayas terminado, verifica que todo funcione correctamente.

### 5. Realiza un commit de los cambios
Una vez que estés listo para guardar tus cambios, realiza un commit:
   ```bash
   git add .
   git commit -m "Descripción de los cambios"
   ```
Asegúrate de que tu mensaje de commit describa claramente lo que has cambiado.

### 6. Sube los cambios a tu fork
Envía tus cambios a GitHub:

   ```bash
   git push origin nombre-de-tu-rama
   ```
### 7. Abre un Pull Request
Ve a tu repositorio en GitHub.
Haz clic en el botón Compare & pull request.
Asegúrate de que tu solicitud de extracción (Pull Request) describa claramente los cambios que has hecho y por qué son necesarios.

### 8. Revisión
Los mantenedores del proyecto revisarán tu Pull Request y te proporcionarán comentarios. Si todo está en orden, tus cambios serán fusionados al repositorio original.

## Mediante invitación
### 1. **Cambiar de rama**
   ```bash
   git checkout -b nueva-rama
   git add .
   git commit -m 'Agrega nueva funcionalidad'
   git push origin nueva-rama
   ```
### 2. **Publicar request**

Luego de hacer subir el archivo debes ir a pull request y hacer un pull request de la rama que acabas de crear.

### 3. **Hacer merge**

Cuando sea autorizado el merge debes hacer click en el botón de "Merge pull request" para combinarlo con el master.

### 4. **Volver a la rama original**
   ```bash
   git checkout master
   ```
