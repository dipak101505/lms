import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

const BatchForm = ({ batches, setBatches }) => {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    description: ''
  });
  const [status, setStatus] = useState('');
  const [isHovered, setIsHovered] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    // Format the name before saving
    const formattedName = formData.name.charAt(0).toUpperCase() + formData.name.slice(1).toLowerCase();

    // Check if batch name already exists
    const batchExists = batches.some(
      batch => batch.name.toLowerCase() === formattedName.toLowerCase()
    );

    if (batchExists) {
      setStatus('error');
      alert('A batch with this name already exists. Please choose a different name.');
      return;
    }

    try {
      const batchesRef = collection(db, 'batches');
      const docRef = await addDoc(batchesRef, {
        ...formData,
        name: formattedName,
        createdAt: new Date(),
        status: 'active'
      });

      setBatches([...batches, { id: docRef.id, ...formData, name: formattedName }]);
      setFormData({
        name: '',
        startDate: '',
        endDate: '',
        description: ''
      });
      setStatus('success');
    } catch (error) {
      console.error('Error adding batch:', error);
      setStatus('error');
    }
  };

  const handleDelete = async (batchId) => {
    if (window.confirm('Are you sure you want to delete this batch?')) {
      try {
        await deleteDoc(doc(db, 'batches', batchId));
        setBatches(batches.filter(batch => batch.id !== batchId));
      } catch (error) {
        console.error('Error deleting batch:', error);
        alert('Error deleting batch. Please try again.');
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
        }}>Add New Batch</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>
              Batch Name *
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
              Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
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
              End Date *
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
                minHeight: '20px',
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
            {status === 'submitting' ? 'Adding Batch...' : 'Add Batch'}
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
              Batch added successfully!
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
              Error adding batch. Please try again.
            </div>
          )}
        </form>
      </div>

      {/* Batches List Section */}
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
        }}>Existing Batches</h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {batches.map(batch => (
            <div
              key={batch.id}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: isHovered === batch.id ? '#f8fafc' : 'white',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={() => setIsHovered(batch.id)}
              onMouseLeave={() => setIsHovered('')}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#2d3748',
                  margin: 0
                }}>{batch.name}</h3>
                <button
                  onClick={() => handleDelete(batch.id)}
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
                    e.target.style.backgroundColor = '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  Delete
                </button>
              </div>
              <div style={{
                display: 'flex',
                gap: '16px',
                fontSize: '14px',
                color: '#64748b'
              }}>
                <span>Start: {new Date(batch.startDate).toLocaleDateString()}</span>
                <span>End: {new Date(batch.endDate).toLocaleDateString()}</span>
              </div>
              {batch.description && (
                <p style={{
                  margin: '8px 0 0 0',
                  fontSize: '14px',
                  color: '#64748b'
                }}>
                  {batch.description}
                </p>
              )}
            </div>
          ))}
          {batches.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              color: '#64748b',
              fontSize: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px'
            }}>
              No batches added yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchForm;