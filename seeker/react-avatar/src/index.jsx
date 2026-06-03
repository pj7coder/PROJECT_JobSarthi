import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../../../css/main.css'; // Leverage existing platform design layout stylesheet rules

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
