import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import HelpApp from './HelpApp.jsx'

// Hosts that rewrite unknown paths to index.html (and the Vite dev server for
// `/help` without a trailing slash) land here, so render help for that path too.
const isHelp = window.location.pathname.replace(/\/+$/, '') === '/help'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isHelp ? <HelpApp /> : <App />}
  </StrictMode>,
)
