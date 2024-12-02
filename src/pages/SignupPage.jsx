import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    batch: '',
    centres: [],
    enrollmentDate: new Date().toISOString().split('T')[0],
    class: '11',
    board: '',
    mobile: '',
    address: '',
    imageUrl: '',
    dob: '',
    school: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [centres, setCentres] = useState([]);
  const [isHovered, setIsHovered] = useState(false);
  const [imageButtonHovered, setImageButtonHovered] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch centres
        const centresRef = collection(db, 'centres');
        const centresSnapshot = await getDocs(centresRef);
        const centresList = centresSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCentres(centresList);

        // Fetch batches
        const batchesRef = collection(db, 'batches');
        const batchesSnapshot = await getDocs(batchesRef);
        const batchesList = batchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBatches(batchesList);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const validateMobile = (mobile) => {
    return /^[0-9]{10}$/.test(mobile);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      setSelectedImage(file);
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imagePreview: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) return '';
    
    const storage = getStorage();
    const imageRef = ref(storage, `student-images/${Date.now()}-${selectedImage.name}`);
    await uploadBytes(imageRef, selectedImage);
    return getDownloadURL(imageRef);
  };

  const handleCentresChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      centres: selectedOptions
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (!validateMobile(formData.mobile)) {
      return setError('Please enter a valid 10-digit mobile number');
    }

    if (!formData.batch) {
      return setError('Please select a batch');
    }

    if (formData.centres.length === 0) {
      return setError('Please select at least one centre');
    }

    try {
      setError('');
      setLoading(true);
      
      // Upload image if selected
      let imageUrl = '';
      if (selectedImage) {
        // Create a canvas to embed text on the image
        const canvas = document.createElement('canvas');
        const img = new Image();
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = formData.imagePreview;
        });

        // Check loaded image dimensions
        if (img.width > 2048 || img.height > 2048) {
          return setError('Image dimensions should be less than 2048x2048 pixels');
        }

        // Set canvas dimensions to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image and add text
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // Configure text style with larger font
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2; // Increased line width for better visibility
        ctx.font = '32px Arial'; // Increased font size from 20px to 32px
        
        // Add name and batch at the bottom of image
        const text = `${formData.name} - ${formData.batch}`;
        const textWidth = ctx.measureText(text).width;
        const x = (canvas.width - textWidth) / 2;
        const y = canvas.height - 30; // Moved up slightly to accommodate larger font
        
        // Draw text with stroke for better visibility
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);

        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        
        // Upload to Firebase Storage
        const storage = getStorage();
        const imageRef = ref(storage, `student-images/${Date.now()}-${selectedImage.name}`);
        await uploadBytes(imageRef, blob);
        imageUrl = await getDownloadURL(imageRef);
      }
      
      // Create authentication user and send verification email
      const userCredential = await signup(formData.email, formData.password);
      await userCredential.user.sendEmailVerification({
        url: window.location.origin + '/login', // Redirect URL after verification
      });
      
      // Create student document with pending status
      const timestamp = new Date();
      console.log(formData);
      const studentData = {
        uid: userCredential.user.uid,
        name: formData.name,
        email: formData.email,
        batch: formData.batch,
        centres: formData.centres,
        enrollmentDate: formData.enrollmentDate,
        class: formData.class,
        board: formData.board,
        mobile: formData.mobile,
        address: formData.address,
        imageUrl: imageUrl,
        dob: formData.dob,
        school: formData.school,
        createdAt: timestamp,
        updatedAt: timestamp,
        status: 'pending',
        emailVerified: false
      };

      const studentsRef = collection(db, 'students');
      await addDoc(studentsRef, studentData);
      
      setVerificationSent(true);
      alert('Please check your email to verify your account before logging in.');
      navigate('/login');
      
    } catch (err) {
      setError('Failed to create account: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '100vh',
      gap: '1rem',
      padding: '0 2rem',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      <div style={{
        background: 'white',
        padding: '1rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        marginTop: '1rem'
      }}>
        {/* Logo and Title */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '0.5rem',
          marginTop: '0rem'
        }}>
          {/* <img 
            src="logo for website.png" 
            alt="Logo" 
            style={{
              width: '120px',
              height: 'auto',
              marginBottom: '0rem'
            }}
          /> */}
          <h2 style={{ color: '#666666', marginTop: '0rem' }}>Student Registration</h2>
        </div>

        {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Personal Information Section */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                style={{
                  width: '80%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                style={{
                  width: '80%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
          </div>

          {/* Contact Information Section */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '0.5rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Mobile Number *</label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                required
                pattern="[0-9]{10}"
                style={{
                  width: '80%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                style={{
                  width: '80%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
          </div>

          {/* Academic Information Section */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '0.5rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Class *</label>
              <select
                value={formData.class}
                onChange={(e) => setFormData({...formData, class: e.target.value})}
                required
                style={{
                  width: '70%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select Class</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>Class {i + 1}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Board *</label>
              <select
                value={formData.board}
                onChange={(e) => setFormData({...formData, board: e.target.value})}
                required
                style={{
                  width: '70%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select Board</option>
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="WB">WB</option>
              </select>
            </div>
          </div>

          {/* Add this after the Academic Information Section and before Batch and Centre Section */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '0.5rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Date of Birth *</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
                required
                style={{
                  width: '80%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>School Name *</label>
              <input
                type="text"
                value={formData.school}
                onChange={(e) => setFormData({...formData, school: e.target.value})}
                required
                style={{
                  width: '80%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
          </div>

          {/* Batch and Centre Section */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '0.5rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Batch *</label>
              <select
                value={formData.batch}
                onChange={(e) => setFormData({...formData, batch: e.target.value})}
                required
                style={{
                  width: '70%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select Batch</option>
                {batches.map(batch => (
                  <option key={batch.id} value={batch.name}>{batch.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Centre *</label>
              <select
                value={formData.centres[0] || ''}
                onChange={(e) => setFormData({...formData, centres: [e.target.value]})}
                required
                style={{
                  width: '70%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select Centre</option>
                {centres.map(centre => (
                  <option key={centre.id} value={centre.name}>{centre.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Password Section */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '0.5rem'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                style={{
                  width: '80%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Confirm Password *</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                required
                style={{
                  width: '80%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
          </div>

          {/* Add this section after the Password Section and before Submit Button */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Profile Picture *</label>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              width: '70%' 
            }}>
              {formData.imagePreview && (
                <img
                  src={formData.imagePreview}
                  alt="Preview"
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid #ccc'
                  }}
                />
              )}
              <input
                type="file"
                ref={fileInputRef}
                required
                onChange={handleImageChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                onMouseEnter={() => setImageButtonHovered(true)}
                onMouseLeave={() => setImageButtonHovered(false)}
                style={{
                  width: '70%',
                  padding: '0.5rem 1rem',
                  backgroundColor: imageButtonHovered ? '#ffa600' : '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {formData.imagePreview ? 'Change Image' : 'Choose Image'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: isHovered ? 'white' : '#ffa600',
              color: isHovered ? '#ffa600' : 'white',
              border: isHovered ? '1px solid #ffa600' : 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              marginTop: '1rem'
            }}
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        {/* Login Link */}
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          Already have an account? {' '}
          <Link to="/login" style={{ color: '#ffa600', textDecoration: 'none' }}>
            Log In
          </Link>
        </div>
      </div>

      {/* Right side image */}
      <div style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        <img 
          src="login.jpg" 
          alt="Login" 
          style={{
            maxWidth: '80%',
            maxHeight: '80%',
            objectFit: 'contain',
            borderRadius: '8px'
          }}
        />
      </div>
    </div>
  );
}

export default SignupPage;
