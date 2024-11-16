import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">Video Platform</Link>
      </div>
      {user && <div className="nav-links">
        {isAdmin && <Link to="/meetings">Meetings</Link>}
        <Link to="/videos">Videos</Link>
        {isAdmin && <Link to="/upload">Upload</Link>}
      </div>}
      {user && <div className="nav-auth">
        {user ? (
          <div className="user-menu">
            <span>{user.email}</span>
            <Link to="/change-password">Change Password</Link>
            <button onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <div>
            <Link to="/login">Login</Link>
            
            <Link to="/signup">Sign Up</Link>
          </div>
        )}
      </div>}
    </nav>
  );
}

export default Navbar;