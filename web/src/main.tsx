// RF-12: arranque de la web de Rumbo.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './estilos/cuaderno.css';

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
