import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const BatchForm = ({ batches, setBatches }) => {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    description: ''
  });
  const [status, setStatus] = useState('');

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

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h2>Add New Batch</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Batch Name *
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
            Start Date *
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </label>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            End Date *
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
          {status === 'submitting' ? 'Adding Batch...' : 'Add Batch'}
        </button>

        {status === 'success' && (
          <div style={{ color: 'green', textAlign: 'center' }}>Batch added successfully!</div>
        )}
        {status === 'error' && (
          <div style={{ color: 'red', textAlign: 'center' }}>Error adding batch. Please try again.</div>
        )}
      </form>
    </div>
  );
};

export default BatchForm;