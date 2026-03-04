import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Sidebar from './components/Sidebar';
import Groups from './components/Groups';
import Chat from './components/Chat';
import ChannelInfo from './pages/ChannelInfo';

export const ThemeContext = React.createContext();

// Layout Wrapper for consistent sidebar
const MainLayout = ({ children }) => (
  <div className="flex min-h-screen bg-background-dark text-white font-display overflow-hidden">
    <Sidebar />
    <main className="flex-1 h-screen overflow-hidden relative">
      {children}
    </main>
  </div>
);

// Wrapper for protected routes
const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('blackcore_user'));

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

function App() {
  const [themeColor, setThemeColor] = React.useState('#8a2ce2');

  React.useEffect(() => {
    document.documentElement.style.setProperty('--primary', themeColor);
    // Convert hex to rgba for glow
    const r = parseInt(themeColor.slice(1, 3), 16);
    const g = parseInt(themeColor.slice(3, 5), 16);
    const b = parseInt(themeColor.slice(5, 7), 16);
    document.documentElement.style.setProperty('--primary-glow', `rgba(${r}, ${g}, ${b}, 0.3)`);
  }, [themeColor]);

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Groups />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:groupId"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Chat />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/info/:groupId"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ChannelInfo />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
    </ThemeContext.Provider>
  );
}

export default App;
