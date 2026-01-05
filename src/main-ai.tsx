import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AIApp from './apps/AIApp'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AIApp />
  </StrictMode>
)
