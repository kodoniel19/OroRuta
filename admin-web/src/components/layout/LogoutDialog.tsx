import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOutIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { delay } from '../../utils/async';

export function LogoutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    await delay(500);
    logout();
    navigate('/login', { replace: true, state: { loggedOut: true } });
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title="Log out of OroRuta Admin?"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Stay signed in</Button>
          <Button variant="danger" loading={busy} icon={<LogOutIcon className="h-4 w-4" />} onClick={handleLogout}>
            Log out
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-fg-muted">
        You'll need to sign in again to manage routes and stops. Any unsaved changes in open forms will be lost.
      </p>
    </Modal>
  );
}

