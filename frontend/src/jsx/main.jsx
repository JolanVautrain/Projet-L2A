import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from './useLanguage.jsx'
import Index from './Index.jsx'

const container = document.getElementById('root')
const root = createRoot(container)

root.render(
  <React.StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <Index />
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>
)
