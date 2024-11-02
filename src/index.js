import React from 'react';
import ReactDOM from 'react-dom/client'; // Импортируйте из 'react-dom/client'
import App from './App'; // Импортируйте ваш компонент App

// Создайте корень с помощью createRoot
const root = ReactDOM.createRoot(document.getElementById('root')); // Убедитесь, что у вас есть элемент с id 'root' в вашем index.html

// Используйте метод render на корне
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);