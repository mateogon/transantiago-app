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
