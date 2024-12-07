import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const { login, forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '100vh',
      gap: '2rem',
      padding: '0 2rem',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '0.5rem'
        }}>
          <img 
            src="logo for website.png" 
            alt="Logo" 
            style={{
              width: '120px',
              height: 'auto',
              marginBottom: '0.5rem'
            }}
          />
          <h3 style={{color: 'greyorange'}}>Hello There!</h3>
        </div>
        {error && <div className="error-message">{error}</div>}
        {resetSent && (
          <div className="success-message">
            Password reset link has been sent to your email!
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: isHovered ? 'white' : '#ffa600',
              color: isHovered ? '#ffa600' : 'white',
              border: isHovered ? '1px solid #ffa600' : 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <Link 
              to="/forgot-password" 
              style={{ 
                color: '#ffa600', 
                textDecoration: 'none'
              }}
            >
              Forgot Password?
            </Link>
          </div>
          <div>
            Don't have an account? {' '}
            <Link 
              to="/signup" 
              style={{ 
                color: '#ffa600', 
                textDecoration: 'none'
              }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      <div style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        <img 
          src="login.jpg" 
          alt="Login" 
          referrerPolicy="origin"
          style={{
            maxWidth: '80%',
            maxHeight: '80%',
            objectFit: 'contain',
            borderRadius: '8px'
          }}
        />
      </div>
    </div>
  );
}

export default LoginPage;