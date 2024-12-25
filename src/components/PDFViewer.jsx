import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

function PDFViewer() {
  const { pdfKey } = useParams();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPDF = async () => {
      try {
        const pdfRef = ref(storage, `pdfs/${decodeURIComponent(pdfKey)}`);
        const url = await getDownloadURL(pdfRef);
        setPdfUrl(url);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching PDF:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPDF();
  }, [pdfKey]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading PDF...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: '#dc3545',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div>Error loading PDF: {error}</div>
        <button onClick={() => window.history.back()}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <iframe
        src={pdfUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none'
        }}
        title="PDF Viewer"
      />
    </div>
  );
}

export default PDFViewer;