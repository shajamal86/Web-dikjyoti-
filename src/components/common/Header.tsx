import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStudentNotifications } from '../../services/notificationService';
import {
  BookOpen,
  Award,
  History,
  User,
  LogOut,
  PlusCircle,
  BarChart3,
  Users,
  Menu,
  X,
  GraduationCap,
  ShieldCheck,
  Wifi,
  WifiOff,
  Bell,
  FileSpreadsheet,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, isOnline } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';

  const isActive = (path: string) => location.pathname === path;

  // Poll or check unread notifications for students
  useEffect(() => {
    if (isStudent && user?.uid) {
      getStudentNotifications(user.uid)
        .then((list) => {
          const unread = list.filter((n) => !n.read).length;
          setUnreadCount(unread);
        })
        .catch(() => {});
    } else {
      setUnreadCount(0);
    }
  }, [isStudent, user?.uid, location.pathname]);

  return (
    <>
      {/* Offline Status Alert if connection dropped */}
      {!isOnline && (
        <div className="bg-amber-900 text-amber-100 text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2 border-b border-amber-800">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline mode active: Cached tests and data will remain accessible. Changes will sync when reconnected.</span>
        </div>
      )}

      <header className="bg-[#3E2072] text-white border-b border-[#5B2E9E] sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Brand Logo & Title matching exact mockup SVG */}
            <Link
              to={user ? (isTeacher ? '/teacher/home' : '/student/home') : '/'}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#5B2E9E] border border-[#F5A8C6]/40 flex items-center justify-center shadow-inner transition-transform group-hover:scale-105">
                <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="19" stroke="#F5A8C6" strokeWidth="2.2" />
                  <path d="M20 9 L20 31 M11 20 L29 20" stroke="#F5A8C6" strokeWidth="2.4" />
                  <circle cx="20" cy="20" r="5" fill="#F5A8C6" />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-brand-display text-lg sm:text-xl font-bold tracking-wide text-white">
                    DIKJYOTI
                  </span>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold bg-[#F5A8C6]/20 text-[#F5A8C6] border border-[#F5A8C6]/40 tracking-wider">
                    {isTeacher ? 'TEACHER' : isStudent ? 'STUDENT' : 'ONLINE TEST'}
                  </span>
                </div>
                <span className="text-[11px] text-[#C9B8EE] tracking-wide font-medium">
                  Digital Examination Portal
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {/* Student Side Navigation: 1. Live Tests, 2. Rankings, 3. History, 4. Profile */}
              {isStudent && (
                <>
                  <Link
                    to="/student/home"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive('/student/home')
                        ? 'bg-[#5B2E9E] text-white shadow-xs'
                        : 'text-[#C9B8EE] hover:text-white hover:bg-[#5B2E9E]/40'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Live Tests</span>
                  </Link>
                  <Link
                    to="/student/leaderboard"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive('/student/leaderboard')
                        ? 'bg-[#5B2E9E] text-white shadow-xs'
                        : 'text-[#C9B8EE] hover:text-white hover:bg-[#5B2E9E]/40'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Rankings</span>
                  </Link>
                  <Link
                    to="/student/history"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive('/student/history')
                        ? 'bg-[#5B2E9E] text-white shadow-xs'
                        : 'text-[#C9B8EE] hover:text-white hover:bg-[#5B2E9E]/40'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>History</span>
                  </Link>
                  <Link
                    to="/student/profile"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive('/student/profile')
                        ? 'bg-[#5B2E9E] text-white shadow-xs'
                        : 'text-[#C9B8EE] hover:text-white hover:bg-[#5B2E9E]/40'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                </>
              )}

              {/* Teacher Side Navigation: 1. Exams, 2. Create Exam, 3. CSV Import/Export, 4. Analytics, 5. Students */}
              {isTeacher && (
                <>
                  <Link
                    to="/teacher/home"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive('/teacher/home')
                        ? 'bg-[#5B2E9E] text-white shadow-xs'
                        : 'text-[#C9B8EE] hover:text-white hover:bg-[#5B2E9E]/40'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Exams</span>
                  </Link>
                  <Link
                    to="/teacher/create-exam"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive('/teacher/create-exam')
                        ? 'bg-[#5B2E9E] text-white shadow-xs'
                        : 'text-[#C9B8EE] hover:text-white hover:bg-[#5B2E9E]/40'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Exam</span>
                  </Link>
                  <Link
                    to="/teacher/csv"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive('/teacher/csv')
                        ? 'bg-[#5B2E9E] text-white shadow-xs'
                        : 'text-[#C9B8EE] hover:text-white hover:bg-[#5B2E9E]/40'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>CSV Import/Export</span>
                  </Link>
                  <Link
                    to="/teacher/analytics"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive('/teacher/analytics')
                        ? 'bg-[#5B2E9E] text-white shadow-xs'
                        : 'text-[#C9B8EE] hover:text-white hover:bg-[#5B2E9E]/40'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Analytics</span>
                  </Link>
                  <Link
                    to="/teacher/students"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive('/teacher/students')
                        ? 'bg-[#5B2E9E] text-white shadow-xs'
                        : 'text-[#C9B8EE] hover:text-white hover:bg-[#5B2E9E]/40'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Students</span>
                  </Link>
                </>
              )}

              <Link
                to="/about"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive('/about')
                    ? 'bg-[#5B2E9E] text-white shadow-xs'
                    : 'text-[#C9B8EE] hover:text-white hover:bg-[#5B2E9E]/40'
                }`}
              >
                About Us / Contact
              </Link>
            </nav>

            {/* User Actions & Sign In / Out */}
            <div className="hidden md:flex items-center space-x-3">
              {user ? (
                <div className="flex items-center gap-3">
                  {/* Notifications Bell Icon for Student reachable from the top */}
                  {isStudent && (
                    <Link
                      to="/student/notifications"
                      title="Notifications"
                      className={`relative p-2 rounded-xl text-white hover:bg-[#5B2E9E] transition-all ${
                        isActive('/student/notifications') ? 'bg-[#5B2E9E]' : ''
                      }`}
                    >
                      <Bell className="w-5 h-5 text-[#F5A8C6]" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-[#D1467B] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  )}

                  <div className="flex flex-col text-right">
                    <span className="text-sm font-bold text-white line-clamp-1 max-w-[150px]">
                      {user.displayName}
                    </span>
                    <span className="text-[11px] text-[#F5A8C6] font-semibold">
                      {user.role === 'teacher' ? 'Faculty Member' : 'Student'}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white hover:text-white bg-[#5B2E9E] hover:bg-[#7C4FD1] border border-[#7C4FD1] rounded-xl transition-colors shadow-xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/student/login"
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#F5A8C6] text-[#3E2072] hover:bg-[#f3b5ce] transition-colors shadow-xs"
                  >
                    Student Login
                  </Link>
                  <Link
                    to="/teacher/login"
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors shadow-xs"
                  >
                    Teacher Portal
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Header Icons: Bell + Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              {isStudent && (
                <Link
                  to="/student/notifications"
                  title="Notifications"
                  className="relative p-2 rounded-xl text-white hover:bg-[#5B2E9E]"
                >
                  <Bell className="w-5 h-5 text-[#F5A8C6]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-[#D1467B] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-200 hover:text-white hover:bg-[#5B2E9E] focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#5B2E9E] bg-[#341861] px-4 pt-3 pb-4 space-y-2">
            {user && (
              <div className="pb-3 border-b border-[#5B2E9E]/70 mb-2">
                <div className="text-sm font-bold text-white">{user.displayName}</div>
                <div className="text-xs text-[#C9B8EE]">{user.email}</div>
                <div className="inline-block mt-1 text-[11px] px-2.5 py-0.5 rounded-full bg-[#F5A8C6]/20 text-[#F5A8C6] font-bold border border-[#F5A8C6]/40">
                  {user.role === 'teacher' ? 'Faculty Admin' : 'Student'}
                </div>
              </div>
            )}

            {isStudent && (
              <>
                <Link
                  to="/student/home"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                    isActive('/student/home') ? 'bg-[#5B2E9E] text-white' : 'text-[#C9B8EE] hover:text-white'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Live Tests</span>
                </Link>
                <Link
                  to="/student/leaderboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                    isActive('/student/leaderboard') ? 'bg-[#5B2E9E] text-white' : 'text-[#C9B8EE] hover:text-white'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Rankings</span>
                </Link>
                <Link
                  to="/student/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                    isActive('/student/history') ? 'bg-[#5B2E9E] text-white' : 'text-[#C9B8EE] hover:text-white'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>History</span>
                </Link>
                <Link
                  to="/student/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                    isActive('/student/profile') ? 'bg-[#5B2E9E] text-white' : 'text-[#C9B8EE] hover:text-white'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </Link>
                <Link
                  to="/student/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                    isActive('/student/notifications') ? 'bg-[#5B2E9E] text-white' : 'text-[#C9B8EE] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-[#F5A8C6] text-[#3E2072] text-[10px] font-extrabold rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {isTeacher && (
              <>
                <Link
                  to="/teacher/home"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                    isActive('/teacher/home') ? 'bg-[#5B2E9E] text-white' : 'text-[#C9B8EE] hover:text-white'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Exams</span>
                </Link>
                <Link
                  to="/teacher/create-exam"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                    isActive('/teacher/create-exam') ? 'bg-[#5B2E9E] text-white' : 'text-[#C9B8EE] hover:text-white'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Exam</span>
                </Link>
                <Link
                  to="/teacher/csv"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                    isActive('/teacher/csv') ? 'bg-[#5B2E9E] text-white' : 'text-[#C9B8EE] hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>CSV Import/Export</span>
                </Link>
                <Link
                  to="/teacher/analytics"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                    isActive('/teacher/analytics') ? 'bg-[#5B2E9E] text-white' : 'text-[#C9B8EE] hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </Link>
                <Link
                  to="/teacher/students"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                    isActive('/teacher/students') ? 'bg-[#5B2E9E] text-white' : 'text-[#C9B8EE] hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Students</span>
                </Link>
              </>
            )}

            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                isActive('/about') ? 'bg-[#5B2E9E] text-white' : 'text-[#C9B8EE] hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>About Us / Contact</span>
            </Link>

            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/40 text-red-300 border border-red-800/40 rounded-xl text-xs font-bold"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="pt-2 border-t border-[#5B2E9E]/70 flex flex-col gap-2">
                <Link
                  to="/student/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-xs font-bold rounded-xl bg-[#F5A8C6] text-[#3E2072] shadow-xs"
                >
                  Student Login
                </Link>
                <Link
                  to="/teacher/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-xs font-bold rounded-xl bg-[#5B2E9E] text-white border border-[#7C4FD1] shadow-xs"
                >
                  Teacher Portal Login
                </Link>
                <Link
                  to="/student/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-xs font-bold rounded-xl border border-[#5B2E9E] text-[#C9B8EE] hover:text-white"
                >
                  Create Student Account
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Persistent Bottom Navigation Bar for Students (4 sections: Live Tests, Rankings, History, Profile) */}
      {isStudent && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#ECE7F5] px-2 py-2 flex items-center justify-around shadow-[0_-8px_18px_rgba(60,30,110,0.06)]">
          <Link
            to="/student/home"
            className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold transition-all ${
              isActive('/student/home') ? 'text-[#5B2E9E]' : 'text-[#9B93A8]'
            }`}
          >
            <div className={`py-1 px-3.5 rounded-xl transition-colors ${isActive('/student/home') ? 'bg-[#EDE1FA]' : ''}`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <span>Live Tests</span>
          </Link>
          <Link
            to="/student/leaderboard"
            className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold transition-all ${
              isActive('/student/leaderboard') ? 'text-[#5B2E9E]' : 'text-[#9B93A8]'
            }`}
          >
            <div className={`py-1 px-3.5 rounded-xl transition-colors ${isActive('/student/leaderboard') ? 'bg-[#EDE1FA]' : ''}`}>
              <Award className="w-4 h-4" />
            </div>
            <span>Rankings</span>
          </Link>
          <Link
            to="/student/history"
            className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold transition-all ${
              isActive('/student/history') ? 'text-[#5B2E9E]' : 'text-[#9B93A8]'
            }`}
          >
            <div className={`py-1 px-3.5 rounded-xl transition-colors ${isActive('/student/history') ? 'bg-[#EDE1FA]' : ''}`}>
              <History className="w-4 h-4" />
            </div>
            <span>History</span>
          </Link>
          <Link
            to="/student/profile"
            className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold transition-all ${
              isActive('/student/profile') ? 'text-[#5B2E9E]' : 'text-[#9B93A8]'
            }`}
          >
            <div className={`py-1 px-3.5 rounded-xl transition-colors ${isActive('/student/profile') ? 'bg-[#EDE1FA]' : ''}`}>
              <User className="w-4 h-4" />
            </div>
            <span>Profile</span>
          </Link>
        </div>
      )}

      {/* Persistent Bottom Navigation Bar for Teachers (5 sections: Exams, Create Exam, CSV, Analytics, Students) */}
      {isTeacher && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#ECE7F5] px-1 py-1.5 flex items-center justify-around shadow-[0_-8px_18px_rgba(60,30,110,0.06)]">
          <Link
            to="/teacher/home"
            className={`flex flex-col items-center gap-0.5 flex-1 text-[9px] font-bold transition-all ${
              isActive('/teacher/home') ? 'text-[#5B2E9E]' : 'text-[#9B93A8]'
            }`}
          >
            <div className={`py-1 px-2.5 rounded-xl transition-colors ${isActive('/teacher/home') ? 'bg-[#EDE1FA]' : ''}`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <span>Exams</span>
          </Link>
          <Link
            to="/teacher/create-exam"
            className={`flex flex-col items-center gap-0.5 flex-1 text-[9px] font-bold transition-all ${
              isActive('/teacher/create-exam') ? 'text-[#5B2E9E]' : 'text-[#9B93A8]'
            }`}
          >
            <div className={`py-1 px-2.5 rounded-xl transition-colors ${isActive('/teacher/create-exam') ? 'bg-[#EDE1FA]' : ''}`}>
              <PlusCircle className="w-4 h-4" />
            </div>
            <span>Create</span>
          </Link>
          <Link
            to="/teacher/csv"
            className={`flex flex-col items-center gap-0.5 flex-1 text-[9px] font-bold transition-all ${
              isActive('/teacher/csv') ? 'text-[#5B2E9E]' : 'text-[#9B93A8]'
            }`}
          >
            <div className={`py-1 px-2.5 rounded-xl transition-colors ${isActive('/teacher/csv') ? 'bg-[#EDE1FA]' : ''}`}>
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <span>CSV</span>
          </Link>
          <Link
            to="/teacher/analytics"
            className={`flex flex-col items-center gap-0.5 flex-1 text-[9px] font-bold transition-all ${
              isActive('/teacher/analytics') ? 'text-[#5B2E9E]' : 'text-[#9B93A8]'
            }`}
          >
            <div className={`py-1 px-2.5 rounded-xl transition-colors ${isActive('/teacher/analytics') ? 'bg-[#EDE1FA]' : ''}`}>
              <BarChart3 className="w-4 h-4" />
            </div>
            <span>Stats</span>
          </Link>
          <Link
            to="/teacher/students"
            className={`flex flex-col items-center gap-0.5 flex-1 text-[9px] font-bold transition-all ${
              isActive('/teacher/students') ? 'text-[#5B2E9E]' : 'text-[#9B93A8]'
            }`}
          >
            <div className={`py-1 px-2.5 rounded-xl transition-colors ${isActive('/teacher/students') ? 'bg-[#EDE1FA]' : ''}`}>
              <Users className="w-4 h-4" />
            </div>
            <span>Students</span>
          </Link>
        </div>
      )}
    </>
  );
};

