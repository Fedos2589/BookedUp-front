import 'ted-ui/tokens.scss'
import './styles/global.scss'
import './i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { createQueryClient } from './app/queryClient'
import { createAppRouter } from './app/router'
import { initMonitoring } from './monitoring'

initMonitoring()

const queryClient = createQueryClient()
const router = createAppRouter(queryClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App queryClient={queryClient} router={router} />
  </StrictMode>,
)
