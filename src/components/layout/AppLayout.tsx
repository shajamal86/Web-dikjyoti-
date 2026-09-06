import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStudentNotifications } from '../../services/notificationService';
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  History,
  User,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
  FileSpreadsheet,
  PlusCircle,
  Users,
  BarChart3,
  WifiOff,
  ChevronDown,
  Shield,
  Layers,
} from 'lucide-react';
import { MonetagBannerAd } from '../common/MonetagBannerAd';
import { useMonetagRouteTrigger } from '../../hooks/useMonetagRouteTrigger';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout, isOnline } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Hook forcing Monetag ad containers to re-initialize and remount on every route transition
  const { adKey, transitionCount, reinitializeAds } = useMonetagRouteTrigger();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname, location.search]);

  // Public and authentication routes do not use the dashboard chrome
  const isPublicOrAuthRoute =
    location.pathname === '/' ||
    location.pathname === '/about' ||
    location.pathname === '/student/login' ||
    location.pathname === '/student/signup' ||
    location.pathname === '/teacher/login' ||
    location.pathname === '/teacher/signup';

  // Active timed exam attempt screen must remain completely distraction-free
  const isExamAttempt = location.pathname.startsWith('/student/exam/');

  // Strict role derivation
  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    if (!isTeacher && user?.uid) {
      getStudentNotifications(user.uid)
        .then((list) => {
          const unread = list.filter((n) => !n.read).length;
          setUnreadCount(unread);
        })
        .catch(() => {});
    }
  }, [user?.uid, isTeacher, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  // Derive page heading
  const getPageTitle = () => {
    const path = location.pathname;
    const search = location.search;

    if (path.includes('/student/exam/')) return 'Exam Attempt';
    if (path.includes('/student/result/')) return 'Your Result';
    if (path === '/student/leaderboard') return 'Rankings';
    if (path === '/student/history') return 'History';
    if (path === '/student/profile') return 'My Profile';
    if (path === '/student/notifications') return 'Notifications';
    if (path === '/student/home') {
      return search.includes('view=live') ? 'Live Tests' : 'Dashboard';
    }

    if (path === '/teacher/create-exam') return 'Create Exam';
    if (path === '/teacher/csv') return 'CSV Import / Export';
    if (path === '/teacher/students') return 'Registered Students';
    if (path === '/teacher/analytics') return 'Analytics';
    if (path === '/teacher/home') {
      return search.includes('view=exams') ? 'Exams' : 'Dashboard';
    }

    if (path === '/about') return 'About Us';
    return 'Dashboard';
  };

  const isActive = (path: string, exactSearch?: string) => {
    if (exactSearch) {
      return location.pathname === path && location.search === exactSearch;
    }
    return location.pathname === path;
  };

  // User display name & role
  const userInitials = (user?.displayName || 'User')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const userRoleLabel = isTeacher
    ? 'Teacher / Faculty Admin'
    : (user as any)?.batch || 'Student Examinee';

  // 1. Distraction-free exam container
  if (isExamAttempt) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] text-[#1F2A44] font-sans antialiased">
        {children}
      </div>
    );
  }

  // 2. Public / Auth pages (Landing, Login, Signup, About)
  // Render clean layout without dashboard sidebar or bottom navigation
  if (isPublicOrAuthRoute) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] text-[#1F2A44] font-sans antialiased flex flex-col justify-between">
        {!isOnline && (
          <div className="bg-[#EF4477] text-white text-xs py-1.5 px-4 text-center font-bold flex items-center justify-center gap-2 sticky top-0 z-50">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline mode active: Cached tests and data remain accessible.</span>
          </div>
        )}
        <div className="flex-1">
          {children}
        </div>
      </div>
    );
  }

  // 3. Authenticated Dashboard Portal (Strictly Student or Strictly Teacher)
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FB] text-[#1F2A44] font-sans antialiased w-full max-w-full overflow-x-hidden">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-[#EF4477] text-white text-xs py-1.5 px-4 text-center font-bold flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline mode active: Cached tests and data remain accessible.</span>
        </div>
      )}

      {/* ============ MAIN SHELL CONTAINER ============ */}
      <div className="flex-1 flex w-full min-h-screen min-w-0 overflow-x-hidden">
        {/* ============ SIDEBAR (Desktop 240px) ============ */}
        <aside className="hidden md:flex flex-col w-[240px] shrink-0 bg-white border-r border-[#EEF1F6] p-4">
          {/* Logo Mark */}
          <Link
            to={isTeacher ? '/teacher/home' : '/student/home'}
            className="flex items-center gap-2.5 pb-4 mb-3 border-b border-[#EEF1F6]"
          >
            <div className="w-[38px] h-[38px] rounded-[10px] bg-[#2F6FED] flex items-center justify-center shrink-0 text-white shadow-xs">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 10 12 5 2 10l10 5 10-5Z" />
                <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
              </svg>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-[15px] leading-tight text-[#1F2A44] truncate">
                Dikjyoti
              </span>
              <span className="text-[10px] font-bold text-[#8A94A6] tracking-wider uppercase mt-0.5 truncate">
                {isTeacher ? 'FACULTY PORTAL' : 'STUDENT PORTAL'}
              </span>
            </div>
          </Link>

          {/* Role-Specific Navigation Menu */}
          <nav className="flex-1 space-y-1">
            {!isTeacher ? (
              /* STUDENT NAV ITEMS ONLY */
              <>
                <Link
                  to="/student/home"
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[9px] text-[13px] font-semibold transition-all ${
                    isActive('/student/home') && !location.search.includes('view=live')
                      ? 'bg-[#2F6FED] text-white shadow-xs'
                      : 'text-[#5A6478] hover:bg-[#F5F7FB] hover:text-[#1F2A44]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0 opacity-90" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/student/home?view=live"
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[9px] text-[13px] font-semibold transition-all ${
                    location.search.includes('view=live')
                      ? 'bg-[#2F6FED] text-white shadow-xs'
                      : 'text-[#5A6478] hover:bg-[#F5F7FB] hover:text-[#1F2A44]'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0 opacity-90" />
                  <span>Live Tests</span>
                </Link>

                <Link
                  to="/student/leaderboard"
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[9px] text-[13px] font-semibold transition-all ${
                    isActive('/student/leaderboard')
                      ? 'bg-[#2F6FED] text-white shadow-xs'
                      : 'text-[#5A6478] hover:bg-[#F5F7FB] hover:text-[#1F2A44]'
                  }`}
                >
                  <Trophy className="w-4 h-4 shrink-0 opacity-90" />
                  <span>Rankings</span>
                </Link>

                <Link
                  to="/student/history"
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[9px] text-[13px] font-semibold transition-all ${
                    isActive('/student/history')
                      ? 'bg-[#2F6FED] text-white shadow-xs'
                      : 'text-[#5A6478] hover:bg-[#F5F7FB] hover:text-[#1F2A44]'
                  }`}
                >
                  <History className="w-4 h-4 shrink-0 opacity-90" />
                  <span>History</span>
                </Link>

                <Link
                  to="/student/profile"
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[9px] text-[13px] font-semibold transition-all ${
                    isActive('/student/profile')
                      ? 'bg-[#2F6FED] text-white shadow-xs'
                      : 'text-[#5A6478] hover:bg-[#F5F7FB] hover:text-[#1F2A44]'
                  }`}
                >
                  <User className="w-4 h-4 shrink-0 opacity-90" />
                  <span>My Profile</span>
                </Link>

                <Link
                  to="/student/notifications"
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-[9px] text-[13px] font-semibold transition-all ${
                    isActive('/student/notifications')
                      ? 'bg-[#2F6FED] text-white shadow-xs'
                      : 'text-[#5A6478] hover:bg-[#F5F7FB] hover:text-[#1F2A44]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 shrink-0 opacity-90" />
                    <span>Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EF4477] text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </>
            ) : (
              /* TEACHER NAV ITEMS ONLY */
              <>
                <Link
                  to="/teacher/home"
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[9px] text-[13px] font-semibold transition-all ${
                    isActive('/teacher/home') && !location.search.includes('view=exams')
                      ? 'bg-[#2F6FED] text-white shadow-xs'
                      : 'text-[#5A6478] hover:bg-[#F5F7FB] hover:text-[#1F2A44]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0 opacity-90" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/teacher/home?view=exams"
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[9px] text-[13px] font-semibold transition-all ${
                    location.search.includes('view=exams')
                      ? 'bg-[#2F6FED] text-white shadow-xs'
                      : 'text-[#5A6478] hover:bg-[#F5F7FB] hover:text-[#1F2A44]'
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0 opacity-90" />
                  <span>Exams</span>
                </Link>

                <Link
                  to="/teacher/create-exam"
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[9px] text-[13px] font-semibold transition-all ${
                    isActive('/teacher/create-exam')
                      ? 'bg-[#2F6FED] text-white shadow-xs'
                      : 'text-[#5A6478] hover:bg-[#F5F7FB] hover:text-[#1F2A44]'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 shrink-0 opacity-90" />
                  <span>Create Exam</span>
                </Link>

                <Link
                  to="/teacher/csv"
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[9px] text-[13px] font-semibold transition-all ${
                    isActive('/teacher/csv')
                      ? 'bg-[#2F6FED] text-white shadow-xs'
                      : 'text-[#5A6478] hover:bg-[#F5F7FB] hover:text-[#1F2A44]'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0 opacity-90" />
                  <span>CSV Import/Export</span>
                </Link>

                <Link
                  to="/teacher/students"
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[9px] text-[13px] font-semibold transition-all ${
                    isActive('/teacher/students')
                      ? 'bg-[#2F6FED] text-white shadow-xs'
                      : 'text-[#5A6478] hover:bg-[#F5F7FB] hover:text-[#1F2A44]'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0 opacity-90" />
                  <span>Students</span>
                </Link>

                <Link
                  to="/teacher/analytics"
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[9px] text-[13px] font-semibold transition-all ${
                    isActive('/teacher/analytics')
                      ? 'bg-[#2F6FED] text-white shadow-xs'
                      : 'text-[#5A6478] hover:bg-[#F5F7FB] hover:text-[#1F2A44]'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 shrink-0 opacity-90" />
                  <span>Analytics</span>
                </Link>
              </>
            )}
          </nav>

          {/* Sidebar Footer Account & Logout */}
          <div className="pt-4 border-t border-[#EEF1F6] space-y-2">
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="w-8 h-8 rounded-full bg-[#E8F0FE] text-[#2F6FED] font-extrabold flex items-center justify-center text-xs shrink-0">
                {userInitials || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1F2A44] truncate">
                  {user?.displayName || 'User'}
                </p>
                <p className="text-[10px] text-[#8A94A6] truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-bold text-[#EF4477] hover:bg-[#FDE8ED] rounded-[9px] transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* ============ MAIN VIEWPORT ============ */}
        <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
          {/* Main Topbar Header (NO top tabs, clean header only) */}
          <header className="bg-white border-b border-[#EEF1F6] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden p-1.5 rounded-lg text-[#5A6478] hover:bg-[#F5F7FB]"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <h1 className="text-base sm:text-lg font-bold text-[#1F2A44] tracking-tight">
                {getPageTitle()}
              </h1>
            </div>

            {/* Center Search Input (hidden on small mobile screens) */}
            <div className="hidden sm:flex items-center bg-[#F5F7FB] rounded-[9px] px-3 py-1.5 w-[220px] lg:w-[280px] gap-2 text-xs text-[#8A94A6]">
              <Search className="w-3.5 h-3.5 shrink-0 text-[#8A94A6]" />
              <input
                type="text"
                placeholder={isTeacher ? 'Search students or exams...' : 'Search exams, tests...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-xs text-[#1F2A44] placeholder-[#8A94A6]"
              />
            </div>

            {/* Right Header Area: Notifications & User Profile Menu */}
            <div className="flex items-center gap-3">
              {!isTeacher && (
                <Link
                  to="/student/notifications"
                  className="relative text-[#8A94A6] hover:text-[#1F2A44] p-1.5 rounded-lg transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-[#EF4477] rounded-full ring-2 ring-white" />
                  )}
                </Link>
              )}

              {/* User Dropdown Menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 p-1 rounded-full sm:rounded-xl hover:bg-[#F5F7FB] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#E8F0FE] text-[#2F6FED] font-extrabold flex items-center justify-center text-xs shrink-0">
                    {userInitials || 'U'}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-[#1F2A44] line-clamp-1 max-w-[120px]">
                      {user?.displayName?.split(' ')[0] || 'User'}
                    </span>
                    <span className="text-[10px] text-[#8A94A6] font-semibold">
                      {isTeacher ? 'Faculty' : 'Student'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#8A94A6] hidden sm:inline" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-[#EEF1F6] shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-[#EEF1F6]">
                      <p className="text-xs font-bold text-[#1F2A44] truncate">
                        {user?.displayName || 'User'}
                      </p>
                      <p className="text-[11px] text-[#8A94A6] truncate">{user?.email}</p>
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#2F6FED]">
                        {userRoleLabel}
                      </span>
                    </div>

                    {!isTeacher && (
                      <Link
                        to="/student/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#5A6478] hover:bg-[#F5F7FB] hover:text-[#1F2A44]"
                      >
                        <User className="w-4 h-4" />
                        <span>My Profile</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-[#EF4477] hover:bg-[#FDE8ED] transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Content Body */}
          <main className="flex-1 p-3.5 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto pb-24 md:pb-8 min-w-0 overflow-x-hidden">
            {children}
          </main>

          {/* Monetag Ad Banner rendered on all pages with fresh remount key on every route transition */}
          <div className="pb-16 md:pb-4">
            <MonetagBannerAd key={adKey} refreshTrigger={transitionCount} />
          </div>
        </div>
      </div>

      {/* ============ MOBILE SIDEBAR DRAWER ============ */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-[260px] bg-white flex flex-col p-4 z-10 shadow-2xl h-full">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF1F6] mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#2F6FED] flex items-center justify-center text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 10 12 5 2 10l10 5 10-5Z" />
                    <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
                  </svg>
                </div>
                <span className="font-extrabold text-sm text-[#1F2A44]">Dikjyoti</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 rounded-md text-[#8A94A6] hover:bg-[#F5F7FB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {!isTeacher ? (
                /* Student Drawer Links */
                <>
                  <Link
                    to="/student/home"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-[#5A6478] hover:bg-[#F5F7FB]"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/student/home?view=live"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-[#5A6478] hover:bg-[#F5F7FB]"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Live Tests</span>
                  </Link>
                  <Link
                    to="/student/leaderboard"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-[#5A6478] hover:bg-[#F5F7FB]"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Rankings</span>
                  </Link>
                  <Link
                    to="/student/history"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-[#5A6478] hover:bg-[#F5F7FB]"
                  >
                    <History className="w-4 h-4" />
                    <span>History</span>
                  </Link>
                  <Link
                    to="/student/profile"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-[#5A6478] hover:bg-[#F5F7FB]"
                  >
                    <User className="w-4 h-4" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    to="/student/notifications"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-[#5A6478] hover:bg-[#F5F7FB]"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </Link>
                </>
              ) : (
                /* Teacher Drawer Links */
                <>
                  <Link
                    to="/teacher/home"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-[#5A6478] hover:bg-[#F5F7FB]"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/teacher/home?view=exams"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-[#5A6478] hover:bg-[#F5F7FB]"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Exams</span>
                  </Link>
                  <Link
                    to="/teacher/create-exam"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-[#5A6478] hover:bg-[#F5F7FB]"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Exam</span>
                  </Link>
                  <Link
                    to="/teacher/csv"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-[#5A6478] hover:bg-[#F5F7FB]"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>CSV Import</span>
                  </Link>
                  <Link
                    to="/teacher/students"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-[#5A6478] hover:bg-[#F5F7FB]"
                  >
                    <Users className="w-4 h-4" />
                    <span>Students</span>
                  </Link>
                  <Link
                    to="/teacher/analytics"
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-bold text-[#5A6478] hover:bg-[#F5F7FB]"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Analytics</span>
                  </Link>
                </>
              )}
            </nav>

            <div className="pt-3 border-t border-[#EEF1F6]">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-[#EF4477] hover:bg-[#FDE8ED] rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ PERSISTENT BOTTOM NAVIGATION (Mobile Only) ============ */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#EEF1F6] px-2 py-2 flex items-center justify-around shadow-[0_-4px_12px_rgba(0,0,0,0.04)]"
      >
        {!isTeacher ? (
          /* STUDENT MOBILE BOTTOM TABS ONLY */
          <>
            <Link
              to="/student/home"
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold ${
                isActive('/student/home') && !location.search.includes('view=live')
                  ? 'text-[#2F6FED]'
                  : 'text-[#8A94A6]'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/student/home?view=live"
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold ${
                location.search.includes('view=live')
                  ? 'text-[#2F6FED]'
                  : 'text-[#8A94A6]'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span>Live Tests</span>
            </Link>
            <Link
              to="/student/leaderboard"
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold ${
                isActive('/student/leaderboard') ? 'text-[#2F6FED]' : 'text-[#8A94A6]'
              }`}
            >
              <Trophy className="w-5 h-5" />
              <span>Rankings</span>
            </Link>
            <Link
              to="/student/history"
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold ${
                isActive('/student/history') ? 'text-[#2F6FED]' : 'text-[#8A94A6]'
              }`}
            >
              <History className="w-5 h-5" />
              <span>History</span>
            </Link>
            <Link
              to="/student/profile"
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold ${
                isActive('/student/profile') ? 'text-[#2F6FED]' : 'text-[#8A94A6]'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </Link>
          </>
        ) : (
          /* TEACHER MOBILE BOTTOM TABS ONLY */
          <>
            <Link
              to="/teacher/home"
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold ${
                isActive('/teacher/home') && !location.search.includes('view=exams')
                  ? 'text-[#2F6FED]'
                  : 'text-[#8A94A6]'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/teacher/home?view=exams"
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold ${
                location.search.includes('view=exams') ? 'text-[#2F6FED]' : 'text-[#8A94A6]'
              }`}
            >
              <Layers className="w-5 h-5" />
              <span>Exams</span>
            </Link>
            <Link
              to="/teacher/create-exam"
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold ${
                isActive('/teacher/create-exam') ? 'text-[#2F6FED]' : 'text-[#8A94A6]'
              }`}
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create</span>
            </Link>
            <Link
              to="/teacher/csv"
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold ${
                isActive('/teacher/csv') ? 'text-[#2F6FED]' : 'text-[#8A94A6]'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>CSV</span>
            </Link>
            <Link
              to="/teacher/students"
              className={`flex flex-col items-center gap-1 flex-1 text-[10px] font-bold ${
                isActive('/teacher/students') ? 'text-[#2F6FED]' : 'text-[#8A94A6]'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Students</span>
            </Link>
          </>
        )}
      </nav>
    </div>
  );
};
