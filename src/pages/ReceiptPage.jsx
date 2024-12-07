import { useEffect, useState } from 'react';
import ZenithForm from '../components/ZenithForm';

function ReceiptPage() {
  useEffect(() => {
    // Hide navbar on mount
    const navbar = document.querySelector('nav'); // Adjust selector based on your navbar
    if (navbar) {
      navbar.style.display = 'none';
    }

    // Show navbar on unmount
    return () => {
      if (navbar) {
        navbar.style.display = 'block';
      }
    };
  }, []);

  const [studentData, setStudentData] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const studentDataStr = params.get('studentData');
    if (studentDataStr) {
      setStudentData(JSON.parse(studentDataStr));
    }
  }, []);

  if (!studentData) return null;

  return (
    <div style={{ 
      padding: '20px',
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      <ZenithForm 
        studentData={studentData}
        onClose={() => window.close()}
      />
    </div>
  );
}

export default ReceiptPage; 