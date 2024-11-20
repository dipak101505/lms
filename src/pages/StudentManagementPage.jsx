import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import StudentForm from '../components/StudentForm';
import BatchForm from '../components/BatchForm';
import SubjectForm from '../components/SubjectForm';
import CentreForm from '../components/CentreForm';
import EditStudentForm from '../components/EditStudentForm';

function StudentManagementPage() {
  const [activeTab, setActiveTab] = useState('students');
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [centres, setCentres] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [batchesSnap, subjectsSnap, centresSnap, studentsSnap] = await Promise.all([
          getDocs(collection(db, 'batches')),
          getDocs(collection(db, 'subjects')),
          getDocs(collection(db, 'centres')),
          getDocs(collection(db, 'students'))
        ]);
        
        setBatches(batchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setSubjects(subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setCentres(centresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setStudents(studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleStudentAdded = (newStudent) => {
    setStudents(prev => [...prev, newStudent]);
    setShowAddForm(false);
  };

  const handleStudentUpdate = (updatedStudent) => {
    setStudents(students.map(student => 
      student.id === updatedStudent.id ? updatedStudent : student
    ));
    setSelectedStudent(null);
  };

  const handleClickOutside = (e) => {
    if (e.target.className === 'modal-overlay') {
      setShowAddForm(false);
      setSelectedStudent(null);
    }
  };

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
            marginRight: '10px',
            backgroundColor: activeTab === 'subjects' ? '#0066FF' : '#f0f0f0',
            color: activeTab === 'subjects' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Subjects
        </button>
        <button 
          onClick={() => setActiveTab('centres')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'centres' ? '#0066FF' : '#f0f0f0',
            color: activeTab === 'centres' ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Centres
        </button>
      </div>

      {activeTab === 'students' && (
        <div>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#0066FF',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add Student
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Batch</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Centres</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Subjects</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={student.imageUrl || 'default-avatar.png'}
                          alt={student.name}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                        {student.name}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>{student.email}</td>
                    <td style={{ padding: '12px' }}>{student.batch}</td>
                    <td style={{ padding: '12px' }}>{student.centres?.join(', ') || '-'}</td>
                    <td style={{ padding: '12px' }}>{student.subjects?.join(', ') || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => setSelectedStudent(student)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#0066FF',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showAddForm && (
            <div className="modal-overlay" onClick={handleClickOutside} style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}>
              <div className="modal-content" style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}>
                <StudentForm 
                  onStudentAdded={handleStudentAdded}
                  onClose={() => setShowAddForm(false)}
                  batches={batches}
                  subjects={subjects}
                  centres={centres}
                />
              </div>
            </div>
          )}

          {selectedStudent && (
            <EditStudentForm
              student={selectedStudent}
              onClose={() => setSelectedStudent(null)}
              onUpdate={handleStudentUpdate}
              batches={batches}
              subjects={subjects}
              centres={centres}
            />
          )}
        </div>
      )}

      {activeTab === 'batches' && (
        <BatchForm batches={batches} setBatches={setBatches} />
      )}
      {activeTab === 'subjects' && (
        <SubjectForm subjects={subjects} setSubjects={setSubjects} />
      )}
      {activeTab === 'centres' && (
        <CentreForm centres={centres} setCentres={setCentres} />
      )}
    </div>
  );
}

export default StudentManagementPage;