
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Crear la carpeta data si no existe (para almacenamiento local)
try {
  // Si estamos en un entorno de navegador, esto no tendrá efecto
  // pero es necesario para mantener la compatibilidad con el servidor
  const fs = window.require ? window.require('fs') : null;
  const path = window.require ? window.require('path') : null;
  
  if (fs && path) {
    const dataPath = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
      console.log('Directorio de datos creado:', dataPath);
    }
  }
} catch (e) {
  // Es normal que esto falle en el navegador
  console.info('Ejecutando en navegador, no se puede crear la carpeta data');
}

createRoot(document.getElementById("root")!).render(<App />);
