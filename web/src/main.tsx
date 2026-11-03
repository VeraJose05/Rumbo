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
