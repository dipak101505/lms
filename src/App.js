import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import MeetingsPage from './pages/MeetingsPage';
import UploadPage from './pages/UploadPage';
import VideoListPage from './pages/VideoListPage';
import VideoPlayer from './components/VideoPlayer';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import StudentManagementPage from './pages/StudentManagementPage';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import './styles/auth.css';
import AdminRoute from './components/AdminRoute';
import SignupPage from './pages/SignupPage';
import AttendancePage from './pages/AttendancePage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/" element={
              <PrivateRoute>
                <VideoListPage />
              </PrivateRoute>
            } />
            <Route path="/videos" element={
              <PrivateRoute>
                <VideoListPage />
              </PrivateRoute>
            } />
            <Route path="/upload" element={
              <AdminRoute>
                <UploadPage />
              </AdminRoute>
            } />
            <Route path="/meetings" element={
              <PrivateRoute>
                <MeetingsPage />
              </PrivateRoute>
            } />
            <Route path="/play/:videoKey" element={
              <PrivateRoute>
                <VideoPlayer />
              </PrivateRoute>
            } />
            <Route path="/students" element={
              <AdminRoute>
                <StudentManagementPage />
              </AdminRoute>
            } />
            <Route path="/attendance" element={
              <AdminRoute>
                <AttendancePage />
              </AdminRoute>
            } />
            <Route path="/change-password" element={
              <PrivateRoute>
                <ChangePasswordPage />
              </PrivateRoute>
            } />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;