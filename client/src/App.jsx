import { createContext, useContext, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api, getToken, setToken } from './lib/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import SubjectDetail from './pages/SubjectDetail';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function Layout({ children }) {
  const { user } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button onClick={() => nav('/')} className="flex items-center gap-2 text-lg font-bold text-brand-600">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white text-sm">A</span>
            Attendify
          </button>
          {user && (
            <div className="flex items-center gap-4 text-sm">
              <button onClick={() => nav('/')} className="hover:text-brand-600">Dashboard</button>
              <button onClick={() => nav('/subjects')} className="hover:text-brand-600">Subjects</button>
              <span className="text-slate-500">Hi, {user.name}</span>
              <button
                onClick={() => {
                  setToken(null);
                  nav('/login');
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const { user } = await api.get('/auth/me');
          setUser(user);
        } catch {
          setToken(null);
        }
      }
      setReady(true);
    })();
  }, []);

  return (
    <AuthCtx.Provider value={{ user, setUser, ready }}>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/subjects" element={<Protected><Subjects /></Protected>} />
          <Route path="/subjects/:id" element={<Protected><SubjectDetail /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AuthCtx.Provider>
  );
}
