import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

const CentreForm = ({ centres, setCentres }) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contactPerson: '',
    phone: '',
    email: ''
  });
  const [status, setStatus] = useState('');
  const [isHovered, setIsHovered] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    // Format the name before saving
    const formattedName = formData.name.charAt(0).toUpperCase() + formData.name.slice(1).toLowerCase();

    // Check if centre name already exists
    const centreExists = centres.some(
      centre => centre.name.toLowerCase() === formattedName.toLowerCase()
    );

    if (centreExists) {
      setStatus('error');
      alert('A centre with this name already exists. Please choose a different name.');
      return;
    }

    try {
      const centresRef = collection(db, 'centres');
      const docRef = await addDoc(centresRef, {
        ...formData,
        name: formattedName,
        createdAt: new Date(),
        status: 'active'
      });

      setCentres([...centres, { id: docRef.id, ...formData, name: formattedName }]);
      setFormData({
        name: '',
        location: '',
        contactPerson: '',
        phone: '',
        email: ''
      });
      setStatus('success');
    } catch (error) {
      console.error('Error adding centre:', error);
      setStatus('error');
    }
  };

  const handleDelete = async (centreId) => {
    if (window.confirm('Are you sure you want to delete this centre?')) {
      try {
        await deleteDoc(doc(db, 'centres', centreId));
        setCentres(centres.filter(centre => centre.id !== centreId));
      } catch (error) {
        console.error('Error deleting centre:', error);
        alert('Error deleting centre. Please try again.');
      }
    }
  };

  const inputStyle = {
    width: 'fit-content',
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
        }}>Add New Centre</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>
                Centre Name *
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
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>
                Contact Person *
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
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
                Phone *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
          </div>

          <div>
            <label style={labelStyle}>
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
            {status === 'submitting' ? 'Adding Centre...' : 'Add Centre'}
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
              Centre added successfully!
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
              Error adding centre. Please try again.
            </div>
          )}
        </form>
      </div>

      {/* Centres List Section */}
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
        }}>Existing Centres</h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {centres.map(centre => (
            <div
              key={centre.id}
              style={{
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: isHovered === centre.id ? '#f8fafc' : 'white',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={() => setIsHovered(centre.id)}
              onMouseLeave={() => setIsHovered('')}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#2d3748',
                    margin: '0 0 4px 0'
                  }}>{centre.name}</h3>
                  <span style={{
                    fontSize: '14px',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {centre.location}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(centre.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    color: '#dc2626',
                    border: '1px solid #dc2626',
                    borderRadius: '6px',
                    width: 'fit-content',
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
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                fontSize: '14px',
                color: '#4a5568'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  {centre.contactPerson}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  {centre.phone}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  gridColumn: '1 / -1'
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span style={{ wordBreak: 'break-all' }}>{centre.email}</span>
                </div>
              </div>
            </div>
          ))}
          {centres.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              color: '#64748b',
              fontSize: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px'
            }}>
              No centres added yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CentreForm;