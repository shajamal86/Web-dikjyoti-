import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { GraduationCap } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-xl bg-[#1B2A4A] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] mb-4 shadow-md animate-pulse">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div className="w-8 h-8 border-3 border-[#1B2A4A]/20 border-t-[#D4AF37] rounded-full animate-spin mb-3"></div>
        <h3 className="font-serif-heading text-lg font-bold text-[#1B2A4A]">
          Verifying Credentials...
        </h3>
        <p className="text-xs text-[#5A6B82] max-w-xs mt-1">
          Synchronizing your authenticated examination session with Dikjyoti secure database.
        </p>
      </div>
    );
  }

  if (!user) {
    const redirectPath = requiredRole === 'teacher' ? '/teacher/login' : '/student/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    const fallbackPath = user.role === 'teacher' ? '/teacher/home' : '/student/home';
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
