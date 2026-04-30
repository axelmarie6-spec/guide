import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TutorialProvider } from './context/TutorialContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TutorialProvider>
          <App />
        </TutorialProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
