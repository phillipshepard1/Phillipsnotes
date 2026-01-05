import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ImportApp from './apps/ImportApp'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ImportApp />
  </StrictMode>
)
