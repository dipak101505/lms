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
        <Link to="/">ZENITH</Link>
      </div>
      {user && <div className="nav-links">
        <Link to="/meetings">Meetings</Link>
        <Link to="/videos">Videos</Link>
        {isAdmin && (
          <>
            <Link to="/upload">Upload</Link>
            <Link to="/students">Students</Link>
          </>
        )}
      </div>}
      {user && <div className="nav-auth">
        {user ? (
          <div className="user-menu">
            <Link 
              to="/change-password" 
              style={{ 
                color: '#ffa600', 
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              Password
            </Link>
            <button 
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ffa600',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.color = '#ffa600';
                e.target.style.border = '1px solid #ffa600';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#ffa600';
                e.target.style.color = 'white';
                e.target.style.border = 'none';
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <Link 
            to="/login" 
            style={{ 
              color: '#ffa600', 
              textDecoration: 'none' 
            }}
          >
            Login
          </Link>
        )}
      </div>}
    </nav>
  );
}

export default Navbar;