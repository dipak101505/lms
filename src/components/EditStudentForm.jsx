import React, { useState } from 'react';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

const EditStudentForm = ({ student, onClose, onUpdate, batches, subjects, centres }) => {
  const [formData, setFormData] = useState({
    name: student.name,
    email: student.email,
    batch: student.batch,
    centres: student.centres || [],
    subjects: student.subjects || [],
    enrollmentDate: student.enrollmentDate,
    imageUrl: student.imageUrl || '',
    class: student.class || '',
    board: student.board || ''
  });
  const [status, setStatus] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(student.imageUrl);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') {
      const formattedName = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      setFormData(prev => ({ ...prev, [name]: formattedName }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubjectsChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      subjects: selectedOptions
    }));
  };

  const handleCentresChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      centres: selectedOptions
    }));
  };

  const addTextToImage = (imageFile, text) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Configure text style
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.font = `bold ${img.width * 0.05}px Arial`; // Responsive font size

        // Add text shadow for better visibility
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 7;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Add name and batch at bottom
        const name = formData.name || student.name || 'Name';
        const batch = formData.batch || student.batch || 'Batch';
        const padding = img.width * 0.05;
        const bottomPadding = img.height * 0.05;

        // Draw name
        ctx.fillText(
          name, 
          padding, 
          img.height - bottomPadding - (img.width * 0.05)
        );
        ctx.strokeText(
          name, 
          padding, 
          img.height - bottomPadding - (img.width * 0.05)
        );

        // Draw batch
        ctx.fillText(
          batch, 
          padding, 
          img.height - bottomPadding
        );
        ctx.strokeText(
          batch, 
          padding, 
          img.height - bottomPadding
        );

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          resolve(new File([blob], 'student-image.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.9);
      };
    });
  };

  const uploadImage = async () => {
    if (!imageFile) return formData.imageUrl;

    try {
      const processedImage = await addTextToImage(imageFile);
      const fileName = `student-images/${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);

      const snapshot = await uploadBytes(storageRef, processedImage);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const processedImage = await addTextToImage(file);
      const previewUrl = URL.createObjectURL(processedImage);
      setImagePreview(previewUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      const imageUrl = await uploadImage();
      
      const studentRef = doc(db, 'students', student.id);
      await updateDoc(studentRef, {
        ...formData,
        imageUrl,
        updatedAt: new Date()
      });

      onUpdate({ id: student.id, ...formData, imageUrl });
      setStatus('success');
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      console.error('Error updating student:', error);
      setStatus('error');
      alert('Error updating student: ' + error.message);
    }
  };

  return (
    <div className="modal-overlay" style={{
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
        <h2>Edit Student</h2>
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
              Class *
              <select
                name="class"
                value={formData.class}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="">Select Class</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Class {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Board *
              <select
                name="board"
                value={formData.board}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="">Select Board</option>
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="WB">WB</option>
              </select>
            </label>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Centres *
              <select
                multiple
                name="centres"
                value={formData.centres}
                onChange={handleCentresChange}
                required
                style={{ width: '100%', padding: '8px', height: '120px' }}
              >
                {centres.map(centre => (
                  <option key={centre.id} value={centre.name}>
                    {centre.name}
                  </option>
                ))}
              </select>
              <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                Hold Ctrl (Cmd on Mac) to select multiple centres
              </small>
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

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Profile Image
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ width: '100%', padding: '8px' }}
              />
            </label>
            {imagePreview && (
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <img
                  src={imagePreview}
                  alt="Student"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    borderRadius: '4px'
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="submit"
              disabled={status === 'submitting'}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: status === 'submitting' ? '#ccc' : '#0066FF',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: status === 'submitting' ? 'not-allowed' : 'pointer'
              }}
            >
              {status === 'submitting' ? 'Updating...' : 'Update Student'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px',
                backgroundColor: '#f0f0f0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>

          {status === 'success' && (
            <div style={{ color: 'green', marginTop: '10px', textAlign: 'center' }}>
              Student updated successfully!
            </div>
          )}
          {status === 'error' && (
            <div style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>
              Error updating student. Please try again.
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EditStudentForm;