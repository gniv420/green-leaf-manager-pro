# Sistema de Contabilidad para Pizzería - IGIC Canarias

Sistema completo de gestión contable para restaurantes pizzería en Canarias con soporte para IGIC (Impuesto General Indirecto Canario).

## 🍕 Características Principales

### Punto de Venta (TPV)
- Interfaz intuitiva para realizar ventas rápidas
- Catálogo de productos organizado por categorías (pizzas, bebidas, entrantes, postres)
- Cálculo automático de IGIC según tipo de producto (0%, 3%, 7%)
- Generación automática de facturas
- Múltiples métodos de pago (efectivo, tarjeta, transferencia, bizum)

### Gestión de Productos
- Catálogo completo de productos
- Categorización: pizzas, bebidas, entrantes, postres
- Configuración de precios y precios de coste
- Asignación de tipo de IGIC por producto
- Gestión de ingredientes y tamaños (para pizzas)
- Control de visibilidad en TPV

### Facturación
- Generación automática de números de factura (formato: AÑO/NÚMERO)
- Cálculo automático de IGIC repercutido
- Desglose detallado por tipos de IGIC (0%, 3%, 7%)
- Visualización e impresión de facturas
- Historial completo de facturas
- Estados: pagada, pendiente, anulada

### Gastos y Compras
- Registro de gastos y compras a proveedores
- Cálculo de IGIC soportado
- Categorización de gastos (mercancía, alquiler, suministros, servicios, salarios, otros)
- Múltiples métodos de pago
- Control de estado (pagado/pendiente)

### Clientes
- Gestión de datos de clientes
- Registro de CIF/NIF
- Información de contacto y dirección
- Asignación de clientes a facturas

### Caja Diaria
- Apertura y cierre de caja
- Registro de movimientos
- Control de efectivo
- Integración con ventas y gastos

### Informes Contables
- **Libro de Ventas**: Registro detallado de todas las facturas emitidas
- **Libro de Compras**: Registro de gastos y compras con IGIC soportado
- **Resumen IGIC**: 
  - IGIC Repercutido (de ventas)
  - IGIC Soportado (de compras)
  - Cálculo automático de IGIC a ingresar
- **Productos Más Vendidos**: Estadísticas de ventas por producto
- **Balance del Periodo**: Resultado entre ventas y gastos
- Exportación a CSV para análisis externo

### Panel de Control (Dashboard)
- Ventas del día en tiempo real
- Gastos del día
- Estado de caja (abierta/cerrada)
- Total de productos en catálogo
- Últimas facturas emitidas
- Resumen mensual

## 🏛️ IGIC - Impuesto General Indirecto Canario

El sistema soporta los tres tipos de IGIC vigentes en Canarias:

- **0% (Exento)**: Productos básicos, algunos alimentos
- **3% (Reducido)**: Ciertos alimentos y productos
- **7% (General)**: Tipo estándar aplicado a restauración

### Cálculo Automático
El sistema calcula automáticamente:
- Base imponible
- IGIC por cada tipo (0%, 3%, 7%)
- Total de IGIC
- Total de la factura/gasto

### Declaración de IGIC
Los informes generan automáticamente:
- Total de IGIC repercutido (ventas)
- Total de IGIC soportado (compras)
- **IGIC a ingresar** = IGIC repercutido - IGIC soportado

## 🚀 Tecnologías Utilizadas

- **Frontend**: React + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Base de Datos**: SQLite (almacenamiento local)
- **Iconos**: Lucide React
- **Formularios**: React Hook Form + Zod
- **Routing**: React Router v6

## 📦 Instalación

```bash
# Clonar el repositorio
git clone [url-del-repositorio]

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Compilar para producción
npm run build
```

## 🔐 Acceso por Defecto

- **Usuario**: admin
- **Contraseña**: admin123

⚠️ **Importante**: Cambiar la contraseña tras el primer acceso.

## 📊 Base de Datos

El sistema utiliza SQLite con las siguientes tablas principales:

- `users` - Usuarios del sistema
- `products` - Catálogo de productos
- `customers` - Clientes
- `invoices` - Facturas de venta
- `invoice_lines` - Líneas de factura
- `expenses` - Gastos y compras
- `cash_registers` - Cajas diarias
- `cash_movements` - Movimientos de caja

La base de datos se crea automáticamente en `/data/club.db` con productos de ejemplo.

## 🍕 Productos de Ejemplo

El sistema incluye productos predefinidos:

### Pizzas (IGIC 7%)
- Pizza Margarita
- Pizza Carbonara
- Pizza Cuatro Quesos
- Pizza Pepperoni
- Pizza Hawaiana
- Pizza Barbacoa

### Bebidas
- Coca Cola (IGIC 7%)
- Agua Mineral (IGIC 3%)
- Cerveza (IGIC 7%)

### Entrantes (IGIC 7%)
- Ensalada César
- Alitas de Pollo

### Postres (IGIC 7%)
- Tiramisú
- Brownie con Helado

## 📝 Flujo de Trabajo Típico

1. **Apertura de Caja**: Abrir caja al inicio del día
2. **Ventas**: Usar TPV para registrar ventas
3. **Gastos**: Registrar compras y gastos del día
4. **Facturas**: Las ventas generan facturas automáticamente
5. **Cierre de Caja**: Cerrar caja al final del día
6. **Informes**: Generar informes periódicos para declaraciones

## 🔧 Configuración

Accede a **Ajustes** para:
- Cambiar nombre de la pizzería
- Personalizar logo
- Gestionar usuarios
- Exportar/Importar base de datos

## 📄 Licencia

[Especificar licencia]

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir cambios importantes.

## 📞 Soporte

Para soporte o consultas, [añadir información de contacto]

---

Desarrollado con ❤️ para pizzerías en Canarias
