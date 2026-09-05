import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { StudentLoginPage } from './pages/student/StudentLoginPage';
import { StudentSignupPage } from './pages/student/StudentSignupPage';
import { StudentHomePage } from './pages/student/StudentHomePage';
import { StudentLeaderboardPage } from './pages/student/StudentLeaderboardPage';
import { StudentHistoryPage } from './pages/student/StudentHistoryPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';
import { StudentExamPage } from './pages/student/StudentExamPage';
import { StudentResultPage } from './pages/student/StudentResultPage';
import { StudentNotificationsPage } from './pages/student/StudentNotificationsPage';
import { CompleteProfileModal } from './components/student/CompleteProfileModal';
import { MonetagBannerAd } from './components/common/MonetagBannerAd';

import { TeacherLoginPage } from './pages/teacher/TeacherLoginPage';
import { TeacherSignupPage } from './pages/teacher/TeacherSignupPage';
import { TeacherHomePage } from './pages/teacher/TeacherHomePage';
import { TeacherCreateExamPage } from './pages/teacher/TeacherCreateExamPage';
import { TeacherAnalyticsPage } from './pages/teacher/TeacherAnalyticsPage';
import { TeacherStudentsPage } from './pages/teacher/TeacherStudentsPage';

import { AboutPage } from './pages/AboutPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-[#F8F7F4] text-[#1B2A4A] selection:bg-[#D4AF37]/20 selection:text-[#1B2A4A]">
          <Header />
          <main className="flex-1 pb-16 md:pb-0">
            <Routes>
              {/* Public & Role Selection */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />

              {/* Student Authentication */}
              <Route path="/student/login" element={<StudentLoginPage />} />
              <Route path="/student/signup" element={<StudentSignupPage />} />

              {/* Teacher Authentication */}
              <Route path="/teacher/login" element={<TeacherLoginPage />} />
              <Route path="/teacher/signup" element={<TeacherSignupPage />} />

              {/* Protected Student Routes */}
              <Route
                path="/student/home"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentHomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/leaderboard"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentLeaderboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/history"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/profile"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/notifications"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentNotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/exam/:examId"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentExamPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/result/:resultId"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentResultPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Teacher Routes */}
              <Route
                path="/teacher/home"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <TeacherHomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/create-exam"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <TeacherCreateExamPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/analytics"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <TeacherAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/students"
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <TeacherStudentsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <MonetagBannerAd />
          <Footer />
          <CompleteProfileModal />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
