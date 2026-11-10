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
