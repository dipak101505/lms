import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const CentreForm = ({ centres, setCentres }) => {
  const [centreName, setCentreName] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    // Format the name before saving
    const formattedName = centreName.charAt(0).toUpperCase() + centreName.slice(1).toLowerCase();

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
        name: formattedName, // Save the formatted name
        createdAt: new Date()
      });

      setCentres([...centres, { id: docRef.id, name: formattedName }]);
      setStatus('success');
      setCentreName('');
    } catch (error) {
      console.error('Error adding centre:', error);
      setStatus('error');
    }
  };

  return (
    <div className="form-container">
      <h2>Add New Centre</h2>
      {status === 'error' && <div className="error-message">Error adding centre</div>}
      {status === 'success' && <div className="success-message">Centre added successfully!</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Centre Name:</label>
          <input
            type="text"
            value={centreName}
            onChange={(e) => setCentreName(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Adding...' : 'Add Centre'}
        </button>
      </form>
    </div>
  );
};

export default CentreForm;