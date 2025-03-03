import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDoc, doc ,getDocs, setDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { AiFillFilePdf } from 'react-icons/ai';
import { BsFillPlayCircleFill } from 'react-icons/bs';
import { ref, listAll, getMetadata, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaClipboardList } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip'
import { getUserExamResults } from '../services/questionService';
import { getExams } from '../services/questionService';
import { storeVideoFiles, retrieveVideoFiles, getStudentByEmail, getAllStudents } from '../services/studentService';
import { simulationService } from '../services/simulationService';

// Add this CSS animation
const styles = `
  @keyframes spin {
    0% { 
      transform: rotate(0deg);
      border-top-color:rgb(219, 135, 52);
    }
    25% {
      border-top-color:rgb(209, 95, 30);
    }
    50% {
      border-top-color: #f1c40f;
    }
    75% {
      border-top-color: #e74c3c;
    }
    100% { 
      transform: rotate(360deg);
      border-top-color:rgb(238, 224, 24);
    }
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  .spinner {
    position: relative;
    width: 50px;
    height: 50px;
  }

  .spinner::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-top: 3px solid #3498db;
    animation: spin 1.5s ease-in-out infinite;
  }

  .spinner::after {
    content: '';
    position: absolute;
    top: -8px;
    left: -8px;
    right: -8px;
    bottom: -8px;
    border-radius: 50%;
    border: 3px solid transparent;
    border-top: 3px solid rgba(52, 152, 219, 0.2);
    animation: spin 2s linear infinite;
  }
`;

// Insert animation styles
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

