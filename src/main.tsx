import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource/literata/400.css';
import '@fontsource/literata/400-italic.css';
import '@fontsource/literata/700.css';
import '@fontsource/literata/700-italic.css';
import '@fontsource/roboto-slab/700.css';
import '@fontsource/archivo-black/400.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-mono/700.css';
import './styles/app.css';
import './styles/page.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
