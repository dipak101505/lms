import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { getAuth } from 'firebase/auth';

const StudentForm = () => {
  const { createUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    batch: '',
    subjects: [],
    enrollmentDate: new Date().toISOString().split('T')[0]
  });
  const [status, setStatus] = useState('');
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Fetch batches and subjects from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        const batchesSnapshot = await getDocs(collection(db, 'batches'));
        const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
        
        setBatches(batchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
        
        setSubjects(subjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubjectsChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      subjects: selectedOptions
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      await createUser(formData.email, formData.email);

      const studentsRef = collection(db, 'students');
      await addDoc(studentsRef, {
        ...formData,
        createdAt: new Date(),
        status: 'active'
      });

      setStatus('success');
      setFormData({
        name: '',
        email: '',
        batch: '',
        subjects: [],
        enrollmentDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error adding student:', error);
      setStatus('error');
      
      if (error.code === 'auth/email-already-in-use') {
        alert('An account with this email already exists.');
      } else {
        alert('Error creating student account: ' + error.message);
      }
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <h2>Add New Student</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Name *
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Email *
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Batch *
            <select
              name="batch"
              value={formData.batch}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px' }}
            >
              <option value="">Select Batch</option>
              {batches.map(batch => (
                <option key={batch.id} value={batch.name}>
                  {batch.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Subjects *
            <select
              multiple
              name="subjects"
              value={formData.subjects}
              onChange={handleSubjectsChange}
              required
              style={{ width: '100%', padding: '8px', height: '120px' }}
            >
              {subjects.map(subject => (
                <option key={subject.id} value={subject.name}>
                  {subject.name}
                </option>
              ))}
            </select>
            <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
              Hold Ctrl (Cmd on Mac) to select multiple subjects
            </small>
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Enrollment Date *
            <input
              type="date"
              name="enrollmentDate"
              value={formData.enrollmentDate}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: status === 'submitting' ? '#ccc' : '#0066FF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: status === 'submitting' ? 'not-allowed' : 'pointer'
          }}
        >
          {status === 'submitting' ? 'Adding Student...' : 'Add Student'}
        </button>

        {status === 'success' && (
          <div style={{ color: 'green', marginTop: '10px', textAlign: 'center' }}>
            Student added successfully!
          </div>
        )}

        {status === 'error' && (
          <div style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>
            Error adding student. Please try again.
          </div>
        )}
      </form>
    </div>
  );
};

export default StudentForm;