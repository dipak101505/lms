import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getCountFromServer } from 'firebase/firestore';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

function VideoListPage() {
  const { isAdmin } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [expandedSections, setExpandedSections] = useState({});

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
        const videoFiles = response.Contents.filter(item => 
          item.Key.endsWith('.mp4')
        ).map(item => ({
          name: item.Key,
          lastModified: item.LastModified,
          size: (item.Size / 1024 / 1024).toFixed(2) // Convert to MB
        }));

        setVideos(videoFiles);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const coll = collection(db, 'lmsUsers');
        const snapshot = await getCountFromServer(coll);
        setUserCount(snapshot.data().count);
      } catch (err) {
        console.error('Error fetching user count:', err);
      }
    };

    fetchUserCount();
  }, []);

  // Organize videos into hierarchical structure
  const organizeVideos = () => {
    const structure = {};
    
    videos.forEach(video => {
      const [batch, subject, topic, filename] = video.name.split('/');
      
      if (!structure[batch]) structure[batch] = {};
      if (!structure[batch][subject]) structure[batch][subject] = {};
      if (!structure[batch][subject][topic]) structure[batch][subject][topic] = [];
      
      structure[batch][subject][topic].push({
        ...video,
        filename
      });
    });

    return structure;
  };

  const toggleSection = (path) => {
    setExpandedSections(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

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
      
      // Update local state to remove the deleted video
      setVideos(prevVideos => prevVideos.filter(v => v.name !== videoKey));
    } catch (err) {
      console.error('Error deleting video:', err);
      alert('Failed to delete video: ' + err.message);
    }
  };

  const videoStructure = organizeVideos();

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Video Library</h1>
        <div style={{ 
          padding: '10px 20px', 
          backgroundColor: '#f0f0f0', 
          borderRadius: '5px',
          fontSize: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          Total Users: {userCount}
        </div>
      </div>
      
      {loading && <div>Loading videos...</div>}
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      
      <div style={{ marginTop: '20px' }}>
        {Object.entries(videoStructure).map(([batch, subjects]) => (
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
                                    <div>
                                      <div style={{ fontSize: '14px', color: '#333' }}>
                                        {video.filename}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                        Size: {video.size} MB | 
                                        Last Modified: {new Date(video.lastModified).toLocaleString()}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                      <Link 
                                        to={`/play/${encodeURIComponent(video.name)}`}
                                        style={{
                                          padding: '6px 12px',
                                          backgroundColor: '#0066FF',
                                          color: 'white',
                                          textDecoration: 'none',
                                          borderRadius: '4px',
                                          fontSize: '14px',
                                          transition: 'background-color 0.2s'
                                        }}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#0052cc'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = '#0066FF'}
                                      >
                                        Play
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
                                            transition: 'background-color 0.2s'
                                          }}
                                          onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                                          onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
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
        ))}
      </div>
    </div>
  );
}

export default VideoListPage;