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

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: '#718096'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '24px',
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
          marginBottom: '8px',
          fontWeight: '600'
        }}>Student Management</h1>
        <p style={{
          color: '#718096',
          fontSize: '15px'
        }}>
          Manage students, batches, subjects, and centres
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        backgroundColor: 'white',
        padding: '8px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {['students', 'batches', 'subjects', 'centres'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: activeTab === tab ? '#ffa600' : 'transparent',
              color: activeTab === tab ? 'white' : '#64748b',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              textTransform: 'capitalize'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab) {
                e.target.style.backgroundColor = '#f1f5f9';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab) {
                e.target.style.backgroundColor = 'transparent';
              }
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'students' && (
        <div>
          {/* Add Student Button */}
          <div style={{ 
            marginBottom: '20px', 
            display: 'flex', 
            justifyContent: 'flex-end' 
          }}>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#ffa600',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'fit-content',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 6px rgba(255, 166, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Student
            </button>
          </div>

          {/* Students Table */}
          <div style={{ 
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ 
                    backgroundColor: '#f8fafc',
                    borderBottom: '2px solid #e2e8f0'
                  }}>
                    <th style={{ 
                      padding: '14px 20px', 
                      textAlign: 'left',
                      color: '#4a5568',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>Name</th>
                    <th style={{ 
                      padding: '14px 20px', 
                      textAlign: 'left',
                      color: '#4a5568',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>Email</th>
                    <th style={{ 
                      padding: '14px 20px', 
                      textAlign: 'left',
                      color: '#4a5568',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>Batch</th>
                    <th style={{ 
                      padding: '14px 20px', 
                      textAlign: 'left',
                      color: '#4a5568',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>Centres</th>
                    <th style={{ 
                      padding: '14px 20px', 
                      textAlign: 'left',
                      color: '#4a5568',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>Subjects</th>
                    <th style={{ 
                      padding: '14px 20px', 
                      textAlign: 'left',
                      color: '#4a5568',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr 
                      key={student.id} 
                      style={{ 
                        borderBottom: '1px solid #e2e8f0',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px' 
                        }}>
                          <img
                            src={student.imageUrl || '/default-avatar.png'}
                            alt={student.name}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #e2e8f0'
                            }}
                          />
                          <span style={{ 
                            color: '#2d3748',
                            fontWeight: '500'
                          }}>{student.name}</span>
                        </div>
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        color: '#4a5568'
                      }}>{student.email}</td>
                      <td style={{ 
                        padding: '16px 20px',
                        color: '#4a5568'
                      }}>{student.batch}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ 
                          display: 'flex', 
                          gap: '4px', 
                          flexWrap: 'wrap' 
                        }}>
                          {student.centres?.map(centre => (
                            <span key={centre} style={{
                              backgroundColor: '#f1f5f9',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              color: '#64748b'
                            }}>
                              {centre}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ 
                          display: 'flex', 
                          gap: '4px', 
                          flexWrap: 'wrap' 
                        }}>
                          {student.subjects?.map(subject => (
                            <span key={subject} style={{
                              backgroundColor: '#f1f5f9',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              color: '#64748b'
                            }}>
                              {subject}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <button
                          onClick={() => setSelectedStudent(student)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'transparent',
                            color: '#ffa600',
                            border: '1px solid #ffa600',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#fff7e6';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
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
          </div>

          {/* Modal Forms */}
          {showAddForm && (
            <div 
              className="modal-overlay" 
              onClick={handleClickOutside}
              style={{
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
              }}
            >
              <div 
                className="modal-content"
                style={{
                  backgroundColor: 'white',
                  padding: '32px',
                  borderRadius: '16px',
                  width: '100%',
                  maxWidth: '500px',
                  maxHeight: '90vh',
                  overflowY: 'auto'
                }}
              >
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
            <div 
              className="modal-overlay" 
              onClick={handleClickOutside}
              style={{
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
              }}
            >
              <div 
                className="modal-content"
                style={{
                  backgroundColor: 'white',
                  padding: '32px',
                  borderRadius: '16px',
                  width: '100%',
                  maxWidth: '500px',
                  maxHeight: '90vh',
                  overflowY: 'auto'
                }}
              >
                <EditStudentForm
                  student={selectedStudent}
                  onClose={() => setSelectedStudent(null)}
                  onUpdate={handleStudentUpdate}
                  batches={batches}
                  subjects={subjects}
                  centres={centres}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Other tabs content */}
      {activeTab === 'batches' && (
        <div style={{ 
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <BatchForm batches={batches} setBatches={setBatches} />
        </div>
      )}
      {activeTab === 'subjects' && (
        <div style={{ 
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <SubjectForm subjects={subjects} setSubjects={setSubjects} />
        </div>
      )}
      {activeTab === 'centres' && (
        <div style={{ 
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <CentreForm centres={centres} setCentres={setCentres} />
        </div>
      )}
    </div>
  );
}

export default StudentManagementPage;