import { useTranslation } from 'react-i18next'
import { Modal } from 'ted-ui/Modal'
import { Typography } from 'ted-ui/Typography'

// «Delete this …?» before a schedule record is gone for good: the back has no
// undo, and one tap on a phone is easy to make by accident.
export function ConfirmDelete({
  title,
  what,
  loading,
  onConfirm,
  onClose,
}: {
  title: string
  what: string
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Modal
      isVisible
      title={title}
      onClose={onClose}
      buttons={[
        {
          variant: 'ghost',
          colorScheme: 'grey',
          type: 'button',
          children: t('common.cancel'),
          onClick: onClose,
        },
        {
          variant: 'solid',
          colorScheme: 'black',
          type: 'button',
          loading,
          children: t('common.delete'),
          onClick: onConfirm,
        },
      ]}
    >
      <Typography variant="t3" component="p">
        {what}
      </Typography>
    </Modal>
  )
}
