import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

const SubjectForm = ({ subjects, setSubjects }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });
  const [status, setStatus] = useState('');
  const [isHovered, setIsHovered] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    // Format the name before saving
    const formattedName = formData.name.charAt(0).toUpperCase() + formData.name.slice(1).toLowerCase();

    // Check if subject name or code already exists
    const subjectExists = subjects.some(
      subject => 
        subject.name.toLowerCase() === formattedName.toLowerCase() ||
        subject.code.toLowerCase() === formData.code.toLowerCase()
    );

    if (subjectExists) {
      setStatus('error');
      alert('A subject with this name or code already exists. Please choose different values.');
      return;
    }

    try {
      const subjectsRef = collection(db, 'subjects');
      const docRef = await addDoc(subjectsRef, {
        ...formData,
        name: formattedName,
        code: formData.code.toUpperCase(),
        createdAt: new Date(),
        status: 'active'
      });

      setSubjects([...subjects, { 
        id: docRef.id, 
        ...formData, 
        name: formattedName,
        code: formData.code.toUpperCase() 
      }]);
      setFormData({
        name: '',
        code: '',
        description: ''
      });
      setStatus('success');
    } catch (error) {
      console.error('Error adding subject:', error);
      setStatus('error');
    }
  };

  const handleDelete = async (subjectId) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await deleteDoc(doc(db, 'subjects', subjectId));
        setSubjects(subjects.filter(subject => subject.id !== subjectId));
      } catch (error) {
        console.error('Error deleting subject:', error);
        alert('Error deleting subject. Please try again.');
      }
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    fontSize: '14px',
    color: '#2d3748',
    transition: 'all 0.2s ease',
    outline: 'none',
    backgroundColor: '#f8fafc'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    color: '#4a5568',
    fontSize: '14px',
    fontWeight: '500'
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '32px',
      alignItems: 'start'
    }}>
      {/* Form Section */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{
          fontSize: '18px',
          color: '#2d3748',
          marginBottom: '20px',
          fontWeight: '600'
        }}>Add New Subject</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>
              Subject Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = '#ffa600';
                e.target.style.backgroundColor = 'white';
                e.target.style.boxShadow = '0 0 0 3px rgba(255, 166, 0, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.backgroundColor = '#f8fafc';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Subject Code *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = '#ffa600';
                e.target.style.backgroundColor = 'white';
                e.target.style.boxShadow = '0 0 0 3px rgba(255, 166, 0, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.backgroundColor = '#f8fafc';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                ...inputStyle,
                minHeight: '100px',
                resize: 'vertical'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ffa600';
                e.target.style.backgroundColor = 'white';
                e.target.style.boxShadow = '0 0 0 3px rgba(255, 166, 0, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.backgroundColor = '#f8fafc';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'submitting'}
            style={{
              padding: '12px',
              backgroundColor: status === 'submitting' ? '#cbd5e0' : '#ffa600',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              marginTop: '8px'
            }}
            onMouseEnter={(e) => {
              if (status !== 'submitting') {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 6px rgba(255, 166, 0, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {status === 'submitting' ? 'Adding Subject...' : 'Add Subject'}
          </button>

          {status === 'success' && (
            <div style={{
              color: '#047857',
              backgroundColor: '#f0fdf4',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              textAlign: 'center',
              marginTop: '8px'
            }}>
              Subject added successfully!
            </div>
          )}
          {status === 'error' && (
            <div style={{
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              textAlign: 'center',
              marginTop: '8px'
            }}>
              Error adding subject. Please try again.
            </div>
          )}
        </form>
      </div>

      {/* Subjects List Section */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{
          fontSize: '18px',
          color: '#2d3748',
          marginBottom: '20px',
          fontWeight: '600'
        }}>Existing Subjects</h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {subjects.map(subject => (
            <div
              key={subject.id}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: isHovered === subject.id ? '#f8fafc' : 'white',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={() => setIsHovered(subject.id)}
              onMouseLeave={() => setIsHovered('')}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#2d3748',
                    margin: 0,
                    marginBottom: '4px'
                  }}>{subject.name}</h3>
                  <span style={{
                    fontSize: '13px',
                    color: '#64748b',
                    backgroundColor: '#f1f5f9',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {subject.code}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(subject.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    color: '#dc2626',
                    border: '1px solid #dc2626',
                    width: 'fit-content',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  Delete
                </button>
              </div>
              {subject.description && (
                <p style={{
                  margin: '8px 0 0 0',
                  fontSize: '14px',
                  color: '#64748b'
                }}>
                  {subject.description}
                </p>
              )}
            </div>
          ))}
          {subjects.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              color: '#64748b',
              fontSize: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px'
            }}>
              No subjects added yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectForm;