import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PricingPage from './pages/pricing'

const queryParams = new URLSearchParams(window.location.search)
const page = queryParams.get('page')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PricingPage />
  </StrictMode>,
)
