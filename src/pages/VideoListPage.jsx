import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { AiFillFilePdf } from 'react-icons/ai';
import { BsFillPlayCircleFill } from 'react-icons/bs';
import { ref, uploadBytes, getDownloadURL, listAll, getMetadata, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';

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
    const fetchFiles = async () => {
      if (!isAdmin && (!studentData || studentData.status !== 'active')) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch videos from Bunny Stream
        const videoResponse = await fetch(
          `https://video.bunnycdn.com/library/359657/videos`, 
          {
            headers: {
              'AccessKey': 'a12e0bb1-1753-422b-8592a11c9c61-605b-46a8'
            }
          }
        );
        
        if (!videoResponse.ok) {
          throw new Error(`HTTP error! status: ${videoResponse.status}`);
        }
        
        // Process video files
        const videoData = await videoResponse.json();
        let videoFiles = videoData.items?.map(item => {
          // Split title by underscores to get components
          const [batch, subject, topic, subtopic] = item.title.split('_');
          return {
            name: item.title,
            batch,
            subject,
            topic,
            subtopic,
            lastModified: new Date(item.dateUploaded),
            size: (item.storageSize / 1024 / 1024).toFixed(2),
            type: 'video',
            bunnyVideoId: item.guid
          };
        }) || [];

        // 2. Fetch PDFs from Firebase Storage
        const pdfListRef = ref(storage, 'pdfs');
        const pdfList = await listAll(pdfListRef);
        let pdfFiles = await Promise.all(
          pdfList.items.map(async (item) => {
            const name = item.name;
            const nameParts = name.replace('.pdf', '').split('_');
            const [batch, subject, topic, subtopic] = nameParts;
            const metadata = await getMetadata(item);
            
            return {
              name: name,
              batch,
              subject,
              topic,
              subtopic,
              lastModified: new Date(metadata.timeCreated),
              size: (metadata.size / 1024 / 1024).toFixed(2),
              type: 'pdf'
            };
          })
        );

        // Combine and filter files
        let allFiles = [...videoFiles, ...pdfFiles];
        
        if (!isAdmin && studentData) {
          allFiles = allFiles.filter(file => {
            return studentData.batch === file.batch && 
                   studentData.subjects?.includes(file.subject);
          });
        }

        setVideos(allFiles);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching files:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchFiles();
  }, [isAdmin, studentData]);

  const handleDelete = async (file) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      if (file.type === 'pdf') {
        // Delete from Firebase Storage
        const pdfRef = ref(storage, `pdfs/${file.name}`);
        await deleteObject(pdfRef);
      } else {
        // Delete from Bunny Stream
        const response = await fetch(
          `https://video.bunnycdn.com/library/359657/videos/${file.bunnyVideoId}`, 
          {
            method: 'DELETE',
            headers: {
              'AccessKey': 'a12e0bb1-1753-422b-8592a11c9c61-605b-46a8'
            }
          }
        );

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update UI
      setVideos(prevFiles => prevFiles.filter(f => f.name !== file.name));
      alert('File deleted successfully');
    } catch (err) {
      console.error('Error deleting file:', err);
      alert('Failed to delete file: ' + err.message);
    }
  };

  // Organize videos into hierarchical structure based on user role
  const organizeVideos = () => {
    const structure = {};
    
    videos.forEach(file => {
      const { batch, subject, topic, subtopic } = file;
      
      if (isAdmin) {
        // Admin view - show all levels including batch
        if (!structure[batch]) structure[batch] = {};
        if (!structure[batch][subject]) structure[batch][subject] = {};
        if (!structure[batch][subject][topic]) structure[batch][subject][topic] = [];
        
        structure[batch][subject][topic].push({
          ...file,
          filename: subtopic || 'untitled'
        });
      } else {
        // Student view - skip batch level
        if (!structure[subject]) structure[subject] = {};
        if (!structure[subject][topic]) structure[subject][topic] = [];
        
        structure[subject][topic].push({
          ...file,
          filename: subtopic || 'untitled'
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

      return recentViews.length < 10;
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
    const displayName = file.subtopic || 'untitled';

    const handlePdfClick = (e) => {
      e.preventDefault();
      window.location.href = `/pdf/${encodeURIComponent(file.name)}`;
    };

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px',
        margin: '4px 0',
        backgroundColor: '#fff',
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}>
        {isPdf ? (
          <Link
            to={`/pdf/${encodeURIComponent(file.name)}`}
            onClick={handlePdfClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#4a5568',
              textDecoration: 'none',
              flex: 1
            }}
          >
            <AiFillFilePdf style={{ color: '#e53e3e', marginRight: '8px', fontSize: '24px' }} />
            <div>
              <div style={{ fontWeight: '500' }}>{displayName}</div>
              <div style={{ fontSize: '12px', color: '#718096' }}>
                {file.size} MB • {new Date(file.lastModified).toLocaleDateString()}
              </div>
            </div>
          </Link>
        ) : (
          <Link
            to={`/play/${file.bunnyVideoId}`}
            onClick={async (e) => {
              e.preventDefault();
              const canView = await checkVideoViewLimit(file.name, user.email);
              if (!canView) {
                alert('You have reached the maximum views for this video this week.');
                return;
              }

              await addDoc(collection(db, 'videoViews'), {
                videoName: file.name,
                userEmail: user.email,
                viewedAt: Timestamp.now()
              });

              window.location.href = `/play/${file.bunnyVideoId}`;
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#4a5568',
              textDecoration: 'none',
              flex: 1
            }}
          >
            <BsFillPlayCircleFill style={{ color: '#ffa600', marginRight: '8px', fontSize: '24px' }} />
            <div>
              <div style={{ fontWeight: '500' }}>{displayName}</div>
              <div style={{ fontSize: '12px', color: '#718096' }}>
                {file.size} MB • {new Date(file.lastModified).toLocaleDateString()}
              </div>
            </div>
          </Link>
        )}

        {isAdmin && (
          <button
            onClick={() => handleDelete(file)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#fff',
              border: '1px solid #e53e3e',
              borderRadius: '4px',
              color: '#e53e3e',
              cursor: 'pointer',
              marginLeft: '8px',
              width: '60px'
            }}
          >
            Delete
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return <div>Loading videos...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
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