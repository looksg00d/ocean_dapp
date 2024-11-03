import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Init root element
const root = ReactDOM.createRoot(document.getElementById('root'));

// Fire up the app
root.render(
  // Strict mode for extra checks during dev
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
