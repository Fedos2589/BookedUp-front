import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import type { CabinetLink } from '@/business/cabinetLinks'
import styles from './CabinetNav.module.scss'

// The cabinet's navigation, in the header's row on a desktop and in the
// burger's sheet on a phone. Nothing at all without links: an empty
// landmark would still be announced.
export function CabinetNav({
  links,
  variant,
  className,
  onNavigate,
}: {
  links: CabinetLink[]
  variant: 't1' | 't3'
  className: string
  onNavigate?: () => void
}) {
  const { t } = useTranslation()
  if (links.length === 0) return null

  return (
    <nav className={className} aria-label={t('cabinet.navigation')}>
      {links.map(({ to, label }) => (
        <Typography key={to} variant={variant}>
          <Link to={to} className={styles.link} onClick={onNavigate}>
            {t(label)}
          </Link>
        </Typography>
      ))}
    </nav>
  )
}
