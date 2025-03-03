import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';

// Set worker directly
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

function PDFViewer() {
  const { pdfKey } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [scale, setScale] = useState(0.4); // Start zoomed out
  const containerRef = useRef(null);
  const canvasRefs = useRef({});

  useEffect(() => {
    // Add event listeners to prevent common download methods
    const preventContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Prevent keyboard shortcuts for saving/printing
    const preventKeyboardShortcuts = (e) => {
      if ((e.ctrlKey || e.metaKey) && 
          (e.key === 's' || e.key === 'p' || 
          (e.shiftKey && e.key === 's'))) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyboardShortcuts);
    
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
    };
  }, []);

  useEffect(() => {
    const fetchPDF = async () => {
      try {
        setLoading(true);
        const pdfRef = ref(storage, `pdfs/${decodeURIComponent(pdfKey)}`);
        const url = await getDownloadURL(pdfRef);
        
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching PDF:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPDF();
  }, [pdfKey]);

  useEffect(() => {
    const renderAllPages = async () => {
      if (!pdfDocument || !containerRef.current) return;
      
      // Clear any existing canvases
      containerRef.current.innerHTML = '';
      canvasRefs.current = {};
      
      // Create observer to render pages only when visible
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const pageNumber = parseInt(entry.target.dataset.pageNumber, 10);
              renderPage(pageNumber);
              // Stop observing once rendered
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );
      
      // Create placeholder divs for all pages
      for (let i = 1; i <= numPages; i++) {
        const pageContainer = document.createElement('div');
        pageContainer.className = 'page-container';
        pageContainer.dataset.pageNumber = i;
        
        const canvas = document.createElement('canvas');
        canvas.id = `page-${i}`;
        canvasRefs.current[i] = canvas;
        
        const pageNumberDiv = document.createElement('div');
        pageNumberDiv.className = 'page-number';
        pageNumberDiv.textContent = `Page ${i} of ${numPages}`;
        
        pageContainer.appendChild(pageNumberDiv);
        pageContainer.appendChild(canvas);
        containerRef.current.appendChild(pageContainer);
        
        // Start observing the page container
        observer.observe(pageContainer);
      }
      
      // Render the first page immediately
      renderPage(1);
      
      return () => {
        // Clean up observer
        observer.disconnect();
      };
    };
    
    renderAllPages();
  }, [pdfDocument, numPages, scale]);
  
  const renderPage = async (pageNumber) => {
    if (!pdfDocument || !canvasRefs.current[pageNumber]) return;
    
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRefs.current[pageNumber];
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
    } catch (err) {
      console.error(`Error rendering page ${pageNumber}:`, err);
    }
  };

  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.05, 3.0));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.05, 0.15));
  };

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
        <button 
          onClick={() => window.history.back()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
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
    <div 
      className="pdf-container"
      style={{ 
        width: '100%', 
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}
      onCopy={() => false}
      onDragStart={() => false}
    >
      <style>
        {`
          .pdf-container {
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
          }
          .pdf-controls {
            display: flex;
            justify-content: center;
            padding: 10px;
            background-color: #f5f5f5;
            border-bottom: 1px solid #ddd;
            position: sticky;
            top: 0;
            z-index: 100;
          }
          .pdf-controls button {
            margin: 0 5px;
            padding: 5px 10px;
            border: none;
            background-color: #007bff;
            color: white;
            border-radius: 4px;
            cursor: pointer;
          }
          .pdf-controls button:hover {
            background-color: #0056b3;
          }
          .pages-container {
            flex: 1;
            overflow-y: auto;
            background-color: #eee;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .page-container {
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .page-number {
            margin-bottom: 5px;
            color: #666;
            font-size: 0.9rem;
          }
          canvas {
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            background-color: white;
          }
        `}
      </style>
      
      <div className="pdf-controls">
        <button onClick={zoomOut} style={{backgroundColor:'orange', width:'10vw'}}>Zoom Out</button>
        <span style={{ margin: '0 10px', lineHeight: '30px' }}>
          {Math.round(scale * 100)}%
        </span>
        <button onClick={zoomIn} style={{backgroundColor:'orange', width:'10vw'}}>Zoom In</button>
      </div>
      
      <div className="pages-container" ref={containerRef}>
        {/* Pages will be rendered here */}
      </div>
    </div>
  );
}

export default PDFViewer;