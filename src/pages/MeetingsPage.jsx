import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import TwitchStream from '../components/TwitchStream';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import Chat from '../components/Chat';

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
    topic: '',
    subtopic: '',
    startTime: new Date(),
  });
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const uploadRef = useRef(null);

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
        // Stop streaming - delete document and clear chat
        await deleteDoc(doc(db, 'streams', currentStreamId));
        await Chat.clearMessages(); // Clear all chat messages
        setCurrentStreamId(null);
        setShowUpload(true);
      } catch (error) {
        console.error('Error stopping stream:', error);
      }
    }
  };

  // Function to check if student has access to stream
  const canViewStream = () => {
    if (!studentData || !currentStreamData) return false;

    const hasMatchingBatch = studentData.batch.includes(currentStreamData.batch);
    const hasMatchingCentre = currentStreamData.centres.includes('All') || 
      studentData.centres.some(centre => currentStreamData.centres.includes(centre));
    const hasMatchingSubject = studentData.subjects?.includes(currentStreamData.subject);
    console.log(hasMatchingBatch, hasMatchingCentre, hasMatchingSubject);
    console.log(studentData);
    return hasMatchingBatch && hasMatchingCentre && hasMatchingSubject;
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      setUploadProgress(0);
      setUploadStatus(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    try {
      setUploadStatus('uploading');
      const s3Client = new S3Client({
        region: process.env.REACT_APP_AWS_REGION,
        credentials: {
          accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
        },
      });

      const key = `${currentStreamData.batch}/${currentStreamData.subject}/${currentStreamData.topic}/${currentStreamData.subtopic}`;

      // Create upload command with progress tracking
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: 'zenithvideo',
          Key: key,
          Body: uploadFile,
        },
        // Add progress tracking
        queueSize: 4,
        partSize: 1024 * 1024 * 5, // 5MB chunks
      });

      // Track upload progress
      upload.on("httpUploadProgress", (progress) => {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        setUploadProgress(percentage);
      });

      uploadRef.current = upload;
      await upload.done();

      setUploadStatus('success');
      setTimeout(() => {
        setShowUpload(false);
        setUploadFile(null);
        setUploadStatus(null);
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setUploadProgress(0);
    }
  };

  return (
    <div style={{
      paddingTop: '10px',
      padding: '32px',
      maxWidth: '1200px',
      margin: '10px auto',
      minHeight: '80vh',
      backgroundColor: '#f8f9fa'
    }}>

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
                  value={currentStreamData ? currentStreamData.batch : formData.batch}
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
                  value={currentStreamData ? currentStreamData.subject : formData.subject}
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

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#4a5568',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Topic *
                <input
                  type="text"
                  value={currentStreamData ? currentStreamData.topic : formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
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
                  placeholder="Enter topic for this class"
                />
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
                Subtopic *
                <input
                  type="text"
                  value={currentStreamData ? currentStreamData.subtopic : formData.subtopic}
                  onChange={(e) => setFormData({ ...formData, subtopic: e.target.value })}
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
                  placeholder="Enter subtopic for this class"
                />
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
                  value={currentStreamData ? currentStreamData.centres[0] : formData.centres[0]}
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
                  <option value="All">All Centres</option>
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
            !isAdmin && !canViewStream() ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: '#718096',
                fontSize: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                You don't have access to this stream. Please contact your administrator.
              </div>
            ) : (
              <>
                {!isAdmin && currentStreamData && canViewStream() && (
                  <div style={{
                    marginBottom: '20px',
                    paddingTop: '0px',
                    padding: '16px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '8px',
                    border: '1px solid #bae6fd',
                  }}>
                    <h2 style={{
                      fontSize: '20px',
                      color: '#0369a1',
                      marginBottom: '8px'
                    }}>
                      Current Class: {currentStreamData.subject}
                    </h2>
                    {currentStreamData.topic && (
                      <p style={{
                        fontSize: '16px',
                        color: '#0284c7',
                        margin: '0',
                        paddingLeft: '2px'
                      }}>
                       {currentStreamData.topic}: {currentStreamData.subtopic}
                      </p>
                    )}
                  </div>
                )}
                <TwitchStream />
                <Chat />
              </>
            )
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

      {showUpload && (
        <div style={{
          marginTop: '24px',
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ marginBottom: '16px', color: '#2d3748' }}>Upload Class Recording</h3>
          
          <div style={{
            border: '2px dashed #e0e0e0',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            marginBottom: '16px'
          }}>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="video-upload"
            />
            <label htmlFor="video-upload" style={{ cursor: 'pointer' }}>
              {!uploadFile ? (
                <>
                  <div style={{ marginBottom: '8px' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffa600" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div style={{ color: '#4a5568' }}>
                    Click to upload video recording
                  </div>
                </>
              ) : (
                <div style={{ color: '#4a5568' }}>
                  Selected: {uploadFile.name}
                </div>
              )}
            </label>
          </div>

          {uploadStatus === 'uploading' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#edf2f7',
                borderRadius: '2px'
              }}>
                <div style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  backgroundColor: '#ffa600',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!uploadFile || uploadStatus === 'uploading'}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: (!uploadFile || uploadStatus === 'uploading') ? '#cbd5e0' : '#ffa600',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (!uploadFile || uploadStatus === 'uploading') ? 'not-allowed' : 'pointer',
              fontSize: '15px'
            }}
          >
            {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Recording'}
          </button>

          {uploadStatus === 'success' && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#f0fff4',
              color: '#2f855a',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              Upload successful!
            </div>
          )}

          {uploadStatus === 'error' && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#fff5f5',
              color: '#e53e3e',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              Upload failed. Please try again.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MeetingsPage;
