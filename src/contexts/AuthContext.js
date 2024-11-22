import { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../firebase/config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  sendPasswordResetEmail,
  getAuth,
  sendEmailVerification
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '../firebase/config';

const AuthContext = createContext({});
const SESSION_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(null);

  const isAdmin = user?.email?.endsWith('@zenithadmin.com') || false;

  const startSessionTimer = () => {
    // Clear any existing timeout
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }

    // Set new timeout for 4 hours
    const timeout = setTimeout(() => {
      logout();
    }, SESSION_DURATION);

    setSessionTimeout(timeout);
  };

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password)
      .then(async (result) => {
        // Send verification email
        await sendEmailVerification(result.user);
        // Sign out until email is verified
        await signOut(auth);
        return result;
      });
  }

  function createUser(email, password) {
    const secondaryApp = initializeApp(firebaseConfig, 'secondary');
    const secondaryAuth = getAuth(secondaryApp);
    
    return createUserWithEmailAndPassword(secondaryAuth, email, password)
      .then((userCredential) => {
        deleteApp(secondaryApp);
        return userCredential;
      })
      .catch((error) => {
        deleteApp(secondaryApp);
        throw error;
      });
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
      .then(async (result) => {
        if (!result.user.emailVerified && !email.endsWith('@zenithadmin.com')) {
          await signOut(auth);
          throw new Error('Please verify your email before logging in');
        }
        
        startSessionTimer();
        return result;
      });
  }

  function logout() {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    return signOut(auth);
  }

  function changePassword(newPassword) {
    return updatePassword(auth.currentUser, newPassword);
  }

  function forgotPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  function isEmailVerified(user) {
    return user?.emailVerified || false;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        startSessionTimer();
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, []);

  const value = {
    user,
    isAdmin,
    signup,
    createUser,
    login,
    logout,
    changePassword,
    forgotPassword,
    isEmailVerified
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}