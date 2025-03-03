import React, { useState } from 'react';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { getAuth } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { upsertStudent } from '../services/studentService';

const EditStudentForm = ({ student, onClose, onUpdate, batches, subjects, centres }) => {

  
  const formatBatchValue = (batchValue) => {
    if (!batchValue) return [];
    if (Array.isArray(batchValue)) return batchValue;
    return [batchValue];
  };
  
  const [formData, setFormData] = useState({
    name: student.name,
    email: student.email,
    batch: formatBatchValue(student.batch),
    centres: student.centres || [],
    subjects: student.subjects || [],
    enrollmentDate: student.enrollmentDate,
    imageUrl: student.imageUrl || '',
    class: student.class || '',
    board: student.board || '',
    mobile: student.mobile || '',
    address: student.address || '',
    status: student.status || 'inactive',
    dob: student.dob || '',
    school: student.school || '',
    amountPending: student.amountPending || 0,
    paymentType: student.paymentType || 'lumpsum',
    monthlyInstallment: student.monthlyInstallment || 0,
    chatIds: student.chatIds || [],
  });
  const [status, setStatus] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(student.imageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const { isFranchise} = useAuth();


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

  const handleBatchesChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      batch: selectedOptions
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
        const batches = formData.batch.join(', ') || 'No Batch';
        ctx.fillText(
          batches,
          padding,
          img.height - bottomPadding
        );
        ctx.strokeText(
          batches,
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

    setIsUploading(true);
    try {
      const processedImage = await addTextToImage(imageFile);
      const fileName = `student-images/${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);

      const snapshot = await uploadBytes(storageRef, processedImage);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setIsUploading(false);
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

  const validateMobile = (mobile) => {
    return /^[0-9]{10}$/.test(mobile);
  };

  const handleUserStatusToggle = async (uid, enabled) => {
    try {
      const auth = getAuth();
      await auth.updateUser(uid, {
        disabled: !enabled
      });
      return true;
    } catch (error) {
      console.error('Error updating user status:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateMobile(formData.mobile)) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    setStatus('submitting');

    try {
      const imageUrl = imageFile ? await uploadImage() : formData.imageUrl;
      const studentRef = doc(db, 'students', student.id);
      
      await updateDoc(studentRef, {
        ...formData,
        imageUrl: imageUrl || formData.imageUrl,
        updatedAt: new Date()
      });

      await upsertStudent({
        ...formData,
        imageUrl: imageUrl || formData.imageUrl,
        updatedAt: new Date().toISOString()
      });
      
      // Update user authentication status if uid exists
      if (student.uid) {
        const success = await handleUserStatusToggle(student.uid, formData.status === 'active');
        if (!success) {
          alert('Warning: Student data updated but account status change failed');
        }
      }

      onUpdate({ 
        id: student.id, 
        ...formData, 
        imageUrl: imageUrl || formData.imageUrl 
      });
      
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
        overflowY: 'auto',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '10px',
            top: '10px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '5px'
          }}
        >
          ×
        </button>
        <h2>Edit Student</h2>
        <div style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
          Last Updated: {new Date(student.updatedAt?.toDate()).toLocaleString()}
        </div>
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
              Batches *
              <select
                multiple
                name="batches"
                value={formData.batch}
                onChange={handleBatchesChange}
                required
                style={{ width: '100%', padding: '8px', height: '120px' }}
              >
                {batches.map(batch => (
                  <option key={batch.id} value={batch.name}>
                    {batch.name}
                  </option>
                ))}
              </select>
              <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                Hold Ctrl (Cmd on Mac) to select multiple batches
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
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer' 
            }}>
              <input
                type="checkbox"
                checked={formData.status === 'active'}
                onChange={(e) => {
                  const newStatus = e.target.checked ? 'active' : 'inactive';
                  setFormData(prev => ({
                    ...prev,
                    status: newStatus
                  }));

                }}
                style={{ width: '20px', height: '20px' }}
              />
              <span>Active Status ({formData.status})</span>
            </label>
            <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
              Inactive students will not be able to access the platform
            </small>
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
            {isUploading && (
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                Uploading image...
              </div>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Amount Pending
            </label>
            <input
              type="number"
              name="amountPending"
              value={formData.amountPending}
              onChange={handleInputChange}
              // min="0"
              style={{ width: '100%', padding: '8px' }}
              disabled={isFranchise && student.amountPending > 0}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Payment Type
              <div style={{ marginTop: '5px' }}>
                <label style={{ 
                  marginRight: '20px', 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  cursor: 'pointer' 
                }}>
                  <input
                    type="radio"
                    name="paymentType"
                    value="lumpsum"
                    checked={formData.paymentType === 'lumpsum'}
                    onChange={handleInputChange}
                    style={{ marginRight: '5px' }}
                  />
                  Lump Sum
                </label>
                <label style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  cursor: 'pointer' 
                }}>
                  <input
                    type="radio"
                    name="paymentType"
                    value="recurring"
                    checked={formData.paymentType === 'recurring'}
                    onChange={handleInputChange}
                    style={{ marginRight: '5px' }}
                  />
                  Recurring
                </label>
              </div>
            </label>
          </div>

          {formData.paymentType === 'recurring' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Monthly Installment
                <input
                  type="number"
                  name="monthlyInstallment"
                  value={formData.monthlyInstallment}
                  onChange={handleInputChange}
                  min="0"
                  style={{ 
                    width: '100%', 
                    padding: '8px',
                    marginTop: '5px' 
                  }}
                />
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="submit"
              disabled={status === 'submitting'}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: status === 'submitting' ? '#ccc' : '#ffa600',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: status === 'submitting' ? 'not-allowed' : 'pointer'
              }}
            >
              {status === 'submitting' ? 'Updating...' : 'Update Student'}
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
