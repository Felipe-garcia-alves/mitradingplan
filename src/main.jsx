import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './theme.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Spotlight dos cards: passa a posição do mouse pro card sob o cursor (ver theme.css)
let spotCard = null;
window.addEventListener('pointermove', e => {
  const card = e.target.closest?.('[style*="var(--card)"]');
  if (spotCard && spotCard !== card) {
    spotCard.style.removeProperty('--mx');
    spotCard.style.removeProperty('--my');
  }
  spotCard = card;
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  card.style.setProperty('--my', (e.clientY - r.top) + 'px');
}, { passive: true });

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registrado'))
      .catch(err => console.log('SW erro:', err));
  });
}
