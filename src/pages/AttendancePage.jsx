import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function AttendancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [batchesSnap, studentsSnap, subjectsSnap] = await Promise.all([
          getDocs(collection(db, 'batches')),
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'subjects'))
        ]);
        
        setBatches(batchesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
        
        setStudents(studentsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));

        setSubjects(subjectsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const checkBiometricSupport = async () => {
    if (!window.PublicKeyCredential) {
      alert('Biometric authentication is not supported by this browser');
      return false;
    }

    try {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        alert('Biometric authentication is not available on this device');
      }
      return available;
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return false;
    }
  };

  const verifyBiometric = async (student) => {
    setVerificationStatus(prev => ({
      ...prev,
      [student.id]: 'verifying'
    }));

    try {
      const supported = await checkBiometricSupport();
      if (!supported) {
        setVerificationStatus(prev => ({
          ...prev,
          [student.id]: 'failed'
        }));
        return;
      }

      // Generate a random challenge
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname,
        timeout: 60000,
        userVerification: "required"
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      if (assertion) {
        handleAttendanceToggle(student.id);
        setVerificationStatus(prev => ({
          ...prev,
          [student.id]: 'verified'
        }));
        
        // Clear status after 3 seconds
        setTimeout(() => {
          setVerificationStatus(prev => ({
            ...prev,
            [student.id]: null
          }));
        }, 3000);
      }
    } catch (error) {
      console.error('Biometric verification failed:', error);
      setVerificationStatus(prev => ({
        ...prev,
        [student.id]: 'failed'
      }));
      
      if (error.name === 'NotAllowedError') {
        alert('Biometric verification was denied');
      } else if (error.name === 'SecurityError') {
        alert('Biometric verification is not available in insecure context (requires HTTPS)');
      } else {
        alert('Biometric verification failed');
      }
    }
  };

  const handleAttendanceToggle = (studentId) => {
    setAttendanceList(prev => {
      const exists = prev.includes(studentId);
      if (exists) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSubmitAttendance = async () => {
    if (!selectedBatch || !selectedSubject) {
      alert('Please select both batch and subject');
      return;
    }

    try {
      const attendanceData = {
        batch: selectedBatch,
        subject: selectedSubject,
        date: Timestamp.fromDate(new Date(selectedDate)),
        presentStudents: attendanceList,
        createdAt: Timestamp.now(),
        createdBy: user.email
      };

      await addDoc(collection(db, 'attendance'), attendanceData);
      alert('Attendance submitted successfully!');
      setAttendanceList([]);
    } catch (error) {
      console.error('Error submitting attendance:', error);
      alert('Error submitting attendance');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px', textAlign: 'center' }}>Attendance Management</h1>
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <select 
          value={selectedBatch} 
          onChange={(e) => setSelectedBatch(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            flex: 1
          }}
        >
          <option value="">Select Batch</option>
          {batches.map(batch => (
            <option key={batch.id} value={batch.name}>{batch.name}</option>
          ))}
        </select>

        <select 
          value={selectedSubject} 
          onChange={(e) => setSelectedSubject(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            flex: 1
          }}
        >
          <option value="">Select Subject</option>
          {subjects.map(subject => (
            <option key={subject.id} value={subject.name}>{subject.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            flex: 1
          }}
        />
      </div>

      {selectedBatch && selectedSubject && (
        <div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {students
              .filter(student => student.batch === selectedBatch)
              .map(student => (
                <div 
                  key={student.id}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: attendanceList.includes(student.id) ? '#f0fff4' : 'white'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={attendanceList.includes(student.id)}
                    onChange={() => handleAttendanceToggle(student.id)}
                  />
                  <div>
                    <div style={{ fontWeight: '500' }}>{student.name}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{student.email}</div>
                  </div>
                  <button
                    onClick={() => verifyBiometric(student)}
                    disabled={verificationStatus[student.id] === 'verifying'}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 
                        verificationStatus[student.id] === 'verified' ? '#059669' :
                        verificationStatus[student.id] === 'failed' ? '#dc2626' :
                        verificationStatus[student.id] === 'verifying' ? '#d1d5db' :
                        '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginLeft: 'auto'
                    }}
                  >
                    {verificationStatus[student.id] === 'verifying' ? 'Verifying...' :
                     verificationStatus[student.id] === 'verified' ? 'Verified' :
                     verificationStatus[student.id] === 'failed' ? 'Try Again' :
                     'Verify'}
                  </button>
                </div>
              ))}
          </div>

          <button
            onClick={handleSubmitAttendance}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ffa600',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Submit Attendance
          </button>
        </div>
      )}
    </div>
  );
}

export default AttendancePage;