'use client';

import { useApp } from '@/contexts/AppContext';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import HostDashboard from '@/components/dashboard/HostDashboard';
import GuestDashboard from '@/components/dashboard/GuestDashboard';
import { useTranslation } from '@/hooks/useTranslation';

export default function DashboardPage() {
  const { state } = useApp();
  const user = state.user;
  const t = useTranslation('dashboard');

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{(t as any)?.loading?.spinner || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  // Render dashboard based on user role
  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  if (user.role === 'host') {
    return <HostDashboard />;
  }

  // Default to guest dashboard
  return <GuestDashboard />;
}