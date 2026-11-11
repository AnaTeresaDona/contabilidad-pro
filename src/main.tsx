import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ProveedorProgreso } from './estado/Progreso';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorProgreso>
      <App />
    </ProveedorProgreso>
  </StrictMode>,
);
