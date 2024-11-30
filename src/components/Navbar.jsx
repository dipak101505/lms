import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState('');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <nav style={{
      backgroundColor: 'white',
      padding: '12px 24px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Brand Logo */}
        <Link 
          to="/"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <img 
            src="/logo for website.png" 
            alt="Zenith Logo" 
            style={{
              height: '40px',
              width: 'auto'
            }}
          />
        </Link>

        {/* Navigation Links */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px'
          }}>
            {/* Main Navigation */}
            <div style={{
              display: 'flex',
              gap: '24px'
            }}>
              <Link
                to="/meetings"
                style={{
                  color: isHovered === 'meetings' ? '#ffa600' : '#4a5568',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: '500',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={() => setIsHovered('meetings')}
                onMouseLeave={() => setIsHovered('')}
              >
                Live Class
              </Link>
              <Link
                to="/videos"
                style={{
                  color: isHovered === 'videos' ? '#ffa600' : '#4a5568',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: '500',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={() => setIsHovered('videos')}
                onMouseLeave={() => setIsHovered('')}
              >
                Videos
              </Link>
              {isAdmin && (
                <>
                  <Link
                    to="/upload"
                    style={{
                      color: isHovered === 'upload' ? '#ffa600' : '#4a5568',
                      textDecoration: 'none',
                      fontSize: '15px',
                      fontWeight: '500',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={() => setIsHovered('upload')}
                    onMouseLeave={() => setIsHovered('')}
                  >
                    Upload
                  </Link>
                  <Link
                    to="/students"
                    style={{
                      color: isHovered === 'students' ? '#ffa600' : '#4a5568',
                      textDecoration: 'none',
                      fontSize: '15px',
                      fontWeight: '500',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={() => setIsHovered('students')}
                    onMouseLeave={() => setIsHovered('')}
                  >
                    Students
                  </Link>
                </>
              )}
            </div>

            {/* User Menu */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              borderLeft: '1px solid #e2e8f0',
              paddingLeft: '16px'
            }}>
              <Link
                to="/change-password"
                style={{
                  color: isHovered === 'password' ? '#ffa600' : '#4a5568',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: '500',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={() => setIsHovered('password')}
                onMouseLeave={() => setIsHovered('')}
              >
                Password
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isHovered === 'logout' ? 'white' : '#ffa600',
                  color: isHovered === 'logout' ? '#ffa600' : 'white',
                  border: '2px solid #ffa600',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={() => setIsHovered('logout')}
                onMouseLeave={() => setIsHovered('')}
              >
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}

        {/* Login Link for non-authenticated users */}
        {!user && (
          <Link
            to="/login"
            style={{
              color: isHovered === 'login' ? '#ffa600' : '#4a5568',
              textDecoration: 'none',
              fontSize: '15px',
              fontWeight: '500',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '2px solid #ffa600',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={() => setIsHovered('login')}
            onMouseLeave={() => setIsHovered('')}
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;