function VideoListPage() {
  const { user, isAdmin, isFranchise } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [studentData, setStudentData] = useState(null);
  const [accessibleFiles, setAccessibleFiles] = useState(new Set());
  const [isSaving, setSaving] = useState(false);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStudentEmail, setSelectedStudentEmail] = useState('');
  const [exams, setExams] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [simName, setSimName] = useState('');
  const [simUrl, setSimUrl] = useState('');
  const [topicSimulations, setTopicSimulations] = useState({});
  const [iframeUrl, setIframeUrl] = useState("https://app.vignamlabs.com/openSimulation/SIM-4e8c7a62-b9f3-4c71-a9d5-61c4f8d72e45?def_token=INST-5ccefcb8-1294-4adc-9975-a18b3c0b7c8d");


  const navigate = useNavigate();

  useEffect(() => {
    if (user && isFranchise) {
      navigate('/students');
    }
  }, [user, isFranchise, navigate]);


  // Fetch batches on mount
  useEffect(() => {
    const fetchBatches = async () => {
      const studentsRef = collection(db, 'students');
      const snapshot = await getDocs(studentsRef);
      let ddbGetAllStudents = await getAllStudents();
      console.log(ddbGetAllStudents);
      console.log(snapshot.docs);
      const uniqueBatches = [...new Set(
        ddbGetAllStudents.map(doc => doc.batch)
      )].filter(Boolean);
      console.log("uniqueBatches");
      console.log(uniqueBatches);
      setBatches(uniqueBatches);
    };
    // fetchBatches();
  }, []);

  // Fetch students when batch changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedBatch) return;
      
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, where('batch', '==', selectedBatch));
      const snapshot = await getDocs(q);
      const studentsList = snapshot.docs.map(doc => ({
        email: doc.data().email,
        name: doc.data().name
      }));
      studentsList.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(studentsList);
    };
    // fetchStudents();
  }, [selectedBatch]);

  // Fetch student data and exams on mount

    useEffect(() => {

      const fetchExamData = async () => {
        try {
          // Get exam results from DynamoDB
          const results = await getUserExamResults(user.uid);
          
          // Transform DynamoDB response
          const transformedResults = results.map(result => ({
            examId: result.SK.replace('EXAM#', ''),
            userId: result.userId,
            answers: result.answers,
            sections: result.sections,
            statistics: result.statistics,
            submittedAt: result.submittedAt,
            status: result.status
          }));
      
          setExamResults(transformedResults);
        } catch (error) {
          console.error('Error fetching exam results:', error);
        }
      };
      if (user) {
        fetchExamData();
      }
    }, [user]);


  const handleSave = async () => {
    if (isSaving || !selectedStudentEmail) return;
    
    setSaving(true);
    try {
      await setDoc(doc(db, 'VideoAccessGranted', selectedStudentEmail), {
        files: Array.from(accessibleFiles).join('|||'),
        updatedAt: Timestamp.now()
      });
      toast.success('Access settings saved successfully!');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };


  // Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user || isAdmin) return;
      
      try {
        // const studentsRef = collection(db, 'students');
        // const q = query(studentsRef, where('email', '==', user.email));
        // const querySnapshot = await getDocs(q);
        
        
        let ddbstudents= await getStudentByEmail(user.email);
        if (ddbstudents.empty) {
          setError('Student not found');
          setLoading(false);
          return;
        }

        // const studentDoc = querySnapshot.docs[0];
        //   const data = studentDoc.data();
          setStudentData({
            id: ddbstudents?.SK || 1,
            ...ddbstudents
          });

          // console.log(data);

          // If student is inactive, set error
          if (ddbstudents.status !== 'active') {
            setError('Your account is currently inactive. Please contact administrator.');
            setLoading(false);
            return;
          }
        // Set student data
      const studentInfo = {
        id: ddbstudents?.SK || 1,
        ...ddbstudents
      };
      setStudentData(studentInfo);
      // Then fetch exams for this student's batch
      const examSnapshot = await getExams();
      const examsData = examSnapshot.map(exam => ({
        id: exam.id,
        name: exam.name,
        batch: exam.batch,
        subject: exam.subject,
        videoKey: exam.videoKey,
        createdBy: exam.createdBy
      }));
      setExams(examsData.filter(exam => studentInfo.batch.includes(exam.batch)));
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
      
      if (!isAdmin && (!studentData || studentData?.status !== 'active')) {
        if(studentData!==null) 
        setLoading(false);
        return;
      }

      try {

        let videoFiles = [];
        if (isAdmin) {
          // Fetch videos from Bunny Stream
        const videoResponse = await fetch(
          `https://video.bunnycdn.com/library/359657/videos?page=1&itemsPerPage=1000&orderBy=date`, 
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
        videoFiles = videoData.items?.map(item => {
          // Split title by underscores to get components
          const [batch, subject, topic, subtopic] = item.title.split('_');
          return {
            name: item.title,
            batch,
            subject,
            topic,
            subtopic,
            lastModified: (item.dateUploaded),
            size: (item.storageSize / 1024 / 1024).toFixed(2),
            type: 'video',
            bunnyVideoId: item.guid
          };
        }) || [];

        // Store video files in DynamoDB
        await storeVideoFiles(videoFiles);

        } else {
          //retrieve it from the cache
          videoFiles = await retrieveVideoFiles();
        }

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
            return studentData.batch.includes(file.batch) && 
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
      toast.success('File deleted successfully');
    } catch (err) {
      console.error('Error deleting file:', err);
      alert('Failed to delete file: ' + err.message);
    }
  };

  const handleTest = async (videoKey) => {
    navigate('/exams', {
      state: { videoKey: videoKey }
    });
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

  const checkVideoAccess = async (userId) => {
    try {
      // Get user's document from VideoAccessGranted collection
      const docRef = doc(db, 'VideoAccessGranted', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Get comma-separated filenames and convert to array
        const accessibleFiles = docSnap.data().files?.split(',') || [];
        return accessibleFiles;
      }
      return [];
    } catch (error) {
      console.error('Error checking video access:', error);
      return [];
    }
  };

  // Fetch accessible files once
  useEffect(() => {
    const fetchAccessibleFiles = async (email) => {
      const docRef = doc(db, 'VideoAccessGranted', email);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const filesArray = docSnap.data().files?.split('|||') || [];
        setAccessibleFiles(new Set(filesArray));
      }
      else {
        setAccessibleFiles(new Set());
      }
    };
    if(selectedStudentEmail)
    fetchAccessibleFiles(selectedStudentEmail);
    else
    fetchAccessibleFiles(user.email);
  }, [selectedStudentEmail,user]);
  
  // Synchronous access check function
  const ra = (file) => {
    const twoWeeksInMilliseconds = 14 * 24 * 60 * 60 * 1000;
    const fileAge = Date.now() - new Date(file.lastModified).getTime();
    if(accessibleFiles.has(file.name) || file.name.includes("Paramatric Form"))       //remove this line to make all files accessible
      return false; // File is accessible

    if (fileAge < twoWeeksInMilliseconds) {
      return false; // File is less than 2 weeks old, so it is accessible
    }

    return true; // File is older than 2 weeks, so it requires access
  };

  const handleCheckboxChange = (fileName, checked) => {
    setAccessibleFiles(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(fileName);
      } else {
        newSet.delete(fileName);
      }
      return newSet;
    });
  };

  const ExamTooltipContent = ({ exam, examResults }) => {
    const result = examResults.find(r => r.examId === exam.id);
    return (
      <div className="tooltip-content">
        <div style={{ 
          fontWeight: 600, 
          fontSize: '1.1rem',
          marginBottom: '0.5rem'
        }}>
          {exam.name}
        </div>
        {result && (
          <div className="text-xs">
            {Object.entries(result.answers).map(([section, data]) => (
              <div key={section} className="mt-1">
                <div style={{ 
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                  fontWeight: 500,
                  color: '#f97316',
                  paddingBottom: '2px',
                  marginBottom: '4px'
                }}>
                  {section}
                </div>
                <div>Total Marks: {data.totalMarks}</div>
                <div>Positive: {data.positiveMarks}</div>
                <div>Negative: {data.negativeMarks}</div>
                <div>Attempted: {data.attempted}</div>
                <div>Correct: {data.correct}</div>
                <div>Incorrect: {data.incorrect}</div>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="font-medium">Statistics</div>
              <div>Time Spent: {Math.floor(result.statistics.timeSpent / 60)}m {result.statistics.timeSpent % 60}s</div>
              <div>Questions Attempted: {result.statistics.questionsAttempted}</div>
              <div>Marked for Review: {result.statistics.questionsMarkedForReview}</div>
              <div className="text-gray-500 text-[10px] mt-1">
                Submitted: {new Date(result.submittedAt).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };  

  const formatVideoKey = (videoKey) => {
    //remove '_' "/" and "." 
    const nameWithoutTimestamp = videoKey?.replace(/[_/.-]/g, '');
    return nameWithoutTimestamp;
  };

  const FileItem = ({ file, isAdmin, handleDelete, user }) => {
    const isPdf = file.type === 'pdf';
    const [isHovered, setIsHovered] = useState(false);
    const displayName = file.subtopic || 'untitled';

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
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {isPdf ? (
            <AiFillFilePdf size={24} color="#dc3545" style={{ marginRight: '10px' }} />
          ) : (
            <BsFillPlayCircleFill size={24} color="#FF9800" style={{ marginRight: '10px' }} />
          )}
          
          <Link 
            to={isPdf ? `/pdf/${encodeURIComponent(file.name)}` : `/play/${file.bunnyVideoId}`}
            style={{
              textDecoration: 'none',
              width: '100%',
              color: '#333',
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={async (e) => {
              if (isPdf) {
                e.preventDefault();
                window.open(`/pdf/${encodeURIComponent(file.name)}`, '_blank');
                return;
              }

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
          >
            {displayName}
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {exams
            .filter(exam => formatVideoKey(file.name).includes(formatVideoKey(exam.videoKey)) )
            .sort((a, b) => new Date(a.date) > new Date(b.date))
            .map(exam => (
              <div key={exam.id}>
                <Tooltip 
                  anchorSelect={`.exam-icon-${exam.id.replace(/[^a-zA-Z0-9]/g, '-')}`} 
                  place="top"
                >
                  <ExamTooltipContent exam={exam} examResults={examResults} />
                </Tooltip>
                <FaClipboardList 
                  color={examResults.some(result => result.examId === exam.id) ? '#d1d5db' : '#f97316'}

                  className={`
                    text-xl
                    ${examResults.some(result => result.examId === exam.id) 
                      ? 'text-gray-400' 
                      : 'text-gray-600 hover:text-orange-500 cursor-pointer'}
                    exam-icon-${exam.id.replace(/[^a-zA-Z0-9]/g, '-')}
                  `}
                  onClick={() => {
                    if (!examResults.some(result => result.examId === exam.id)) {
                      navigate(`/exam-interface/${exam?.id}`);
                    }
                  }}
                />
              </div>
            ))}
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              fontSize: '12px', 
              color: isHovered ? '#4a5568' : '#666'
            }}>
              {file.size} MB | {new Date(file.lastModified).toLocaleString()}
            </div>
            <button
              onClick={() => handleTest(file.name)}
              style={{
                padding: '6px',
                backgroundColor: '#ffa600',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add Test
            </button>
            <button
              onClick={() => handleDelete(file)}
              style={{
                padding: '6px 12px',
                backgroundColor: isHovered ? '#c82333' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        background: '#f8f9fa'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <div 
            className="spinner"
            style={{
              width: '40px',
              height: '40px',
              margin: '20px auto',
              borderRadius: '50%',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #3498db',
              animation: 'spin 1s linear infinite'
            }}
          />
          <p style={{
            color: '#666',
            marginTop: '15px'
          }}>
            Loading videos... Please wait<br/>
            If this takes too long, please contact your administrator.
          </p>
        </div>
      </div>
    );
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
      {isAdmin && 
      <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-lg shadow-sm">
      <div className="flex flex-col gap-2">
        <label htmlFor="batch" className="text-sm font-medium text-gray-700">
          Select Batch
        </label>
        <select 
          id="batch"
          value={selectedBatch} 
          onChange={(e) => setSelectedBatch(e.target.value)}
          className="
            w-64
            px-3 py-2
            bg-white
            border border-gray-300
            rounded-md
            shadow-sm
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            focus:border-blue-500
            text-sm
          "
          style={{ cursor: 'pointer', height: '40px', marginLeft: '10px' }}
        >
          <option value="">All Batches</option>
          {batches.map(batch => (
            <option key={batch} value={batch}>{batch}</option>
          ))}
        </select>
      </div>
    
      <div className="flex flex-col gap-2">
        <label htmlFor="student" className="text-sm font-medium text-gray-700">
          Select Student
        </label>
        <select
          id="student"
          value={selectedStudentEmail}
          onChange={(e) => setSelectedStudentEmail(e.target.value)}
          className={`
            w-64
            px-3 py-2
            bg-white
            border border-gray-300
            rounded-md
            shadow-sm
            text-sm
            ${!selectedBatch ? 
              'bg-gray-100 cursor-not-allowed' : 
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            }
          `}
          style={{ cursor: !selectedBatch ? 'not-allowed' : 'pointer', height: '40px', marginTop: '10px' , marginLeft: '10px'}}
          disabled={!selectedBatch}
        >
          <option value="">Select Student</option>
          {students.map(student => (
            <option key={student.email} value={student.email}>
              {student.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="batch" className="text-sm font-medium text-gray-700">
          Simulation URL
        </label>
        <input 
          id="simulation"
          type="text"
          value={simUrl}
          placeholder="Enter simulation URL"
          onChange={(e) => setSimUrl(e.target.value)}
          className="
            w-64
            px-3 py-2
            bg-white
            border border-gray-300
            rounded-md
            shadow-sm
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            focus:border-blue-500
            text-sm
          "
          style={{ 
            height: '40px', 
            marginLeft: '10px',
            transition: 'all 0.2s ease'
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="batch" className="text-sm font-medium text-gray-700">
          Simulation Name
        </label>
        <input 
          id="simulation_name"
          type="text"
          value={simName}
          placeholder="Enter simulation Name"
          onChange={(e) => setSimName(e.target.value)}
          className="
            w-64
            px-3 py-2
            bg-white
            border border-gray-300
            rounded-md
            shadow-sm
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            focus:border-blue-500
            text-sm
          "
          style={{ 
            height: '40px', 
            marginLeft: '10px',
            transition: 'all 0.2s ease'
          }}
        />
      </div>
    </div>}

      
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
                        onClick={() => {toggleSection(`${batch}/${subject}`);
                        simulationService.getSimulationLinksBySubject(subject).then((res) => {
                          setTopicSimulations(prevState => ({
                            ...prevState,
                            [subject]: res
                          }));
                        });
                      }}
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
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  width: '100%',
                                  padding: '8px',
                                  backgroundColor: '#f8f9fa',
                                  borderRadius: '4px'
                                }}>
                                  <div style={{ 
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#4a5568',
                                    flex: '1'
                                  }}>
                                    {topic}
                                  </div>
                                    {topicSimulations[subject]?.filter(sim => sim.SK.includes(topic)).map((sim) => (
                                      sim.simulations?.map((simulation) => (
                                        <div 
                                          key={simulation.url} 
                                          style={{ 
                                            marginRight: '8px',
                                            position: 'relative',
                                            display: 'inline-block'
                                          }}
                                        >
                                          <div data-tooltip-id={`sim-${sim.SK}-${simulation.url}`}>
                                            <svg 
                                              width="20" 
                                              height="20" 
                                              viewBox="0 0 24 24"
                                              fill="#ffa600"
                                              style={{ cursor: 'pointer' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setIframeUrl(simulation.url);
                                                //scroll the view to iframe
                                                document.getElementById('iframe').scrollIntoView({behavior: 'smooth'});
                                              }}
                                            >
                                              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                                            </svg>
                                          </div>
                                          <Tooltip 
                                            id={`sim-${sim.SK}-${simulation.url}`}
                                            place="top"
                                            className="tooltip"
                                            content={simulation.name || "Simulation"}
                                          />
                                        </div>
                                      ))
                                    ))}
                                  {<button
                                    onClick={async (e) => {
                                      e.stopPropagation(); // Prevent topic expansion when clicking button
                                      // scroll to the top of the page
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                      if (simName && simUrl) {
                                        try {
                                          const result = await simulationService.addSimulationLink(subject, topic, {
                                            name: simName,
                                            url: simUrl
                                          });
                                          debugger;
                                          if (result) {
                                            toast.success(`Simulation "${simName}" added successfully!`);
                                            setSimName('');
                                            setSimUrl('');
                                          } else {
                                            toast.error(result.message);
                                          }
                                        } catch (error) {
                                          console.error('Error adding simulation:', error);
                                          toast.error('Failed to add simulation. Please try again.');
                                        }
                                      } else {
                                        toast.error('Please enter both simulation name and URL');
                                      }
                                    }}
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#ffa600',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '13px',
                                      fontWeight: '500',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      transition: 'all 0.2s ease',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                      width: 'fit-content',  // Button will only be as wide as its content
                                      minWidth: '140px',    // Minimum width to maintain consistency
                                      marginLeft: '16px'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#f59e0b';
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = '#ffa600';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                  >
                                    <svg 
                                      width="16" 
                                      height="16" 
                                      viewBox="0 0 24 24" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="2"
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                    >
                                      <path d="M12 5v14M5 12h14"/>
                                    </svg>
                                    Add Simulation
                                  </button>}
                                </div>

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
                onClick={() => {toggleSection(subject);
                  simulationService.getSimulationLinksBySubject(subject).then((res) => {
                    setTopicSimulations(prevState => ({
                      ...prevState,
                      [subject]: res
                    }));
                  });
                }}
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
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  width: '100%',
                                  padding: '8px',
                                  backgroundColor: '#f8f9fa',
                                  borderRadius: '4px'
                                }}>
                                  <div style={{ 
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#4a5568',
                                    flex: '1'
                                  }}>
                                    {topic}
                                  </div>
                                    {topicSimulations[subject]?.filter(sim => sim.SK.includes(topic)).map((sim) => 
                                      <div style={{marginRight: '40vw'}}>
                                        {sim.simulations?.map((simulation) => (
                                        <div 
                                          key={simulation.url} 
                                          style={{ 
                                            marginRight: '5vw',
                                            position: 'relative',
                                            display: 'inline-block'
                                          }}
                                        >
                                          <div data-tooltip-id={`sim-${sim.SK}-${simulation.url}`}>
                                            <svg 
                                              width="20" 
                                              height="20" 
                                              viewBox="0 0 24 24"
                                              fill="#ffa600"
                                              style={{ cursor: 'pointer' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setIframeUrl(simulation.url);
                                                //scroll the view to iframe
                                                document.getElementById('iframe').scrollIntoView({behavior: 'smooth'});
                                              }}
                                            >
                                              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                                            </svg>
                                          </div>
                                          <Tooltip 
                                            id={`sim-${sim.SK}-${simulation.url}`}
                                            place="top"
                                            className="tooltip"
                                            content={simulation.name || "Simulation"}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                    )}
                                </div>

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
      {isAdmin && <button
        onClick={handleSave}
        disabled={isSaving}
        className={`
          px-4 py-2 rounded-md font-medium
          ${isSaving ? 
            'bg-gray-400 cursor-not-allowed' : 
            'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }
          text-white transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        style={{maxWidth:"20vw", backgroundColor:"orange", color:"white", padding:"10px", borderRadius:"5px", border:"none", cursor:"pointer", marginTop:"20px"}}
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>}
      {/* <iframe 
        src="https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=Asia%2FKolkata&showPrint=0&src=ZGlwYWthZ2Fyd2FsMTAxNTA1QGdtYWlsLmNvbQ&color=%237986CB"
        title="Google Calendar"
        style={{
          border: 'solid 1px #777',
          width: '100%',
          maxWidth: '800px',
          height: '600px',
        }}
        frameBorder="0"
        scrolling="no"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        loading="lazy"
        onError={(e) => {
          console.error('Calendar iframe failed to load:', e);
          toast.error('Failed to load calendar');
        }}
      /> */}
      {<div style={{
        width: '90vw',
        height: '900px',
        margin: '5px 0',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
          <iframe
          src= {iframeUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          id='iframe'
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Vignam Labs Simulation"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = 'Failed to load simulation. Please check your internet connection or try again later.';
          }}
        />
      </div>}
    </div>
  );
}

export default VideoListPage;