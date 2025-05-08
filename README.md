
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

## Tecnologías utilizadas

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- IndexedDB (Dexie.js)

## Requisitos del sistema

- Node.js 18.x o superior
- NPM 9.x o superior
- Mínimo 1GB de RAM
- 2GB de espacio en disco

## Instalación estándar

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

## Instrucciones específicas para Raspberry Pi 3B+

La Raspberry Pi 3B+ tiene limitaciones de recursos, pero es posible ejecutar la aplicación siguiendo estos pasos específicos:

### Preparación del sistema

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
   sudo apt install -y git curl
   
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

### Instalación de la aplicación

1. Clonar el repositorio y configurar:
   ```bash
   git clone https://github.com/tu-usuario/cannabis-club-manager.git
   cd cannabis-club-manager
   
   # Para Raspberry Pi es recomendable usar --legacy-peer-deps para evitar problemas
   npm install --legacy-peer-deps
   ```

2. Ajustes de rendimiento para la compilación:
   ```bash
   # Crear o editar el archivo .npmrc en la raíz del proyecto
   echo "maxsockets=1" >> .npmrc
   echo "network-timeout=100000" >> .npmrc
   ```

3. Compilar la aplicación (esto puede tomar tiempo en un Raspberry Pi 3B+):
   ```bash
   # Aumentar el timeout del node para evitar problemas durante la compilación
   NODE_OPTIONS=--max_old_space_size=800 npm run build
   ```

4. Ejecutar la aplicación en modo producción:
   ```bash
   # Instalar un servidor sencillo para servir la aplicación
   npm install -g serve
   
   # Servir la aplicación compilada
   serve -s dist
   ```

5. Configurar para que se inicie automáticamente al encender la Raspberry Pi:
   ```bash
   # Crear un servicio systemd
   sudo nano /etc/systemd/system/club-manager.service
   ```
   
   Contenido del archivo:
   ```
   [Unit]
   Description=Cannabis Club Manager App
   After=network.target
   
   [Service]
   Type=simple
   User=pi
   WorkingDirectory=/home/pi/cannabis-club-manager
   ExecStart=/usr/bin/serve -s dist
   Restart=on-failure
   
   [Install]
   WantedBy=multi-user.target
   ```
   
   Activar el servicio:
   ```bash
   sudo systemctl enable club-manager.service
   sudo systemctl start club-manager.service
   ```

### Solución de problemas comunes

- **Error de memoria durante la instalación o compilación**:
  ```bash
  # Aumentar el espacio de memoria para Node.js
  NODE_OPTIONS=--max_old_space_size=800 npm install
  # O para la compilación
  NODE_OPTIONS=--max_old_space_size=800 npm run build
  ```

- **Rendimiento lento**:
  - Asegúrate de utilizar una tarjeta SD de clase 10 o superior
  - Considera añadir un sistema de enfriamiento para la Raspberry Pi para evitar throttling térmico
  - Limita las aplicaciones en segundo plano

- **Problemas de conexión**:
  - Si utilizas Wi-Fi, asegúrate de tener buena señal o considera usar conexión Ethernet
  - Verifica la configuración de red con `ifconfig`

## Mantenimiento y respaldo

Para garantizar la seguridad de los datos, es recomendable realizar respaldos periódicos:

```bash
# Respaldar la base de datos IndexedDB
# En la aplicación, ve a Configuración > Respaldo y genera un archivo de respaldo

# Copiar el respaldo a un dispositivo externo
cp ~/Downloads/club-manager-backup-*.json /media/usb/backups/
```

## Contacto y soporte

Para preguntas o soporte técnico, contacta a través de:
- Email: soporte@tudominio.com
- Telegram: @TuUsuario
