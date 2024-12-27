import { useState, useRef, useEffect } from 'react';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from "@aws-sdk/lib-storage";
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { ref, uploadBytes, getDownloadURL, listAll, getMetadata, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebase/config';


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

  const MAX_FILE_SIZE = 2000 * 1024 * 1024; // 2000MB

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
    
    if (!selectedFile) {
      setFile(null);
      return;
    }

    const isPDF = selectedFile.type === 'application/pdf';
    const isVideo = selectedFile.type.startsWith('video/');

    if (!isPDF && !isVideo) {
      setFileError('Please upload a video or PDF file');
      setFile(null);
      return;
    }

    if (isPDF && selectedFile.size > 5 * 1024 * 1024) { // 50MB limit for PDFs
      setFileError('PDF file size must be less than 5MB');
      setFile(null);
      return;
    }

    if (isVideo && selectedFile.size > MAX_FILE_SIZE) { // 600MB limit for videos
      setFileError('Video file size must be less than 600MB');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setUploadProgress(0);
    setUploadSpeed(0);
    setTimeRemaining(null);
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
    
    // Get the effective topic (either selected topic or new topic)
    const effectiveTopic = formData.topic === 'new' ? formData.newTopic : formData.topic;
    
    if (!file || !formData.batch || !formData.subject || !effectiveTopic) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
      const fileName = `${formData.batch}_${formData.subject}_${effectiveTopic}_${formData.subtopic || 'untitled'}`;

      if (file.type === 'application/pdf') {
        // Upload PDF to Firebase Storage
        const storageRef = ref(storage, `pdfs/${fileName}.pdf`);
        
        // Create upload task with uploadBytesResumable
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        // Monitor upload progress
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          },
          (error) => {
            console.error('Upload error:', error);
            setUploadStatus('error');
            setUploadProgress(0);
            alert('Upload failed: ' + error.message);
          },
          async () => {
            // Upload completed successfully
            setUploadStatus('completed');
            setUploadProgress(100);
            setTimeout(() => {
              navigate('/videos');
            }, 1000);
          }
        );
      } else {
        // Video Upload using Bunny Stream (existing code)
        const createResponse = await fetch(
          `https://video.bunnycdn.com/library/359657/videos`,
          {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'AccessKey': 'a12e0bb1-1753-422b-8592a11c9c61-605b-46a8'
            },
            body: JSON.stringify({ title: fileName })
          }
        );

        if (!createResponse.ok) throw new Error('Failed to create video');
        const { guid } = await createResponse.json();

        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          uploadRef.current = xhr;

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100;
              setUploadProgress(Math.round(percentComplete));

              // Calculate upload speed
              const currentTime = Date.now();
              const timeElapsed = (currentTime - timeRef.current) / 1000;
              const bytesPerSecond = (event.loaded - lastUploadedRef.current) / timeElapsed;
              setUploadSpeed(bytesPerSecond);

              // Calculate time remaining
              const remainingBytes = event.total - event.loaded;
              const remainingTime = remainingBytes / bytesPerSecond;
              setTimeRemaining(remainingTime);

              timeRef.current = currentTime;
              lastUploadedRef.current = event.loaded;
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadStatus('success');
              resolve();
            } else {
              setUploadStatus('error');
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => {
            setUploadStatus('error');
            reject(new Error('Upload failed'));
          };

          xhr.onabort = () => {
            setUploadStatus('cancelled');
            reject(new Error('Upload cancelled'));
          };

          xhr.open('PUT', `https://video.bunnycdn.com/library/359657/videos/${guid}`);
          xhr.setRequestHeader('AccessKey', 'a12e0bb1-1753-422b-8592a11c9c61-605b-46a8');
          xhr.send(file);
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setUploadProgress(0);
      alert('Upload failed: ' + error.message);
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
              Video Title (optional)
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
              File * {file && <span>({formatFileSize(file.size)})</span>}
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
                accept="video/*,.pdf"
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
                      Drag and drop your video or PDF here or click to browse
                    </div>
                    <div style={{ color: '#718096', fontSize: '14px' }}>
                      Maximum file size: 600MB for videos, 5MB for PDFs
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
                      {file.type === 'application/pdf' ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffa600" strokeWidth="2">
                          <polygon points="23 7 16 12 23 17 23 7"></polygon>
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                      )}
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
            {uploadStatus === 'uploading' ? 'Uploading...' : `Upload ${file?.type === 'application/pdf' ? 'PDF' : 'Video'}`}
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