import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import StudentForm from '../components/StudentForm';
import BatchForm from '../components/BatchForm';
import SubjectForm from '../components/SubjectForm';

function StudentManagementPage() {
  const [activeTab, setActiveTab] = useState('students');
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      const batchesSnapshot = await getDocs(collection(db, 'batches'));
      const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
      
      setBatches(batchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setSubjects(subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    
    fetchData();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Student Management</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('students')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: activeTab === 'students' ? '#0066FF' : '#f0f0f0',
            color: activeTab === 'students' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Students
        </button>
        <button 
          onClick={() => setActiveTab('batches')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: activeTab === 'batches' ? '#0066FF' : '#f0f0f0',
            color: activeTab === 'batches' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Batches
        </button>
        <button 
          onClick={() => setActiveTab('subjects')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'subjects' ? '#0066FF' : '#f0f0f0',
            color: activeTab === 'subjects' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Subjects
        </button>
      </div>

      {activeTab === 'students' && <StudentForm batches={batches} subjects={subjects} />}
      {activeTab === 'batches' && <BatchForm batches={batches} setBatches={setBatches} />}
      {activeTab === 'subjects' && <SubjectForm subjects={subjects} setSubjects={setSubjects} />}
    </div>
  );
}

export default StudentManagementPage;