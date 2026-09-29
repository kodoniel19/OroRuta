import React, { useState } from 'react';
import { TriangleAlertIcon, InfoIcon } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { delay } from '../../utils/async';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    await delay(600);
    onConfirm();
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span
          className={
            tone === 'danger'
              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger-600'
              : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600'
          }
        >
          {tone === 'danger' ? <TriangleAlertIcon className="h-4 w-4" /> : <InfoIcon className="h-4 w-4" />}
        </span>
        <div className="pt-1.5 text-sm leading-relaxed text-fg-muted">{message}</div>
      </div>
    </Modal>
  );
}

