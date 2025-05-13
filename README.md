
# Cannabis Club Manager

Aplicación para la gestión integral de clubes de cannabis, incluyendo gestión de socios, dispensario, inventario y caja.

## Características principales

- Gestión completa de socios
- Sistema de dispensario
- Control de inventario
- Gestión de caja
- Informes y estadísticas
- Modo oscuro
- Diseño responsive
- Gestión de documentos
- Soporte para SQLite3 en Raspberry Pi

## Tecnologías utilizadas

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- IndexedDB (Dexie.js) para desarrollo
- SQLite3 para producción en Raspberry Pi

## Configuración del entorno

### Versión de desarrollo (local)

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/cannabis-club-manager.git

# Entrar al directorio
cd cannabis-club-manager

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Compilar para producción
npm run build
```

### Configuración en Raspberry Pi 3B+

#### Acceso al sistema

- IP: 192.168.1.173
- DNS: gniv.zapto.org
- Usuario SSH: pi
- Puerto: 22

#### Preparación del sistema Raspberry Pi

1. Instalar Raspberry Pi OS Lite (64-bit) para mejor rendimiento:
   ```bash
   # Descargar e instalar Raspberry Pi Imager desde:
   # https://www.raspberrypi.org/software/
   
   # Seleccionar "Raspberry Pi OS Lite (64-bit)" al configurar la tarjeta SD
   ```

2. Configuración inicial después del primer arranque:
   ```bash
   # Actualizar el sistema
   sudo apt update
   sudo apt upgrade -y
   
   # Instalar dependencias necesarias
   sudo apt install -y git curl sqlite3 nginx
   
   # Instalar Node.js 18.x (versión LTS)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Verificar instalación
   node -v  # Debería mostrar v18.x.x
   npm -v   # Debería mostrar 9.x.x
   ```

3. Optimización de rendimiento:
   ```bash
   # Aumentar el tamaño del archivo swap para evitar problemas de memoria
   sudo dphys-swapfile swapoff
   sudo nano /etc/dphys-swapfile
   
   # Cambiar CONF_SWAPSIZE=100 a CONF_SWAPSIZE=1024
   
   sudo dphys-swapfile setup
   sudo dphys-swapfile swapon
   
   # Verificar el nuevo tamaño del swap
   free -h
   ```

#### Instalación y configuración de la base de datos SQLite3

1. Crear el directorio para la base de datos:
   ```bash
   sudo mkdir -p /opt/club-manager/db
   sudo chown pi:pi /opt/club-manager/db
   ```

2. Inicializar la base de datos:
   ```bash
   # Crear la base de datos SQLite
   sqlite3 /opt/club-manager/db/club.db < setup.sql
   
   # Asignar permisos adecuados
   sudo chown pi:pi /opt/club-manager/db/club.db
   sudo chmod 664 /opt/club-manager/db/club.db
   ```

#### Instalación de la aplicación

1. Clonar el repositorio y configurar:
   ```bash
   mkdir -p ~/apps
   cd ~/apps
   git clone https://github.com/tu-usuario/cannabis-club-manager.git
   cd cannabis-club-manager
   
   # Para Raspberry Pi es recomendable usar --legacy-peer-deps para evitar problemas
   npm install --legacy-peer-deps
   ```

2. Configurar la aplicación:
   ```bash
   # Crear archivo de configuración para el backend
   cat > .env << EOL
   DB_PATH=/opt/club-manager/db/club.db
   PORT=3000
   HOST=0.0.0.0
   EOL
   ```

3. Compilar la aplicación para producción:
   ```bash
   # Aumentar el timeout del node para evitar problemas durante la compilación
   NODE_OPTIONS=--max_old_space_size=800 npm run build
   
   # Instalar PM2 para gestionar el servicio
   sudo npm install -g pm2
   
   # Iniciar el backend
   pm2 start server.js --name "club-backend"
   
   # Configurar para que se inicie automáticamente
   pm2 save
   pm2 startup
   # (ejecutar el comando que te muestra PM2)
   ```

4. Configurar Nginx como proxy inverso:
   ```bash
   sudo nano /etc/nginx/sites-available/club-manager
   ```
   
   Añadir la siguiente configuración:
   ```
   server {
       listen 80;
       server_name gniv.zapto.org;
   
       root /home/pi/apps/cannabis-club-manager/dist;
       index index.html;
   
       location / {
           try_files $uri $uri/ /index.html;
       }
   
       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Activar el sitio:
   ```bash
   sudo ln -s /etc/nginx/sites-available/club-manager /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. Configurar acceso remoto seguro:
   ```bash
   # Habilitar SSH si no está habilitado
   sudo raspi-config
   # Navegar a "Interface Options" > "SSH" > "Yes"

   # Opcional: Configurar autenticación por clave
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   # Añadir clave pública al archivo authorized_keys
   ```

#### Migración de datos desde la versión local

1. En la aplicación local:
   - Ve a "Configuración" > "Exportar datos (SQLite)"
   - Guarda el archivo SQL generado

2. Transferir el archivo a la Raspberry Pi:
   ```bash
   scp club-export.sql pi@192.168.1.173:/tmp/
   ```
   
3. Importar datos en la Raspberry Pi:
   ```bash
   sqlite3 /opt/club-manager/db/club.db < /tmp/club-export.sql
   ```

#### Actualizaciones y mantenimiento

Para actualizar la aplicación:
```bash
cd ~/apps/cannabis-club-manager
git pull
npm install --legacy-peer-deps
NODE_OPTIONS=--max_old_space_size=800 npm run build
pm2 restart club-backend
```

Para realizar copias de seguridad de la base de datos:
```bash
# Crear copia de seguridad
sqlite3 /opt/club-manager/db/club.db .dump > /opt/club-manager/db/backup-$(date +%Y%m%d).sql

# Restaurar copia de seguridad
sqlite3 /opt/club-manager/db/club.db < /opt/club-manager/db/backup-YYYYMMDD.sql
```

## Solución de problemas comunes

### Problemas de memoria
```bash
# Ver uso de memoria
free -h

# Reiniciar el servicio si hay problemas
pm2 restart club-backend
```

### Problemas de base de datos
```bash
# Verificar integridad de la base de datos
sqlite3 /opt/club-manager/db/club.db "PRAGMA integrity_check;"

# Optimizar base de datos
sqlite3 /opt/club-manager/db/club.db "VACUUM;"
```

### Logs y monitorización
```bash
# Ver logs de la aplicación
pm2 logs club-backend

# Ver logs del servidor web
sudo tail -f /var/log/nginx/error.log
```

## Contacto y soporte

Para preguntas o soporte técnico, contacta a través de:
- Email: soporte@tudominio.com
- Telegram: @TuUsuario
