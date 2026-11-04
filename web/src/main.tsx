// RF-12: arranque de la web de Rumbo.
// La base visual va primero: los estilos de cada pantalla (que importa App) la matizan y deben ir después.
import './estilos/cuaderno.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA: solo en producción (en desarrollo Vite no genera sw.js). Si se publica una versión nueva,
// el service worker nuevo toma el control y la página se recarga una vez para estrenarla.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const habiaVersion = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaVersion) location.reload();
  });
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}
