import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useClientsControllerCard } from '@/api/clients/clients'
import { useCurrentBusiness } from '@/business/currentBusiness'
import styles from './Clients.module.scss'

// «Open Anna»: the card of the client who already has the phone just typed.
// The back says who by id only, so the name is read from the card.
export function PhoneTakenLink({
  clientId,
  onOpen,
}: {
  clientId: string
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const card = useClientsControllerCard(business.id, clientId)

  return (
    <Link
      to="/clients/$clientId"
      params={{ clientId }}
      className={styles.link}
      onClick={onOpen}
    >
      {card.data
        ? t('clients.form.openTaken', { name: card.data.name })
        : t('clients.form.openTakenNoName')}
    </Link>
  )
}
