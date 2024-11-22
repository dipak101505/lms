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
    <div style={{ padding: '20px' }}>
      <h1>Live Stream</h1>
      
      {isAdmin ? (
        <div style={{ maxWidth: '500px', marginBottom: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Batch *
              <select
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                required
                style={{ width: '100%', padding: '8px' }}
                disabled={currentStreamId}
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

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Subject *
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                style={{ width: '100%', padding: '8px' }}
                disabled={currentStreamId}
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

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Centres *
              <select
                multiple
                name="centres"
                value={formData.centres}
                onChange={handleCentresChange}
                required
                style={{ width: '100%', padding: '8px', height: '120px' }}
                disabled={currentStreamId}
              >
                {centres.map(centre => (
                  <option key={centre.id} value={centre.name}>
                    {centre.name}
                  </option>
                ))}
              </select>
              <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                Hold Ctrl (Cmd on Mac) to select multiple centres
              </small>
            </label>
          </div>

          <button
            onClick={handleStreamToggle}
            style={{
              padding: '10px 20px',
              backgroundColor: currentStreamId ? '#dc2626' : '#0066FF',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%',
              marginBottom: '10px'
            }}
          >
            {currentStreamId ? 'Stop Streaming' : 'Start Streaming'}
          </button>
          <TwitchStream />
        </div>
      ) : (
        <>
          { (currentStreamData && canViewStream()) ? (
            <TwitchStream />
          ) : (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              {currentStreamData ? 
                "You don't have access to this stream." :
                "No active streams at the moment."
              }
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MeetingsPage;