import type { ReactNode, Ref } from 'react'
import { Typography } from 'ted-ui/Typography'

import styles from './AuthLayout.module.scss'

// The narrow centered column the sign-in and sign-up forms sit in. The heading
// takes focus programmatically (tabIndex -1) when a flow moves to a new step.
export function AuthLayout({
  title,
  headingRef,
  children,
}: {
  title: string
  headingRef?: Ref<HTMLHeadingElement>
  children: ReactNode
}) {
  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <Typography ref={headingRef} variant="h3" component="h1" tabIndex={-1}>
          {title}
        </Typography>
        {children}
      </div>
    </main>
  )
}
