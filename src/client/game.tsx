import React from 'react';
import { createRoot } from 'react-dom/client';
import { ActivePlay } from './components/ActivePlay';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ActivePlay />
  </React.StrictMode>,
);
