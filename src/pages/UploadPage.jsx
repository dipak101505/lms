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

  const MAX_FILE_SIZE = 2*1024 * 1024 * 1024; // 1GB

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
      
      if (!selectedFile.type.startsWith('video/')) {
        setFileError('Please select a valid video file');
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
        partSize: 1024 * 1024 * 5,
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
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Upload Video</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Batch *
            <select
              name="batch"
              value={formData.batch}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
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

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Subject *
            <select
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
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

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Topic *
            <select
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="">Select Topic</option>
              {topics.map(topic => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
              <option value="new">+ Add New Topic</option>
            </select>
          </label>
        </div>

        {formData.topic === 'new' && (
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              New Topic Name *
              <input
                type="text"
                name="newTopic"
                value={formData.newTopic}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                placeholder="Enter new topic name"
              />
            </label>
          </div>
        )}

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Subtopic (optional)
            <input
              type="text"
              name="subtopic"
              value={formData.subtopic}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              placeholder="Enter subtopic name"
            />
          </label>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Video File * {file && <span>({formatFileSize(file.size)})</span>}
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            />
          </label>
          {fileError && (
            <p style={{ color: 'red', marginTop: '5px', fontSize: '14px' }}>
              {fileError}
            </p>
          )}
        </div>

        {uploadStatus === 'uploading' && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ 
              width: '100%', 
              height: '20px', 
              backgroundColor: '#f0f0f0',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: '#0066FF',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <div style={{ 
              textAlign: 'center', 
              marginTop: '5px',
              fontSize: '14px',
              color: '#666'
            }}>
              <div>{uploadProgress}%</div>
              <div>Speed: {formatFileSize(uploadSpeed)}/s</div>
              {timeRemaining && <div>Time remaining: {formatTime(timeRemaining)}</div>}
            </div>
            <button
              type="button"
              onClick={cancelUpload}
              style={{
                padding: '8px 15px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '10px',
                width: '100%'
              }}
            >
              Cancel Upload
            </button>
          </div>
        )}

        <button 
          type="submit"
          disabled={!file || uploadStatus === 'uploading'}
          style={{
            padding: '10px 20px',
            backgroundColor: (!file || uploadStatus === 'uploading') ? '#ccc' : '#0066FF',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: (!file || uploadStatus === 'uploading') ? 'default' : 'pointer'
          }}
        >
          {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Video'}
        </button>
      </form>
      
      {uploadStatus === 'success' && (
        <p style={{ color: 'green', marginTop: '10px' }}>Upload successful!</p>
      )}
      {uploadStatus === 'error' && (
        <p style={{ color: 'red', marginTop: '10px' }}>Upload failed. Please try again.</p>
      )}
      {uploadStatus === 'cancelled' && (
        <p style={{ color: '#dc3545', marginTop: '10px' }}>Upload cancelled</p>
      )}
    </div>
  );
}

export default UploadPage;