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
import AdminFranchiseRoute from './components/AdminFranchiseRoute';
import SignupPage from './pages/SignupPage';
import AttendancePage from './pages/AttendancePage';
import ReceiptPage from './pages/ReceiptPage';
import PDFViewer from './components/PDFViewer';
import ExamPage from './pages/ExamPage';
import ExamInterfacePage from './pages/ExamInterfacePage';
import EditExamPage from './pages/EditExamPage';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

// Create a wrapper component for Navbar
function NavbarWrapper() {
  const location = useLocation();
  
  // Don't show navbar on exam interface page
  if (location.pathname && location.pathname.includes('exam-interface')) {
    return null;
  }
  
  return <Navbar />;
}

function App() {
  return (
    <AuthProvider>
        <Toaster 
        position="bottom-left"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#333',
            color: '#fff',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          success: {
            icon: '✅',
          },
          error: {
            icon: '❌',
          },
          // Add close button to each toast
          onClick: (t) => toast.dismiss(t.id)
        }}
      />
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
            <Route path="/exam-interface/:examId" element={
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
              <AdminFranchiseRoute>
                <ReceiptPage />
              </AdminFranchiseRoute>
            } />
            <Route path="/students" element={
              <AdminFranchiseRoute>
                <StudentManagementPage />
              </AdminFranchiseRoute>
            } />
            <Route path="/attendance" element={
              <AdminFranchiseRoute>
                <AttendancePage />
              </AdminFranchiseRoute>
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