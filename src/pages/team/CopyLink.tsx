import { RiCheckLine, RiFileCopyLine } from '@remixicon/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconButton } from 'ted-ui/IconButton/IconButton'
import { Input } from 'ted-ui/Input'
import { Typography } from 'ted-ui/Typography'

import styles from './Team.module.scss'

// A link in a read-only field with a copy button at its end. Without the
// Clipboard API (plain HTTP, e.g. a phone on the LAN) or when it refuses, the
// field is there to select and copy by hand, and the message says so.
export function CopyLink({ url }: { url: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState<boolean>()

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('no Clipboard API')
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={styles.form}>
      <Input
        label={t('team.invite.link')}
        value={url}
        readOnly
        fullWidth
        onFocus={(event) => event.currentTarget.select()}
        endIcon={
          <IconButton
            size="small"
            colorScheme="transparent"
            aria-label={t('team.invite.copy')}
            onClick={() => void copy()}
          >
            {copied ? (
              <RiCheckLine size={16} aria-hidden />
            ) : (
              <RiFileCopyLine size={16} aria-hidden />
            )}
          </IconButton>
        }
      />
      {/* Not the field's error: the link is fine, only copying it failed. */}
      {copied === true && (
        <Typography variant="t4" color="grey-400" role="status">
          {t('team.invite.copied')}
        </Typography>
      )}
      {copied === false && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('team.invite.copyFailed')}
        </Typography>
      )}
    </div>
  )
}
