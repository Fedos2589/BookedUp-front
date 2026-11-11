import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import { useSessionControllerSignOut } from '@/api/auth/auth'
import styles from './Cabinet.module.scss'

// The cabinet header's «Sign out»: ends the session and goes to sign in.
export function SignOut() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const signOut = useSessionControllerSignOut({
    mutation: {
      // Everything cached belongs to the account that just left.
      onSuccess: async () => {
        queryClient.clear()
        await navigate({ to: '/sign-in' })
      },
    },
  })

  return (
    <div className={styles.signOut}>
      <Button
        variant="ghost"
        colorScheme="grey"
        loading={signOut.isPending}
        onClick={() => signOut.mutate()}
      >
        {t('cabinet.signOut')}
      </Button>
      {signOut.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('auth.failed')}
        </Typography>
      )}
    </div>
  )
}
