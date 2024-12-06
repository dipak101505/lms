import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

function AttendancePage() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState({});

  // Fetch initial data
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

  const startCamera = async (studentId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      videoRef.current.srcObject = stream;
      setIsCameraActive(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Error accessing camera');
    }
  };

  const capturePhoto = async (student) => {
    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      // Draw the current video frame
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      
      // Upload to Firebase Storage
      const fileName = `attendance-photos/${selectedDate}/${selectedBatch}/${student.id}-${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, blob);
      const photoUrl = await getDownloadURL(snapshot.ref);
      
      // Store URL and mark attendance
      setCapturedPhotos(prev => ({
        ...prev,
        [student.id]: photoUrl
      }));
      handleAttendanceToggle(student.id);
      
      // Stop camera
      stopCamera();
    } catch (error) {
      console.error('Error capturing photo:', error);
      alert('Error capturing photo');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
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
        presentStudents: attendanceList.map(studentId => ({
          studentId,
          photoUrl: capturedPhotos?.[studentId] || ''
        })),
        createdAt: Timestamp.now(),
        createdBy: user.email,
        capturedPhotos: capturedPhotos || [],
      };
      console.log(attendanceData);
      await addDoc(collection(db, 'attendance'), attendanceData);
      alert('Attendance submitted successfully!');
      setAttendanceList([]);
      setCapturedPhotos({});
    } catch (error) {
      console.error('Error submitting attendance:', error);
      alert('Error submitting attendance');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px', textAlign: 'center' }}>Attendance Management</h1>
      
      {/* Batch, Subject, Date selectors */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <select 
          value={selectedBatch} 
          onChange={(e) => setSelectedBatch(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            flex: 1,
            fontSize: '16px'
          }}
        >
          <option value="">Select Batch</option>
          {batches.map(batch => (
            <option key={batch.id} value={batch.name}>
              {batch.name}
            </option>
          ))}
        </select>

        <select 
          value={selectedSubject} 
          onChange={(e) => setSelectedSubject(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            flex: 1,
            fontSize: '16px'
          }}
        >
          <option value="">Select Subject</option>
          {subjects.map(subject => (
            <option key={subject.id} value={subject.name}>
              {subject.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            flex: 1,
            fontSize: '16px'
          }}
        />
      </div>

      {selectedBatch && selectedSubject && (
        <div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ 
              display: isCameraActive ? 'block' : 'none',
              width: '100%',
              maxWidth: '500px',
              margin: '20px auto'
            }}
          />
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {students
              .filter(student => 
                student.batch === selectedBatch && 
                student.status === 'active' &&
                student.subjects?.includes(selectedSubject)
              )
              .map(student => (
                <div key={student.id} style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: attendanceList.includes(student.id) ? '#f0fff4' : 'white'
                }}>
                  <input
                    type="checkbox"
                    checked={attendanceList.includes(student.id)}
                    onChange={() => handleAttendanceToggle(student.id)}
                  />
                  <div>
                    <div style={{ fontWeight: '500' }}>{student.name}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{student.email}</div>
                  </div>
                  {capturedPhotos[student.id] ? (
                    <img 
                      src={capturedPhotos[student.id]} 
                      alt="Attendance" 
                      style={{ 
                        width: '60px', 
                        height: '60px', 
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginLeft: 'auto'
                      }} 
                    />
                  ) : (
                    <button
                      onClick={() => isCameraActive ? capturePhoto(student) : startCamera(student.id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                      }}
                    >
                      {isCameraActive ? 'Capture' : 'Take Photo'}
                    </button>
                  )}
                </div>
              ))}
          </div>

          {students.filter(student => 
            student.batch === selectedBatch && 
            student.status === 'active' &&
            student.subjects?.includes(selectedSubject)
          ).length === 0 && (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              color: '#4b5563',
              fontSize: '16px'
            }}>
              No active students found for this batch and subject.
            </div>
          )}

          {students.filter(student => 
            student.batch === selectedBatch && 
            student.status === 'active' &&
            student.subjects?.includes(selectedSubject)
          ).length > 0 && (
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
          )}
        </div>
      )}
    </div>
  );
}

export default AttendancePage;