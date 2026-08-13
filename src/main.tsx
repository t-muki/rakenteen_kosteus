import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './App.css';

const juuri = document.getElementById('root');
if (juuri) {
  createRoot(juuri).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
