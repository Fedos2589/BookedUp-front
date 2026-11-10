// Montserrat ships with the app (not Google Fonts): the service worker
// precaches its files, so the installed app keeps its font offline. The kit
// uses weights 500, 600 and 700; each file covers every script by unicode-range.
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import 'ted-ui/tokens.scss'
import './styles/global.scss'
import './i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { createApp } from './app/createApp'
import { initMonitoring } from './monitoring'

initMonitoring()

const { queryClient, router } = createApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App queryClient={queryClient} router={router} />
  </StrictMode>,
)
