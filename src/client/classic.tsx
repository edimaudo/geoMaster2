import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClassicQuiz } from './components/ClassicQuiz';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClassicQuiz />
  </React.StrictMode>,
);
