"use client";

import { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { requestNotificationPermission, testReminder } from '../../components/ReminderEngine';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'reminder' | 'task' | 'system';
  read: boolean;
  timestamp: Date;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'reminders'>('all');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Taak herinnering',
      message: 'Het is tijd voor je tweede taak - 15 min focus.',
      type: 'reminder',
      read: false,
      timestamp: new Date(Date.now() - 30 * 60 * 1000) // 30 min geleden
    },
    {
      id: '2',
      title: 'Goed gedaan!',
      message: 'Je hebt je eerste taak voltooid. Neem 2 min pauze.',
      type: 'task',
      read: true,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 uur geleden
    },
    {
      id: '3',
      title: 'Systeem update',
      message: 'Structuro is bijgewerkt naar versie 0.1.0',
      type: 'system',
      read: false,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 dag geleden
    }
  ]);

  // Check notificatie permissie bij laden
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    try {
      // Eerst bevestiging vragen
      const userWantsNotifications = window.confirm(
        'Wil je notificaties ontvangen voor je taken en afspraken?\n\n' +
        'Je krijgt herinneringen voor:\n' +
        '• Taken die bijna beginnen\n' +
        '• Voltooide taken\n' +
        '• Belangrijke updates\n\n' +
        'Klik "OK" om notificaties in te schakelen, of "Annuleren" om dit later te doen.'
      );
      
      if (!userWantsNotifications) {
        return; // Gebruiker wil geen notificaties
      }
      
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
          // Voeg een succes notificatie toe
          const successNotification: Notification = {
            id: Date.now().toString(),
            title: 'Notificaties ingeschakeld!',
            message: 'Je ontvangt nu herinneringen voor je taken en afspraken.',
            type: 'system',
            read: false,
            timestamp: new Date()
          };
          
          setNotifications(prev => [successNotification, ...prev]);
          
          // Test notificatie
          testReminder();
        } else if (permission === 'denied') {
          // Voeg een waarschuwing toe
          const warningNotification: Notification = {
            id: Date.now().toString(),
            title: 'Notificaties uitgeschakeld',
            message: 'Je hebt notificaties geweigerd. Je kunt dit later wijzigen in je browser instellingen.',
            type: 'system',
            read: false,
            timestamp: new Date()
          };
          
          setNotifications(prev => [warningNotification, ...prev]);
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'reminders') return n.type === 'reminder';
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reminder': return '⏰';
      case 'task': return '✅';
      case 'system': return '🔧';
      default: return '📢';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reminder': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'task': return 'bg-green-100 text-green-800 border-green-200';
      case 'system': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getNotificationButtonText = () => {
    switch (notificationPermission) {
      case 'granted': return 'Ingeschakeld ✓';
      case 'denied': return 'Geweigerd ✗';
      default: return 'Inschakelen';
    }
  };

  const getNotificationButtonStyle = () => {
    switch (notificationPermission) {
      case 'granted': return 'bg-green-600 hover:bg-green-700 cursor-default';
      case 'denied': return 'bg-red-600 hover:bg-red-700 cursor-default';
      default: return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  return (
    <AppLayout>
      <div
        style={{
          minHeight: "100vh",
          background: "#F7F8FA",
          color: "#2F3441",
          display: "grid",
          justifyContent: "center",
          padding: "28px 16px 64px",
        }}
      >
        <main style={{ width: "min(720px, 92vw)", display: "grid", gap: 20 }}>
          {/* Header */}
          <header style={{ textAlign: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Notificaties & Herinneringen</div>
            <div style={{ fontSize: 14, color: "rgba(47,52,65,0.75)", marginTop: 6 }}>
              Blijf op de hoogte van je taken en afspraken
            </div>
          </header>

          {/* Filter Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex space-x-4">
              {[
                { key: 'all', label: 'Alle', count: notifications.length },
                { key: 'unread', label: 'Ongelezen', count: notifications.filter(n => !n.read).length },
                { key: 'reminders', label: 'Herinneringen', count: notifications.filter(n => n.type === 'reminder').length }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === key
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg">Geen notificaties gevonden</p>
                <p className="text-sm">Je hebt alle notificaties verwerkt!</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white rounded-lg shadow-sm border border-slate-200 p-6 ${
                    !notification.read ? 'border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">{getTypeIcon(notification.type)}</div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-900">{notification.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                          {notification.type}
                        </span>
                      </div>
                      
                      <p className="text-slate-600 mb-3">{notification.message}</p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          {notification.timestamp.toLocaleString('nl-NL')}
                        </span>
                        
                        <div className="flex space-x-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Markeer als gelezen
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                          >
                            Verwijderen
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Notificatie Instellingen</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">Browser notificaties</h3>
                  <p className="text-sm text-slate-600">Ontvang notificaties in je browser</p>
                </div>
                <div className="flex gap-2">
                  {notificationPermission === 'granted' && (
                    <button
                      onClick={() => testReminder()}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                      title="Test een notificatie"
                    >
                      Test
                    </button>
                  )}
                  <button 
                    onClick={handleEnableNotifications}
                    className={`${getNotificationButtonStyle()} text-white px-4 py-2 rounded-lg transition-colors`}
                    disabled={notificationPermission !== 'default'}
                  >
                    {getNotificationButtonText()}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">Stille uren</h3>
                  <p className="text-sm text-slate-600">Geen notificaties tussen 22:00 - 07:00</p>
                </div>
                <button
                  onClick={() => setQuietHoursEnabled(!quietHoursEnabled)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${
                    quietHoursEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    quietHoursEnabled ? 'right-0.5' : 'left-0.5'
                  }`}></div>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
