import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function ExamPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]);
  const [sections, setSections] = useState([]); // Will store available sections

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    batch: '',
    date: '',
    time: '',
    duration: '',
    totalMarks: ''
  });
  const { user, isAdmin } = useAuth();
  const [applications, setApplications] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchExams();
    fetchBatchesAndSubjects();
    if (!isAdmin) {
      fetchApplications();
    }
  }, [isAdmin, user.email]);

  const fetchExams = async () => {
    try {
      const examSnapshot = await getDocs(collection(db, 'exams'));
      const examList = examSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExams(examList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching exams:', error);
      setLoading(false);
    }
  };

  const fetchBatchesAndSubjects = async () => {
    try {
      const [batchesSnapshot, subjectsSnapshot] = await Promise.all([
        getDocs(collection(db, 'batches')),
        getDocs(collection(db, 'subjects'))
      ]);
      
      setBatches(batchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
      
      setSubjects(subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error('Error fetching batches and subjects:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const applicationsSnapshot = await getDocs(collection(db, 'examApplications'));
      const applicationsData = {};
      applicationsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userEmail === user.email) {
          applicationsData[data.examId] = {
            id: doc.id,
            status: data.status
          };
        }
      });
      setApplications(applicationsData);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'exams'), {
        ...formData,
        sections: selectedSections,
        createdAt: new Date(),
        createdBy: user.email
      });
      setFormData({
        name: '',
        subject: '',
        batch: '',
        date: '',
        time: '',
        duration: '',
        totalMarks: ''
      });
      fetchExams();
    } catch (error) {
      console.error('Error adding exam:', error);
    }
  };

  const handleDelete = async (examId) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        await deleteDoc(doc(db, 'exams', examId));
        fetchExams();
      } catch (error) {
        console.error('Error deleting exam:', error);
      }
    }
  };

  const handleApplicationToggle = async (examId) => {
    try {
      if (!applications[examId]) {
        // Create new application
        const docRef = await addDoc(collection(db, 'examApplications'), {
          examId,
          userEmail: user.email,
          status: 'applied',
          appliedAt: new Date()
        });
        setApplications(prev => ({
          ...prev,
          [examId]: { id: docRef.id, status: 'applied' }
        }));
        
        // Navigate to exam interface instead of opening index.html
        navigate('/exam-interface');
      } else if (applications[examId].status === 'applied') {
        // Update to review
        const docRef = doc(db, 'examApplications', applications[examId].id);
        await updateDoc(docRef, {
          status: 'review',
          reviewedAt: new Date()
        });
        setApplications(prev => ({
          ...prev,
          [examId]: { ...prev[examId], status: 'review' }
        }));
      }
    } catch (error) {
      console.error('Error updating application:', error);
    }
  };

    // In ExamPage.jsx, update the handleStartExam function
  const handleStartExam = (exam) => {
    exam.subject = subjects;
    if (isAdmin) {
      navigate('/edit-exam', {
        state: { examData: exam }
      });
    } else {
      navigate(`/exam-interface/${exam.id}`);

    }
  };

  return (
    <div style={{
      padding: '32px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {isAdmin && (
        <div style={{
          marginBottom: '32px',
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#2d3748' }}>Add New Exam</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr', 
              gap: '24px',
              marginBottom: '24px'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#4a5568' }}>
                  Exam Name
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px'
                    }}
                  />
                </label>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#4a5568' }}>
                  Batch
                  <select
                    value={formData.batch}
                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      backgroundColor: 'white'
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
                  color: '#4a5568' 
                }}>
                  Sections
                </label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '12px' 
                }}>
                  {subjects.map(section => (
                    <label key={section.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      padding: '8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedSections.includes(section.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSections([...selectedSections, section.id]);
                          } else {
                            setSelectedSections(selectedSections.filter(id => id !== section.id));
                          }
                        }}
                        style={{ marginRight: '8px' }}
                      />
                      {section.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#4a5568' }}>
                  Date
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px'
                    }}
                  />
                </label>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#4a5568' }}>
                  Time
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px'
                    }}
                  />
                </label>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#4a5568' }}>
                  Duration (minutes)
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px'
                    }}
                  />
                </label>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#4a5568' }}>
                  Total Marks
                  <input
                    type="number"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px'
                    }}
                  />
                </label>
              </div>
            </div>
            <button
              type="submit"
              style={{
                marginTop: '8px',
                padding: '8px 16px',
                backgroundColor: '#ffa600',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add Exam
            </button>
          </form>
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <h2 style={{ padding: '24px', margin: 0, color: '#2d3748' }}>Upcoming Exams</h2>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#718096' }}>
            Loading exams...
          </div>
        ) : exams.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#718096' }}>
            No exams scheduled
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f7fafc' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Exam Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Subject</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Time</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Duration</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Total Marks</th>
                  {isAdmin && (
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                  )}
                  {!isAdmin && (
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {exams.map(exam => (
                  <tr key={exam.id} style={{ ':hover': { backgroundColor: '#f7fafc' } }}>
                    <td 
                      style={{ 
                        padding: '12px', 
                        borderBottom: '1px solid #e2e8f0',
                        cursor: 'pointer' 
                      }}
                      onClick={() => handleStartExam(exam)}
                    >
                      {exam.name}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{exam.sections?.map(sectionId => 
        subjects.find(s => s.id === sectionId)?.name
      ).join(', ')}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{exam.date}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{exam.time}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{exam.duration} mins</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{exam.totalMarks}</td>
                    {isAdmin && (
                      <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
                        <button
                          onClick={() => handleDelete(exam.id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                    {!isAdmin && (
                      <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
                        <button
                          onClick={() => handleApplicationToggle(exam.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: applications[exam.id]?.status === 'review' 
                              ? '#4CAF50'  // Green for review
                              : applications[exam.id]?.status === 'applied'
                              ? '#FFA500'  // Orange for applied
                              : '#2196F3', // Blue for initial state
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          {applications[exam.id]?.status === 'review' 
                            ? 'Reviewed'
                            : applications[exam.id]?.status === 'applied'
                            ? 'Review'
                            : 'Apply'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamPage;