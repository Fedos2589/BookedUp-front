import type { ReactNode } from 'react'
import { Typography } from 'ted-ui/Typography'

import styles from './AuthLayout.module.scss'

// The narrow centered column the sign-in and sign-up forms sit in.
export function AuthLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <Typography variant="h3" component="h1">
          {title}
        </Typography>
        {children}
      </div>
    </main>
  )
}
