import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
          setStudentData({
            id: querySnapshot.docs[0].id,
            ...querySnapshot.docs[0].data()
          });
        }
      } catch (err) {
        console.error('Error fetching student data:', err);
        setError('Failed to fetch student data');
      }
    };

    fetchStudentData();
  }, [user, isAdmin]);

  // Fetch videos
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const s3Client = new S3Client({
          region: process.env.REACT_APP_AWS_REGION,
          credentials: {
            accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
          },
        });

        const command = new ListObjectsV2Command({
          Bucket: 'zenithvideo',
        });

        const response = await s3Client.send(command);
        let videoFiles = response.Contents.filter(item => 
          item.Key.endsWith('.mp4')
        ).map(item => ({
          name: item.Key,
          lastModified: item.LastModified,
          size: (item.Size / 1024 / 1024).toFixed(2)
        }));

        // Filter videos based on student's batch and subjects if not admin
        if (!isAdmin && studentData) {
          videoFiles = videoFiles.filter(video => {
            const [batch, subject] = video.name.split('/');
            return studentData.batch === batch && 
                   studentData.subjects.includes(subject);
          });
        }

        setVideos(videoFiles);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    // Only fetch videos if we have student data (for non-admin users)
    if (isAdmin || studentData) {
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

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading videos...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
        Error: {error}
      </div>
    );
  }

  if (!isAdmin && !studentData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        No student data found for this account.
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
                                    <div
                                      key={video.name}
                                      style={{
                                        padding: '10px',
                                        marginTop: '5px',
                                        backgroundColor: '#fff',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                      }}
                                    >
                                      <Link 
                                        to={`/play/${encodeURIComponent(video.name)}`}
                                        style={{
                                          textDecoration: 'none',
                                          width: '100%'
                                        }}
                                      >
                                        <div>
                                          <div style={{ 
                                            fontSize: '14px', 
                                            color: '#333',
                                            cursor: 'pointer',
                                            transition: 'color 0.2s ease'
                                          }}
                                          onMouseEnter={(e) => e.target.style.color = '#ffa600'}
                                          onMouseLeave={(e) => e.target.style.color = '#333'}
                                          >
                                            {formatVideoName(video.filename)}
                                          </div>
                                          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                            Size: {video.size} MB | 
                                            Last Modified: {new Date(video.lastModified).toLocaleString()}
                                          </div>
                                        </div>
                                      </Link>
                                      {isAdmin && (
                                        <button
                                          onClick={() => handleDelete(video.name)}
                                          style={{
                                            padding: '6px 12px',
                                            backgroundColor: '#dc3545',
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
                            <div
                              key={video.name}
                              style={{
                                padding: '10px',
                                marginTop: '5px',
                                backgroundColor: '#fff',
                                borderRadius: '4px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                              }}
                            >
                              <Link 
                                to={`/play/${encodeURIComponent(video.name)}`}
                                style={{
                                  textDecoration: 'none',
                                  width: '100%'
                                }}
                              >
                                <div>
                                  <div style={{ 
                                    fontSize: '14px', 
                                    color: '#333',
                                    cursor: 'pointer',
                                    transition: 'color 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.target.style.color = '#ffa600'}
                                  onMouseLeave={(e) => e.target.style.color = '#333'}
                                  >
                                    {formatVideoName(video.filename)}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                    Size: {video.size} MB | 
                                    Last Modified: {new Date(video.lastModified).toLocaleString()}
                                  </div>
                                </div>
                              </Link>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDelete(video.name)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#dc3545',
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