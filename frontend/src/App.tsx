import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './modules/auth/AuthContext';
import { LoginPage } from './modules/auth/LoginPage';
import { HomePage } from './modules/home/HomePage';
import { ClientsListPage } from './modules/clients/ClientsListPage';
import { CreateClientPage } from './modules/clients/CreateClientPage';
import { ProfilePage } from './modules/profile/ProfilePage';
import { ConfigPage } from './modules/config/ConfigPage';
import { CreditsListPage } from './modules/credits/CreditsListPage';
import { UsersListPage } from './modules/users/UsersListPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/clients" element={<ClientsListPage />} />
          <Route path="/clients/new" element={<CreateClientPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/credits" element={<CreditsListPage />} />
          <Route path="/users" element={<UsersListPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
