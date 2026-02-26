import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '~/App';
import '~/i18n/config';
import '~/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
