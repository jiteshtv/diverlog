import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Divers from './pages/Divers';
import Jobs from './pages/Jobs';
import LogDive from './pages/LogDive';
import DailyReport from './pages/DailyReport';
import DiveReport from './pages/DiveReport';
import Library from './pages/Library';
import UpdatePassword from './pages/UpdatePassword';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-deep-900 flex items-center justify-center text-ocean-300">Initialising...</div>;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/update-password" element={<UpdatePassword />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="divers" element={<Divers />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="log-dive" element={<LogDive />} />
            <Route path="reports" element={<DailyReport />} />
            <Route path="reports/:diveId" element={<DiveReport />} />
            <Route path="library" element={<Library />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
