import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const SubjectForm = ({ subjects, setSubjects }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    // Format the name before saving
    const formattedData = {
      ...formData,
      name: formData.name.charAt(0).toUpperCase() + formData.name.slice(1).toLowerCase()
    };

    try {
      const subjectsRef = collection(db, 'subjects');
      const docRef = await addDoc(subjectsRef, {
        ...formattedData,
        createdAt: new Date(),
        status: 'active'
      });

      setSubjects([...subjects, { id: docRef.id, ...formattedData }]);
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

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h2>Add New Subject</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Subject Name *
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </label>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Subject Code *
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </label>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Description
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '8px', minHeight: '100px' }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          style={{
            padding: '10px',
            backgroundColor: status === 'submitting' ? '#ccc' : '#0066FF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: status === 'submitting' ? 'not-allowed' : 'pointer'
          }}
        >
          {status === 'submitting' ? 'Adding Subject...' : 'Add Subject'}
        </button>

        {status === 'success' && (
          <div style={{ color: 'green', textAlign: 'center' }}>Subject added successfully!</div>
        )}
        {status === 'error' && (
          <div style={{ color: 'red', textAlign: 'center' }}>Error adding subject. Please try again.</div>
        )}
      </form>
    </div>
  );
};

export default SubjectForm;