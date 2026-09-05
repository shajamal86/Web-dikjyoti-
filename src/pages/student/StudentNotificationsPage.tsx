import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getStudentNotifications,
  deleteStudentNotification,
  markNotificationAsRead,
  clearAllStudentNotifications,
} from '../../services/notificationService';
import { AppNotification } from '../../types';
import {
  Bell,
  Trash2,
  BookOpen,
  Calendar,
  AlertCircle,
  ArrowRight,
  Inbox,
  RefreshCw,
} from 'lucide-react';

export const StudentNotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      loadNotifications();
    }
  }, [user?.uid]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await getStudentNotifications(user.uid);
      setNotifications(list);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setErrorMessage(err.message || 'Could not load your notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    setDeletingId(notifId);
    try {
      await deleteStudentNotification(user.uid, notifId);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    } catch (err: any) {
      console.error('Failed to permanently delete notification:', err);
      alert(`Could not delete notification: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkAsRead = async (notif: AppNotification) => {
    if (!user || notif.read) return;

    try {
      await markNotificationAsRead(user.uid, notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.warn('Could not mark notification as read:', err);
    }
  };

  const handleClearAll = async () => {
    if (!user || notifications.length === 0) return;
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete all notifications from your inbox? This cannot be undone.'
    );
    if (!confirmed) return;

    setClearingAll(true);
    try {
      await clearAllStudentNotifications(user.uid);
      setNotifications([]);
    } catch (err: any) {
      console.error('Failed to clear all notifications:', err);
      alert(`Failed to clear inbox: ${err.message}`);
    } finally {
      setClearingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      {/* Masthead Banner */}
      <div
        className="text-white p-5 sm:p-7 rounded-2xl border border-[#ECE7F5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, #3E2072, #5B2E9E)' }}
      >
        <div>
          <div className="flex items-center gap-2 text-xs text-[#F5A8C6] font-extrabold tracking-wider uppercase mb-1">
            <Bell className="w-4 h-4" />
            <span>Candidate Dispatch</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            Examination Notifications
          </h1>
          <p className="text-xs sm:text-sm text-purple-200 mt-1 max-w-xl font-normal">
            Live test announcements, mock schedule updates, and system alerts delivered to your private inbox.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadNotifications}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/15 transition-colors cursor-pointer"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#F5A8C6] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={clearingAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{clearingAll ? 'Clearing...' : 'Clear All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-1 text-xs text-[#786D8F]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#241748]">Total: {notifications.length}</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#EDE1FA] text-[#5B2E9E] font-extrabold text-[10px] border border-[#EDE1FA]">
              {unreadCount} Unread
            </span>
          )}
        </div>
        <span className="text-[11px] text-[#9B93A8]">
          Deleting removes only your private copy
        </span>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Notifications List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#ECE7F5] p-12 text-center text-[#9B93A8]">
          <div className="w-8 h-8 border-3 border-[#3E2072]/20 border-t-[#F5A8C6] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Synchronizing your private notification documents...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#ECE7F5] p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF9FD] border border-[#ECE7F5] text-[#9B93A8] flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-[#241748] text-base">
            Your Inbox is Empty
          </h3>
          <p className="text-xs text-[#786D8F] max-w-sm mx-auto mt-1 leading-relaxed">
            When faculty publishes new test papers or announcements, notifications will appear here instantly.
          </p>
          <div className="mt-4">
            <Link
              to="/student/home"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#3E2072] hover:bg-[#341b60] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <BookOpen className="w-4 h-4 text-[#F5A8C6]" />
              <span>Browse Live Tests</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleMarkAsRead(notif)}
              className={`p-4 rounded-2xl border transition-all relative group cursor-pointer ${
                notif.read
                  ? 'bg-white border-[#ECE7F5] hover:border-[#5B2E9E]/30'
                  : 'bg-white border-[#F5A8C6] shadow-xs ring-1 ring-[#F5A8C6]/30 hover:border-[#5B2E9E]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.read
                        ? 'bg-[#FAF9FD] text-[#9B93A8]'
                        : 'bg-[#3E2072] text-[#F5A8C6] shadow-xs'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`text-xs sm:text-sm font-bold ${
                          notif.read ? 'text-[#4A3E65]' : 'text-[#241748]'
                        }`}
                      >
                        {notif.title}
                      </h3>
                      {!notif.read && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#F5A8C6] text-[#3E2072]">
                          NEW
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#6B5E82] leading-relaxed max-w-2xl">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[10px] text-[#9B93A8]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#9B93A8]" />
                        {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {notif.examId && (
                        <Link
                          to={`/student/exam/${notif.examId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-[#5B2E9E] hover:text-[#3E2072] hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <span>Open Exam</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Permanent Delete Action Button */}
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(notif.id, e)}
                    disabled={deletingId === notif.id}
                    title="Permanently remove notification"
                    className="p-1.5 rounded-lg text-[#9B93A8] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === notif.id ? (
                      <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin inline-block" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
