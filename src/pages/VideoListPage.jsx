import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

function VideoListPage() {
  const { user, isAdmin } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [studentData, setStudentData] = useState(null);

  // Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user || isAdmin) return;
      
      try {
        const studentsRef = collection(db, 'students');
        const q = query(studentsRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const studentDoc = querySnapshot.docs[0];
          const data = studentDoc.data();
          setStudentData({
            id: studentDoc.id,
            ...data
          });

          // If student is inactive, set error
          if (data.status !== 'active') {
            setError('Your account is currently inactive. Please contact administrator.');
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching student data:', err);
        setError('Failed to fetch student data');
      }
    };

    fetchStudentData();
  }, [user, isAdmin]);

  // Only fetch videos if student is active
  useEffect(() => {
    const fetchVideos = async () => {
      // Skip if student is inactive
      if (!isAdmin && (!studentData || studentData.status !== 'active')) {
        return;
      }

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

        const command = new ListObjectsV2Command({
          Bucket: 'zenithvideo',
        });

        const response = await s3Client.send(command);
        let files = response.Contents.filter(item => 
          item.Key.endsWith('.mp4') || item.Key.endsWith('.pdf')
        ).map(item => ({
          name: item.Key,
          lastModified: item.LastModified,
          size: (item.Size / 1024 / 1024).toFixed(2),
          storageClass: item.StorageClass,
          type: item.Key.endsWith('.pdf') ? 'pdf' : 'video'
        }));

        // Filter videos based on student's batch and subjects if not admin
        if (!isAdmin && studentData) {
          files = files.filter(file => {
            const [batch, subject] = file.name.split('/');
            return studentData.batch === batch && 
                   studentData.subjects?.includes(subject);
          });
        }

        setVideos(files);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    // Only fetch videos if admin or active student
    if (isAdmin || (studentData && studentData.status === 'active')) {
      fetchVideos();
    }
  }, [isAdmin, studentData]);

  const handleDelete = async (videoKey) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

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

      const command = new DeleteObjectCommand({
        Bucket: 'zenithvideo',
        Key: videoKey,
      });

      await s3Client.send(command);
      setVideos(prevVideos => prevVideos.filter(v => v.name !== videoKey));
    } catch (err) {
      console.error('Error deleting video:', err);
      alert('Failed to delete video: ' + err.message);
    }
  };

  // Organize videos into hierarchical structure based on user role
  const organizeVideos = () => {
    const structure = {};
    
    videos.forEach(video => {
      const [batch, subject, topic, filename] = video.name.split('/');
      
      if (isAdmin) {
        // Admin view - show all levels including batch
        if (!structure[batch]) structure[batch] = {};
        if (!structure[batch][subject]) structure[batch][subject] = {};
        if (!structure[batch][subject][topic]) structure[batch][subject][topic] = [];
        
        structure[batch][subject][topic].push({
          ...video,
          filename
        });
      } else {
        // Student view - skip batch level
        if (!structure[subject]) structure[subject] = {};
        if (!structure[subject][topic]) structure[subject][topic] = [];
        
        structure[subject][topic].push({
          ...video,
          filename
        });
      }
    });

    return structure;
  };

  const toggleSection = (path) => {
    setExpandedSections(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const formatVideoName = (filename) => {
    // Remove the extension first
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    
    // Find the last occurrence of hyphen and take everything before it
    const lastHyphenIndex = nameWithoutExt.lastIndexOf('-');
    const name = lastHyphenIndex !== -1 
      ? nameWithoutExt.substring(0, lastHyphenIndex) 
      : nameWithoutExt;
    
    // Capitalize first letter of each word
    return name
      .split(/[_]/)  // Only split by underscores, keeping hyphens in the name
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const checkVideoViewLimit = async (videoName, userEmail) => {
    try {
      const viewsRef = collection(db, 'videoViews');
      const q = query(viewsRef, where('userEmail', '==', userEmail));
      const snapshot = await getDocs(q);
      
      // Filter views for this video in the last 7 days
      const now = new Date();
      const weekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
      
      const recentViews = snapshot.docs
        .map(doc => doc.data())
        .filter(view => 
          view.videoName === videoName && 
          view.viewedAt.toMillis() > weekAgo
        );

      return recentViews.length < 2;
    } catch (error) {
      console.error('Error checking view limit:', error);
      return true; // Allow view on error
    }
  };

  const formatFileName = (filename) => {
    // Remove the extension first
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    
    // Find the last occurrence of hyphen and take everything before it
    const lastHyphenIndex = nameWithoutExt.lastIndexOf('-');
    const name = lastHyphenIndex !== -1 
      ? nameWithoutExt.substring(0, lastHyphenIndex) 
      : nameWithoutExt;
    
    // Capitalize first letter of each word
    return name
      .split(/[_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const FileItem = ({ file, isAdmin, handleDelete, user }) => {
    const isPdf = file.type === 'pdf';
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div
        style={{
          padding: '10px',
          marginTop: '5px',
          backgroundColor: isHovered ? '#f8f9fa' : '#fff',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: isHovered ? '0 2px 4px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease-in-out',
          border: `1px solid ${isHovered ? '#e2e8f0' : 'transparent'}`
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link 
          to={file.storageClass === 'DEEP_ARCHIVE' ? '#' : 
              isPdf ? `/pdf/${encodeURIComponent(file.name)}` :
              `/play/${encodeURIComponent(file.name)}`}
          style={{
            textDecoration: 'none',
            width: '100%',
            cursor: file.storageClass === 'DEEP_ARCHIVE' ? 'not-allowed' : 'pointer',
            opacity: file.storageClass === 'DEEP_ARCHIVE' ? 0.6 : 1,
          }}
          onClick={async (e) => {
            if (file.storageClass === 'DEEP_ARCHIVE') {
              e.preventDefault();
              alert('Please contact administrator for access.');
              return;
            }

            if (isPdf) {
              // For PDFs, open in new tab
              e.preventDefault();
              window.open(`/pdf/${encodeURIComponent(file.name)}`, '_blank');
              return;
            }

            // Video view limit logic
            e.preventDefault();
            const canView = await checkVideoViewLimit(file.name, user.email);
            if (!canView) {
              alert('You have reached the maximum views (2) for this video this week. Please try again next week or contact administrator.');
              return;
            }

            await addDoc(collection(db, 'videoViews'), {
              videoName: file.name,
              userEmail: user.email,
              viewedAt: Timestamp.now()
            });

            window.location.href = `/play/${encodeURIComponent(file.name)}`;
          }}
        >
          <div>
            <div style={{ 
              fontSize: '14px', 
              color: isHovered ? '#2d3748' : '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'color 0.2s ease-in-out'
            }}>
              {isPdf ? (
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke={isHovered ? '#dc2626' : '#ff0000'} 
                  strokeWidth="2"
                  style={{ transition: 'stroke 0.2s ease-in-out' }}
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              ) : (
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke={isHovered ? '#d97706' : '#ffa600'} 
                  strokeWidth="2"
                  style={{ transition: 'stroke 0.2s ease-in-out' }}
                >
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
              )}
              {formatFileName(file.filename)}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: isHovered ? '#4a5568' : '#666', 
              marginTop: '4px',
              transition: 'color 0.2s ease-in-out'
            }}>
              Size: {file.size} MB | 
              Last Modified: {new Date(file.lastModified).toLocaleString()}
            </div>
          </div>
        </Link>
        {isAdmin && (
          <button
            onClick={() => handleDelete(file.name)}
            style={{
              padding: '6px 12px',
              backgroundColor: isHovered ? '#c82333' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              marginLeft: '10px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
          >
            Delete
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading videos...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#dc2626',
        backgroundColor: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        margin: '20px',
        fontSize: '16px'
      }}>
        {error}
      </div>
    );
  }

  if (!isAdmin && (!studentData || studentData.status !== 'active')) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#dc2626',
        backgroundColor: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        margin: '20px',
        fontSize: '16px'
      }}>
        Your account is currently inactive. Please contact administrator.
      </div>
    );
  }

  const videoStructure = organizeVideos();

  return (
    <div style={{ padding: '20px' }}>
      <h1>Video Library</h1>
      
      <div style={{ marginTop: '20px' }}>
        {isAdmin ? (
          // Admin View - With Batch Level
          Object.entries(videoStructure).map(([batch, subjects]) => (
            <div key={batch} className="batch-section" style={{ marginBottom: '20px' }}>
              <div 
                onClick={() => toggleSection(batch)}
                style={{
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 'bold'
                }}
              >
                <span style={{ 
                  transform: expandedSections[batch] ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                  display: 'inline-block',
                  marginRight: '10px'
                }}>▶</span>
                {batch}
              </div>
              
              {expandedSections[batch] && (
                <div style={{ marginLeft: '20px' }}>
                  {Object.entries(subjects).map(([subject, topics]) => (
                    <div key={subject} style={{ marginTop: '10px' }}>
                      <div 
                        onClick={() => toggleSection(`${batch}/${subject}`)}
                        style={{
                          padding: '8px',
                          backgroundColor: '#fff',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          fontWeight: '500'
                        }}
                      >
                        <span style={{ 
                          transform: expandedSections[`${batch}/${subject}`] ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s',
                          display: 'inline-block',
                          marginRight: '10px'
                        }}>▶</span>
                        {subject}
                      </div>
                      
                      {expandedSections[`${batch}/${subject}`] && (
                        <div style={{ marginLeft: '20px' }}>
                          {Object.entries(topics).map(([topic, videos]) => (
                            <div key={topic} style={{ marginTop: '10px' }}>
                              <div 
                                onClick={() => toggleSection(`${batch}/${subject}/${topic}`)}
                                style={{
                                  padding: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <span style={{ 
                                  transform: expandedSections[`${batch}/${subject}/${topic}`] ? 'rotate(90deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.3s',
                                  display: 'inline-block',
                                  marginRight: '10px'
                                }}>▶</span>
                                {topic}
                              </div>
                              
                              {expandedSections[`${batch}/${subject}/${topic}`] && (
                                <div style={{ marginLeft: '30px' }}>
                                  {videos.map((video) => (
                                    <FileItem
                                      key={video.name}
                                      file={video}
                                      isAdmin={isAdmin}
                                      handleDelete={handleDelete}
                                      user={user}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          // Student View - Start from Subject Level
          Object.entries(videoStructure).map(([subject, topics]) => (
            <div key={subject} style={{ marginBottom: '20px' }}>
              <div 
                onClick={() => toggleSection(subject)}
                style={{
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 'bold'
                }}
              >
                <span style={{ 
                  transform: expandedSections[subject] ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                  display: 'inline-block',
                  marginRight: '10px'
                }}>▶</span>
                {subject}
              </div>
              
              {expandedSections[subject] && (
                <div style={{ marginLeft: '20px' }}>
                  {Object.entries(topics).map(([topic, videos]) => (
                    <div key={topic} style={{ marginTop: '10px' }}>
                      <div 
                        onClick={() => toggleSection(`${subject}/${topic}`)}
                        style={{
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ 
                          transform: expandedSections[`${subject}/${topic}`] ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s',
                          display: 'inline-block',
                          marginRight: '10px'
                        }}>▶</span>
                        {topic}
                      </div>
                      
                      {expandedSections[`${subject}/${topic}`] && (
                        <div style={{ marginLeft: '30px' }}>
                          {videos.map((video) => (
                            <FileItem
                              key={video.name}
                              file={video}
                              isAdmin={isAdmin}
                              handleDelete={handleDelete}
                              user={user}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default VideoListPage;