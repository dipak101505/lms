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
    imageUrl: ''
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
      
      // Create authentication user
      const userCredential = await signup(formData.email, formData.password);
      
      // Create student document
      const timestamp = new Date();
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
        createdAt: timestamp,
        updatedAt: timestamp,
        status: 'pending'
      };

      const studentsRef = collection(db, 'students');
      await addDoc(studentsRef, studentData);
      
      setVerificationSent(true);
    } catch (err) {
      setError('Failed to create account: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Student Registration</h2>
        
        {verificationSent ? (
          <div className="verification-sent">
            <h3>Verify Your Email</h3>
            <p>A verification link has been sent to {formData.email}</p>
            <p>Please check your email and verify your account before logging in.</p>
            <p>Your account will be reviewed by an administrator.</p>
            <button 
              onClick={() => navigate('/login')}
              className="auth-button"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                  required
                  pattern="[0-9]{10}"
                />
              </div>

              <div className="form-group">
                <label>Class *</label>
                <select
                  name="class"
                  value={formData.class}
                  onChange={(e) => setFormData({...formData, class: e.target.value})}
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
              </div>

              <div className="form-group">
                <label>Board *</label>
                <select
                  name="board"
                  value={formData.board}
                  onChange={(e) => setFormData({...formData, board: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="">Select Board</option>
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE">ICSE</option>
                  <option value="WB">WB</option>
                </select>
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Profile Picture</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {formData.imagePreview && (
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Choose Image
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Batch *</label>
                <select
                  name="batch"
                  value={formData.batch}
                  onChange={(e) => setFormData({...formData, batch: e.target.value})}
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
              </div>

              <div className="form-group">
                <label>Centres *</label>
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
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="auth-button"
              >
                {loading ? 'Creating Account...' : 'Register'}
              </button>
            </form>
            <div className="auth-links">
              Already have an account? <Link to="/login">Log In</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SignupPage;