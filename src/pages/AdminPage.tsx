import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext.tsx';
import { api } from '../api/client.ts';
import { AdminPortal } from '../components/AdminPortal.tsx';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useStore();

  return (
    <AdminPortal
      onBackToShop={() => navigate('/')}
      currentUser={currentUser}
      onOpenAuth={() => {}}
      onAdminLogin={(adminUser) => setCurrentUser(adminUser)}
      apiClient={api}
    />
  );
};
