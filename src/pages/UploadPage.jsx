import { useState, useRef, useEffect } from 'react';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from "@aws-sdk/lib-storage";
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';


function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    batch: '',
    subject: '',
    topic: '',
    subtopic: '',
  });
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState('');
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const uploadRef = useRef(null);
  const lastUploadedRef = useRef(0);
  const timeRef = useRef(Date.now());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const batchesSnapshot = await getDocs(collection(db, 'batches'));
        const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
        
        setBatches(batchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
        
        setSubjects(subjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchTopics = async () => {
      console.log('fetchTopics called with:', { batch: formData.batch, subject: formData.subject });

      if (formData.batch && formData.subject) {
        try {
          const s3Client = new S3Client({
            region: process.env.REACT_APP_AWS_REGION,
            credentials: {
              accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
            },
            headers: {
              'Referer': window.location.origin
            }
          });

          debugger;

          const command = new ListObjectsV2Command({
            Bucket: 'zenithvideo',
            Prefix: `${formData.batch}/${formData.subject}/`
          });

          const response = await s3Client.send(command);
          const uniqueTopics = new Set();
          
          response.Contents?.forEach(item => {
            const parts = item.Key.split('/');
            if (parts.length >= 3) {
              uniqueTopics.add(parts[2]);
            }
          });

          setTopics(Array.from(uniqueTopics));
        } catch (error) {
          console.error('Error fetching topics:', error);
        }
      }
    };

    fetchTopics();
  }, [formData.batch, formData.subject]);

  if (!user) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Please log in to upload videos</p>
        <button onClick={() => navigate('/login')}>
          Go to Login
        </button>
      </div>
    );
  }

  const MAX_FILE_SIZE = 600 * 1024 * 1024; // 600MB

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFileError('');
    
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setFileError(`File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`);
        setFile(null);
        e.target.value = null;
        return;
      }
      
      const allowedTypes = ['video/mp4', 'video/mkv', 'video/x-matroska'];
      if (!allowedTypes.includes(selectedFile.type) && 
          !selectedFile.name.toLowerCase().endsWith('.mkv')) {
        setFileError('Please select a valid video file (MP4 or MKV)');
        setFile(null);
        e.target.value = null;
        return;
      }
      
      setFile(selectedFile);
      setUploadProgress(0);
      setUploadSpeed(0);
      setTimeRemaining(null);
    }
  };

  const handleInputChange = (e) => {
    debugger;
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Clear topic-related fields when batch or subject changes
      ...(name === 'batch' || name === 'subject' ? { topic: '', newTopic: '' } : {})
    }));
  };


  const cancelUpload = () => {
    if (uploadRef.current) {
      uploadRef.current.abort();
      setUploadStatus('cancelled');
      setUploadProgress(0);
      setUploadSpeed(0);
      setTimeRemaining(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !formData.batch || !formData.subject || !formData.topic) {
      alert('Please fill all required fields');
      return;
    }

    // Check if topic is "new" but newTopic is empty
    if (formData.topic === 'new' && !formData.newTopic) {
      alert('Please enter a new topic name');
      return;
    }

    try {
      setUploadStatus('uploading');
      const s3Client = new S3Client({
        region: process.env.REACT_APP_AWS_REGION,
        credentials: {
          accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
        },
        headers: {
          'Referer': window.location.origin
        }
      });

      const topicToUse = formData.topic === 'new' ? formData.newTopic : formData.topic;

      const folderPath = `${formData.batch}/${formData.subject}/${topicToUse}`;
      const fileName = formData.subtopic ? 
        `${formData.subtopic}-${Date.now()}.mp4` : 
        `${Date.now()}.mp4`;

      const parallelUploads3 = new Upload({
        client: s3Client,
        params: {
          Bucket: 'zenithvideo',
          Key: `${folderPath}/${fileName}`,
          Body: file,
          ContentType: file.type,
        },
        queueSize: 4,
        partSize: 1024 * 1024 * 10,
      });

      uploadRef.current = parallelUploads3;
      lastUploadedRef.current = 0;
      timeRef.current = Date.now();

      parallelUploads3.on("httpUploadProgress", (progress) => {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        setUploadProgress(percentage);

        const currentTime = Date.now();
        const timeDiff = (currentTime - timeRef.current) / 1000;
        const bytesDiff = progress.loaded - lastUploadedRef.current;
        const speed = bytesDiff / timeDiff;
        setUploadSpeed(speed);

        const remainingBytes = progress.total - progress.loaded;
        const timeRemainingSeconds = remainingBytes / speed;
        setTimeRemaining(timeRemainingSeconds);

        lastUploadedRef.current = progress.loaded;
        timeRef.current = currentTime;
      });

      await parallelUploads3.done();
      setUploadStatus('success');
      resetForm();
    } catch (error) {
      if (error.name === 'AbortError') {
        setUploadStatus('cancelled');
      } else {
        console.error('Upload error:', error);
        setUploadStatus('error');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      batch: '',
      subject: '',
      topic: '',
      subtopic: '',
    });
    setFile(null);
    setUploadProgress(0);
    setUploadSpeed(0);
    setTimeRemaining(null);
    uploadRef.current = null;
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{
        marginBottom: '24px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '24px',
          color: '#2d3748',
          margin: '0px',
          fontWeight: '600'
        }}>Upload Video</h1>
        <p style={{
          color: '#718096',
          fontSize: '15px',
          margin: '0px'
        }}>
          Upload educational content for your students
        </p>
      </div>

      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
        maxWidth: '700px',
        margin: '0 auto'
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '12px'
          }}>
            {/* Batch Selection */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#4a5568',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Batch *
              </label>
              <select
                name="batch"
                value={formData.batch}
                onChange={handleInputChange}
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
                  cursor: 'pointer'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ffa600';
                  e.target.style.backgroundColor = 'white';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 166, 0, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">Select Batch</option>
                {batches.map(batch => (
                  <option key={batch.id} value={batch.name}>{batch.name}</option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#4a5568',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Subject *
              </label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
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
                  cursor: 'pointer'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ffa600';
                  e.target.style.backgroundColor = 'white';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 166, 0, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.name}>{subject.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Topic Selection */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4a5568',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Topic *
            </label>
            <select
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
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
                cursor: 'pointer'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ffa600';
                e.target.style.backgroundColor = 'white';
                e.target.style.boxShadow = '0 0 0 3px rgba(255, 166, 0, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.backgroundColor = '#f8f9fa';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="">Select Topic</option>
              {topics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
              <option value="new">+ Add New Topic</option>
            </select>
          </div>

          {/* New Topic Input */}
          {formData.topic === 'new' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#4a5568',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                New Topic Name *
              </label>
              <input
                type="text"
                name="newTopic"
                value={formData.newTopic}
                onChange={handleInputChange}
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
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ffa600';
                  e.target.style.backgroundColor = 'white';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 166, 0, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Enter new topic name"
              />
            </div>
          )}

          {/* Subtopic Input */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4a5568',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Subtopic (optional)
            </label>
            <input
              type="text"
              name="subtopic"
              value={formData.subtopic}
              onChange={handleInputChange}
              style={{
                width: '95%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #e0e0e0',
                  backgroundColor: '#f8f9fa',
                  color: '#2d3748',
                  fontSize: '15px',
                  transition: 'all 0.2s ease',
                  outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ffa600';
                e.target.style.backgroundColor = 'white';
                e.target.style.boxShadow = '0 0 0 3px rgba(255, 166, 0, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.backgroundColor = '#f8f9fa';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="Enter subtopic name"
            />
          </div>

          {/* File Upload */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4a5568',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Video File * {file && <span>({formatFileSize(file.size)})</span>}
            </label>
            <div style={{
              border: '2px dashed #e0e0e0',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = '#ffa600';
              e.currentTarget.style.backgroundColor = 'white';
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.backgroundColor = '#f8f9fa';
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile) handleFileChange({ target: { files: [droppedFile] } });
            }}
            >
              <input
                type="file"
                accept="video/mp4,video/x-matroska,.mkv,video/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="video-upload"
              />
              <label htmlFor="video-upload" style={{ cursor: 'pointer' }}>
                {!file ? (
                  <>
                    <div style={{ marginBottom: '8px' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffa600" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div style={{ color: '#4a5568', marginBottom: '4px' }}>
                      Drag and drop your video here or click to browse
                    </div>
                    <div style={{ color: '#718096', fontSize: '14px' }}>
                      Maximum file size: 600MB
                    </div>
                  </>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      color: '#2d3748',
                      fontSize: '15px',
                      fontWeight: '500'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffa600" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                      {file.name}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                        document.getElementById('video-upload').value = '';
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'transparent',
                        color: '#e53e3e',
                        border: '1px solid #e53e3e',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#fff5f5';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      Remove File
                    </button>
                  </div>
                )}
              </label>
            </div>
            {fileError && (
              <div style={{
                color: '#e53e3e',
                fontSize: '14px',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {fileError}
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploadStatus === 'uploading' && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#edf2f7',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  backgroundColor: '#ffa600',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                color: '#718096',
                fontSize: '14px'
              }}>
                <div>{uploadProgress}%</div>
                <div>Speed: {formatFileSize(uploadSpeed)}/s</div>
                {timeRemaining && <div>Time remaining: {formatTime(timeRemaining)}</div>}
              </div>
              <button
                type="button"
                onClick={cancelUpload}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#fff',
                  color: '#dc3545',
                  border: '2px solid #dc3545',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginTop: '16px',
                  fontSize: '15px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#dc3545';
                  e.target.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#fff';
                  e.target.style.color = '#dc3545';
                }}
              >
                Cancel Upload
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || uploadStatus === 'uploading'}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: (!file || uploadStatus === 'uploading') ? '#cbd5e0' : '#ffa600',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (!file || uploadStatus === 'uploading') ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              marginTop: '8px'
            }}
            onMouseEnter={(e) => {
              if (file && uploadStatus !== 'uploading') {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 6px rgba(255, 166, 0, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Video'}
          </button>
        </form>

        {/* Status Messages */}
        {uploadStatus === 'success' && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f0fff4',
            color: '#2f855a',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '14px'
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
            textAlign: 'center',
            fontSize: '14px'
          }}>
            Upload failed. Please try again.
          </div>
        )}
        {uploadStatus === 'cancelled' && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#fff5f5',
            color: '#e53e3e',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            Upload cancelled
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadPage;