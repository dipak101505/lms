import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

function PDFViewer() {
  const { pdfKey } = useParams();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPDF = async () => {
      try {
        const s3Client = new S3Client({
          region: process.env.REACT_APP_AWS_REGION,
          credentials: {
            accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
          }
        });

        const command = new GetObjectCommand({
          Bucket: 'zenithvideo',
          Key: decodeURIComponent(pdfKey),
        });

        const response = await s3Client.send(command);
        
        // Convert the readable stream to blob
        const chunks = [];
        const reader = response.Body.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const blob = new Blob(chunks, { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching PDF:', err);
        setError('Failed to load PDF');
        setLoading(false);
      }
    };

    fetchPDF();
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
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
        <div>Error: {error}</div>
        <button 
          onClick={() => window.history.back()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ffa600',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
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