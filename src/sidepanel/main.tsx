import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../popup/App'
import '../popup/index.css'

document.documentElement.classList.add('katch-desk')
document.body.classList.add('katch-desk')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App deskMode />
  </React.StrictMode>,
)
