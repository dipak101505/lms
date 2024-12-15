import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import MeetingsPage from './pages/MeetingsPage';
import UploadPage from './pages/UploadPage';
import VideoListPage from './pages/VideoListPage';
import VideoPlayer from './components/VideoPlayer';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import StudentManagementPage from './pages/StudentManagementPage';
import SendVerificationEmail from './pages/SendVerificationEmail';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import './styles/auth.css';
import AdminRoute from './components/AdminRoute';
import SignupPage from './pages/SignupPage';
import AttendancePage from './pages/AttendancePage';
import ReceiptPage from './pages/ReceiptPage';
import PDFViewer from './components/PDFViewer';
import ExamPage from './pages/ExamPage';
import ExamInterfacePage from './pages/ExamInterfacePage';
import EditExamPage from './pages/EditExamPage';

// Create a wrapper component for Navbar
function NavbarWrapper() {
  const location = useLocation();
  
  // Don't show navbar on exam interface page
  if (location.pathname === '/exam-interface') {
    return null;
  }
  
  return <Navbar />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <NavbarWrapper />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/send-verification-email" element={<SendVerificationEmail />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/" element={
              <PrivateRoute>
                <VideoListPage />
              </PrivateRoute>
            } />
            <Route path="/pdf/:pdfKey" element={
              <PrivateRoute>
                <PDFViewer />
              </PrivateRoute>
            } />
            <Route path="/videos" element={
              <PrivateRoute>
                <VideoListPage />
              </PrivateRoute>
            } />
            <Route path="/exams" element={
              <PrivateRoute>
                <ExamPage />
              </PrivateRoute>
            } />
            <Route path="/exam-interface" element={
              <PrivateRoute>
                <ExamInterfacePage />
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
            <Route path="/receipt" element={
              <PrivateRoute>
                <ReceiptPage />
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
            <Route path="/edit-exam" element={
              <AdminRoute>
                <EditExamPage />
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