import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" toastOptions={{
        style:{ background:'#16162A', color:'#fff', border:'1px solid #2A2A45', fontFamily:'Inter,sans-serif', fontSize:'14px' },
        success:{ iconTheme:{ primary:'#00D8A4', secondary:'#0F0F1A' } },
        error:{   iconTheme:{ primary:'#EF2B24', secondary:'#0F0F1A' } },
        loading:{ iconTheme:{ primary:'#6C63FF', secondary:'#0F0F1A' } },
      }}/>
    </BrowserRouter>
  </React.StrictMode>
)
