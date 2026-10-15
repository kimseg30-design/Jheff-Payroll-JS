import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import LoginPage from './zite/LoginPage';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>{window.location.pathname === '/login' ? <LoginPage /> : <App />}</StrictMode>,
);
