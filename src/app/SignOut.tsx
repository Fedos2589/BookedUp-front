import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import { useSessionControllerSignOut } from '@/api/auth/auth'
import { myNotificationsControllerPushOff } from '@/api/notifications/notifications'
import { currentEndpoint } from '@/pwa/push'
import styles from './SignOut.module.scss'

// This device stops getting the leaving account's pushes: on a shared
// computer the next person would otherwise hear its bookings. A failure
// (no subscription, no service worker, the back down) never blocks signing out.
async function turnThisDevicePushOff() {
  try {
    const endpoint = await currentEndpoint()
    if (endpoint) await myNotificationsControllerPushOff({ endpoint })
  } catch {
    // Ignored on purpose.
  }
}

// The header's «Sign out» (the cabinet only): ends the session and goes to sign in.
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
  const leave = async () => {
    await turnThisDevicePushOff()
    signOut.mutate()
  }

  return (
    <div className={styles.signOut}>
      <Button
        variant="ghost"
        colorScheme="grey"
        loading={signOut.isPending}
        onClick={() => void leave()}
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
