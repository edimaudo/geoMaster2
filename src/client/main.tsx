import React from 'react';
import { createRoot } from 'react-dom/client';
import { InlineCard } from './components/InlineCard';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <InlineCard />
  </React.StrictMode>,
);
