import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import TwitchStream from '../components/TwitchStream';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function MeetingsPage() {
  const [currentStreamId, setCurrentStreamId] = useState(null);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [centres, setCentres] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [currentStreamData, setCurrentStreamData] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  console.log(user);
  const [formData, setFormData] = useState({
    batch: '',
    subject: '',
    centres: [],
    startTime: new Date(),
  });

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        logout();
        navigate('/login');
        return;
      }

      // Check if user is admin (email ends with zenithadmin.com)
      const isAdminUser = user.email.endsWith('@zenithadmin.com');
      setIsAdmin(isAdminUser);

      if (!isAdminUser) {
        // Fetch student data
        const studentQuery = query(
          collection(db, 'students'),
          where('email', '==', user.email)
        );
        const studentSnapshot = await getDocs(studentQuery);
        if (!studentSnapshot.empty) {
          setStudentData(studentSnapshot.docs[0].data());
        }
      }

      // Fetch current stream
      const streamQuery = query(
        collection(db, 'streams'),
        where('status', '==', 'active')
      );
      const streamSnapshot = await getDocs(streamQuery);
      if (!streamSnapshot.empty) {
        const streamDoc = streamSnapshot.docs[0];
        setCurrentStreamId(streamDoc.id);
        setCurrentStreamData(streamDoc.data());
      }

      // Only fetch form data if user is admin
      if (isAdminUser) {
        fetchData();
      }
    };

    checkAccess();
  }, [user, navigate]);

  const handleStreamToggle = async () => {
    if (!currentStreamId) {
      try {
        // Start streaming - create document
        const streamDoc = await addDoc(collection(db, 'streams'), {
          ...formData,
          startTime: new Date(),
          status: 'active'
        });
        setCurrentStreamId(streamDoc.id);
        setCurrentStreamData({ ...formData, status: 'active' });
      } catch (error) {
        console.error('Error starting stream:', error);
      }
    } else {
      try {
        // Stop streaming - delete document
        await deleteDoc(doc(db, 'streams', currentStreamId));
        setCurrentStreamId(null);
        setCurrentStreamData(null);
      } catch (error) {
        console.error('Error stopping stream:', error);
      }
    }
  };

  // Function to check if student has access to stream
  const canViewStream = () => {
    if (!studentData || !currentStreamData) return false;

    const hasMatchingBatch = studentData.batch === currentStreamData.batch;
    const hasMatchingCentre = studentData.centres.some(centre => 
      currentStreamData.centres.includes(centre)
    );

    return hasMatchingBatch && hasMatchingCentre;
  };

  const fetchData = async () => {
    try {
      // Fetch batches
      const batchesSnapshot = await getDocs(collection(db, 'batches'));
      setBatches(batchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      // Fetch subjects
      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      setSubjects(subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      // Fetch centres
      const centresSnapshot = await getDocs(collection(db, 'centres'));
      setCentres(centresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleCentresChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      centres: selectedOptions
    }));
  };

  return (
    <div style={{
      padding: '32px',
      maxWidth: '1200px',
      margin: '10px auto',
      minHeight: '80vh',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{
        marginBottom: '32px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '28px',
          color: '#2d3748',
          marginBottom: '12px',
          fontWeight: '600'
        }}>Live Class</h1>
        <p style={{
          color: '#718096',
          fontSize: '16px'
        }}>
          {isAdmin ? 'Manage your live class stream' : 'Join your scheduled live class'}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gap: '32px',
        gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr',
        alignItems: 'start'
      }}>
        {isAdmin && (
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#4a5568',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Batch *
                <select
                  value={formData.batch}
                  onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0',
                    backgroundColor: '#f8f9fa',
                    color: '#2d3748',
                    fontSize: '15px',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    cursor: currentStreamId ? 'not-allowed' : 'pointer'
                  }}
                  disabled={currentStreamId}
                  onFocus={(e) => {
                    if (!currentStreamId) {
                      e.target.style.borderColor = '#ffa600';
                      e.target.style.backgroundColor = 'white';
                      e.target.style.boxShadow = '0 0 0 3px rgba(255, 166, 0, 0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.backgroundColor = '#f8f9fa';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">Select Batch</option>
                  {batches.map(batch => (
                    <option key={batch.id} value={batch.name}>
                      {batch.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#4a5568',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Subject *
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0',
                    backgroundColor: '#f8f9fa',
                    color: '#2d3748',
                    fontSize: '15px',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    cursor: currentStreamId ? 'not-allowed' : 'pointer'
                  }}
                  disabled={currentStreamId}
                  onFocus={(e) => {
                    if (!currentStreamId) {
                      e.target.style.borderColor = '#ffa600';
                      e.target.style.backgroundColor = 'white';
                      e.target.style.boxShadow = '0 0 0 3px rgba(255, 166, 0, 0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.backgroundColor = '#f8f9fa';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.name}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#4a5568',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Centre *
                <select
                  value={formData.centres[0] || ''}
                  onChange={(e) => setFormData({ ...formData, centres: [e.target.value] })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0',
                    backgroundColor: '#f8f9fa',
                    color: '#2d3748',
                    fontSize: '15px',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    cursor: currentStreamId ? 'not-allowed' : 'pointer'
                  }}
                  disabled={currentStreamId}
                  onFocus={(e) => {
                    if (!currentStreamId) {
                      e.target.style.borderColor = '#ffa600';
                      e.target.style.backgroundColor = 'white';
                      e.target.style.boxShadow = '0 0 0 3px rgba(255, 166, 0, 0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.backgroundColor = '#f8f9fa';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">Select Centre</option>
                  {centres.map(centre => (
                    <option key={centre.id} value={centre.name}>
                      {centre.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              onClick={handleStreamToggle}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: currentStreamId ? '#dc2626' : '#ffa600',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
              }}
            >
              {currentStreamId ? 'Stop Streaming' : 'Start Streaming'}
            </button>

            {currentStreamId && (
              <div style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#f0fff4',
                borderRadius: '8px',
                border: '1px solid #9ae6b4',
                color: '#2f855a',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                Stream is currently active
              </div>
            )}
          </div>
        )}

        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          {currentStreamId ? (
            <TwitchStream />
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: '#718096',
              fontSize: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              {isAdmin ? 
                'Start streaming to begin the class' : 
                'The class has not started yet. Please refresh the page in 5 minutes.'
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MeetingsPage;