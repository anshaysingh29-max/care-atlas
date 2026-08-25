'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, LoaderCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import {
  formatMessageTimestamp,
  markNotificationRead,
  subscribeToPatientNotifications
} from '@/lib/firebase/communications';

export default function PatientNotificationBell() {
  const { user } = useAuth();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    return subscribeToPatientNotifications(
      user.uid,
      setRows,
      notificationError => setError(notificationError?.message || 'Could not load notifications.')
    );
  }, [user]);

  useEffect(() => {
    function close(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unread = useMemo(() => rows.filter(item => !item.readAt).length, [rows]);

  async function markRead(item) {
    if (item.readAt) return;
    setBusy(item.id);
    try {
      await markNotificationRead(item.id);
    } catch (readError) {
      setError(readError?.message || 'Could not mark notification as read.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="phase6f-notification" ref={rootRef}>
      <button type="button" className="phase6f-notification-button" onClick={() => setOpen(value => !value)} aria-label="Patient notifications">
        <Bell size={17}/>
        {unread > 0 && <span>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && <div className="phase6f-notification-popover">
        <div className="phase6f-notification-heading"><strong>Notifications</strong><small>{unread} unread</small></div>
        {error && <p className="phase6f-notification-error">{error}</p>}
        <div className="phase6f-notification-list">
          {rows.length ? rows.slice(0, 12).map(item => (
            <button type="button" key={item.id} className={item.readAt ? 'read' : 'unread'} onClick={() => markRead(item)}>
              <div><strong>{item.title || 'CareAtlas update'}</strong><span>{item.body || 'Your case has a new update.'}</span><small>{formatMessageTimestamp(item.createdAt)}</small></div>
              <i>{busy === item.id ? <LoaderCircle className="spin" size={13}/> : item.readAt ? <Check size={13}/> : null}</i>
            </button>
          )) : <div className="phase6f-notification-empty">No notifications yet.</div>}
        </div>
      </div>}
    </div>
  );
}
