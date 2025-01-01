import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import StudentForm from '../components/StudentForm';
import BatchForm from '../components/BatchForm';
import SubjectForm from '../components/SubjectForm';
import CentreForm from '../components/CentreForm';
import EditStudentForm from '../components/EditStudentForm';
import ZenithForm from '../components/ZenithForm';
import InvoiceForm from '../components/InvoiceForm';
import { useAuth } from '../contexts/AuthContext';

function StudentManagementPage() {
  const [activeTab, setActiveTab] = useState('students');
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [centres, setCentres] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedCentre, setSelectedCentre] = useState('');
  const [showZenithForm, setShowZenithForm] = useState(false);
  const [selectedStudentForForm, setSelectedStudentForForm] = useState(null);
  const { user, isFranchise} = useAuth();

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };
  
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
        if(isFranchise)
          setSelectedCentre(capitalizeFirstLetter(user.email.split('@')[0]));
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

  const filteredStudents = students.filter(student => {
    const matchesName = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBatch = selectedBatch ? student.batch === selectedBatch : true;
    const matchesCentre = selectedCentre ? student.centres.includes(selectedCentre) : true;
    return matchesName && matchesBatch && matchesCentre;
  });

  const handleDelete = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteDoc(doc(db, 'students', studentId));
        setStudents(students.filter(student => student.id !== studentId));
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Error deleting student. Please try again.');
      }
    }
  };

  const handleEmailClick = (student) => {
    // Create a new URL with student data as query parameters
    const params = new URLSearchParams({
      studentData: JSON.stringify(student)
    });
    
    // Open in new tab
    window.open(`/receipt?${params.toString()}`, '_blank');
  };

  // Add this near the top of the component
  const PaymentHistoryTooltip = ({ payments }) => {
    if (!payments?.length) return "No payment history";
    
    return (
      <div style={{ 
        padding: '8px',
        minWidth: '80vw',
        maxWidth: '90vw',
        overflowX: 'auto'  // Changed from overflowY to overflowX
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          paddingBottom: '8px'  // Add padding for scroll space
        }}>
          {payments.map((payment, index) => (
            <div key={index} style={{
              minWidth: '200px',  // Fixed width for each payment card
              flex: '0 0 auto',
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ 
                fontWeight: '500',
                color: '#1e293b',
                marginBottom: '4px'
              }}>
                {new Date(payment.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <div style={{ 
                color: '#4a5568', 
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '4px'
              }}>
                ₹{payment.amount}
              </div>
              <div style={{ 
                color: '#718096', 
                fontSize: '12px',
                marginBottom: '2px'
              }}>
                Receipt: #{payment.receiptId}
              </div>
              <div style={{ 
                color: '#718096', 
                fontSize: '12px',
                backgroundColor: '#f1f5f9',
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                {payment.paymentMode}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderZenithFormModal = () => {
    if (!showZenithForm) return null;

    return (
      <div 
        className="modal-overlay" 
        onClick={(e) => {
          if (e.target.className === 'modal-overlay') {
            setShowZenithForm(false);
            setSelectedStudentForForm(null);
          }
        }}
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
            width: '100%',
            height: '100%',
            overflowY: 'auto'
          }}
        >
          <ZenithForm 
            studentData={selectedStudentForForm}
            onClose={() => {
              setShowZenithForm(false);
              setSelectedStudentForForm(null);
            }}
          />
        </div>
      </div>
    );
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

  const tabs = isFranchise ? ['students', 'invoice'] : ['students', 'batches', 'subjects', 'centres', 'invoice'];

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
        {tabs.map((tab) => (
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
          {/* Search and Filter Section - Now only visible in students tab */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Search by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                width: '200px'
              }}
            />
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                width: '150px'
              }}
            >
              <option value="">All Batches</option>
              {batches.map(batch => (
                <option key={batch.id} value={batch.name}>{batch.name}</option>
              ))}
            </select>
            <select
              value={selectedCentre}
              onChange={(e) => setSelectedCentre(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                width: '150px'
              }}
              disabled={isFranchise}
            >
              <option value="">All Centres</option>
              {centres.map(centre => (
                <option key={centre.id} value={centre.name}>{centre.name}</option>
              ))}
            </select>
            <div>
              Displaying {filteredStudents?.length} students
            </div>
          </div>

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
                    }}>Amount Pending</th>
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
                  {filteredStudents.map(student => (
                    <tr key={student.id}>
                      <td style={{ 
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center'
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
                          fontWeight: '500',
                          marginLeft: '8px'
                        }}>{student.name}</span>
                      </td>
                      <td 
                        style={{ 
                          padding: '16px 20px',
                          cursor: 'pointer',
                          color: '#2563eb',
                          textDecoration: 'underline',
                          position: 'relative' // Add this
                        }}
                        onClick={() => handleEmailClick(student)}
                        onMouseEnter={(e) => {
                          const tooltip = e.currentTarget.querySelector('.payment-tooltip');
                          if (tooltip) tooltip.style.display = 'block';
                        }}
                        onMouseLeave={(e) => {
                          const tooltip = e.currentTarget.querySelector('.payment-tooltip');
                          if (tooltip) tooltip.style.display = 'none';
                        }}
                      >
                      {student.email}
                        <div 
                          className="payment-tooltip"
                          style={{
                            display: 'none',
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-25%)',
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            zIndex: 1000,
                            minWidth: '20vw',
                            maxWidth: '50vw'
                          }}
                        >
                          <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '12px 20px',
                            borderTopLeftRadius: '12px',
                            borderTopRightRadius: '12px',
                            borderBottom: '1px solid #e2e8f0',
                            fontWeight: '600',
                            color: '#4a5568',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            Payment History
                          </div>
                          <PaymentHistoryTooltip payments={student.payments} />
                        </div>
                      </td>
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
                      <td style={{ 
                        padding: '16px 20px',
                        color: '#4a5568',
                        fontWeight: student.amountPending > 0 ? '600' : '400'
                      }}>
                        <span style={{
                          color: student.amountPending > 0 ? '#dc2626' : '#16a34a',
                          backgroundColor: student.amountPending > 0 ? '#fee2e2' : '#f0fdf4',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}>
                          ₹{student.amountPending || 0}
                        </span>
                      </td>
                      <td style={{ 
                        padding: '16px 20px',
                        display: 'flex',
                        gap: '8px'
                      }}>
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
                        <button
                          onClick={() => handleDelete(student.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'transparent',
                            color: '#dc2626',
                            border: '1px solid #dc2626',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#fee2e2';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                          }}
                        >
                          Delete
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
          {renderZenithFormModal()}
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
      {activeTab === 'invoice' && (
        <div style={{ 
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <InvoiceForm students={students} />
        </div>
      )}
    </div>
  );
}

export default StudentManagementPage;
