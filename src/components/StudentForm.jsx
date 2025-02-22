import React, { useState } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

const StudentForm = ({ onStudentAdded, onClose, batches, subjects, centres }) => {
  const { createUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    batch: '',
    centres: [],
    subjects: [],
    enrollmentDate: new Date().toISOString().split('T')[0],
    imageUrl: '',
    class: '11',
    board: '',
    mobile: '',
    address: '',
    password: '',
    confirmPassword: '',
    dob: '',
    school: ''
  });
  const [status, setStatus] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [passwordError, setPasswordError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') {
      const formattedName = value
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
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

        // Add name at bottom left
        const name = formData.name || 'Name';
        const batch = formData.batch || 'Batch';
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
    if (!imageFile) return null;

    try {
      // Add text overlay to image
      const processedImage = await addTextToImage(imageFile, formData.name);
      
      const fileName = `student-images/${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);

      const snapshot = await uploadBytes(storageRef, processedImage);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Create preview with text overlay
      const processedImage = await addTextToImage(file);
      const previewUrl = URL.createObjectURL(processedImage);
      setImagePreview(previewUrl);
    }
  };

  const validatePasswords = () => {
    if (formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    if (!validatePasswords()) {
      setStatus('error');
      return;
    }

    try {
      // Create Firebase auth user first
      const userCredential = await createUser(formData.email, formData.password);
      const uid = userCredential.user.uid;

      // Upload image
      const imageUrl = await uploadImage();
      
      // Create a new object without password fields
      const { password, confirmPassword, ...studentData } = formData;
      
      // Create timestamp for both createdAt and updatedAt
      const timestamp = new Date();

      // Add student with image URL and uid
      const studentsRef = collection(db, 'students');
      const docRef = await addDoc(studentsRef, {
        ...studentData,
        uid,
        imageUrl,
        createdAt: timestamp,
        updatedAt: timestamp,
        status: 'active'
      });

      const newStudent = { 
        id: docRef.id, 
        ...studentData,
        imageUrl 
      };
      
      if (onStudentAdded) {
        onStudentAdded(newStudent);
      }

      setStatus('success');
      onClose();
    } catch (error) {
      console.error('Error adding student:', error);
      setStatus('error');
      alert('Error creating student: ' + error.message);
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
            Password *
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength="6"
              style={{ width: '100%', padding: '8px' }}
            />
            <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
              Password must be at least 6 characters long
            </small>
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Confirm Password *
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              minLength="6"
              style={{ width: '100%', padding: '8px' }}
            />
          </label>
        </div>

        {passwordError && (
          <div style={{ color: 'red', marginBottom: '15px', textAlign: 'center' }}>
            {passwordError}
          </div>
        )}

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
            Mobile Number *
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleInputChange}
              required
              pattern="[0-9]{10}"
              style={{ width: '100%', padding: '8px' }}
            />
            <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
              Enter 10-digit mobile number
            </small>
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Address *
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              style={{ 
                width: '100%', 
                padding: '8px',
                minHeight: '100px',
                resize: 'vertical'
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Date of Birth *
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            School Name *
            <input
              type="text"
              name="school"
              value={formData.school}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Profile Image *
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </label>
          {imagePreview && (
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              <img
                src={imagePreview}
                alt="Preview"
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

        <button
          type="submit"
          disabled={status === 'submitting'}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: status === 'submitting' ? '#ccc' : '#ffa600',
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