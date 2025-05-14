
# Cannabis Club Manager

Aplicación para gestión de asociaciones cannábicas.

## Requisitos

- Node.js 16.x o superior
- npm o yarn

## Instalación en Raspberry Pi

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/cannabis-club-manager.git
cd cannabis-club-manager
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Construir la aplicación

```bash
npm run build
```

### 4. Instalar dependencias adicionales para el servidor

```bash
npm install express sqlite3 cors dotenv
```

### 5. Crear archivo .env

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```
PORT=3000
HOST=localhost
DB_PATH=./data/club.db
```

Puedes ajustar estas configuraciones según tus necesidades.

### 6. Configurar el servidor para iniciar con PM2

```bash
npm install -g pm2
pm2 start server.js --name "cannabis-club-manager"
pm2 save
pm2 startup
```

Sigue las instrucciones que te dará el comando `pm2 startup` para configurar el inicio automático.

### 7. Acceder a la aplicación

La aplicación estará disponible en:

```
http://localhost:3000
```

Si deseas acceder desde otros dispositivos en tu red local, usa la IP de la Raspberry Pi en lugar de localhost.

## Compartir la carpeta con Samba

Para acceder a los archivos desde Windows o MacOS, puedes configurar Samba:

1. Instalar Samba:
```bash
sudo apt update
sudo apt install samba samba-common-bin
```

2. Configurar Samba:
```bash
sudo nano /etc/samba/smb.conf
```

3. Añade al final del archivo:
```
[cannabis-club-manager]
   path = /ruta/a/cannabis-club-manager
   browseable = yes
   writeable = yes
   create mask = 0775
   directory mask = 0775
   public = no
   valid users = tu-usuario
```

4. Crear una contraseña para el usuario:
```bash
sudo smbpasswd -a tu-usuario
```

5. Reiniciar Samba:
```bash
sudo systemctl restart smbd
```

## Backups

Los datos se guardan en `./data/club.db`. Es recomendable hacer backups periódicos de este archivo.

## Acceso

El usuario y contraseña por defecto son:
- Usuario: admin
- Contraseña: 1234

**¡Importante!** Cambia esta contraseña después de tu primer inicio de sesión por seguridad.
