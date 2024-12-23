import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

function InvoiceForm({ students }) {
  const [formData, setFormData] = useState({
    studentId: '',
    amount: '',
    month: '',
    paymentMode: 'cash',
    description: ''
  });
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch receipts
  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const receiptsRef = collection(db, 'receipts');
        const q = query(receiptsRef, orderBy('createdAt', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        const receiptsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReceipts(receiptsList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching receipts:', error);
        setLoading(false);
      }
    };

    fetchReceipts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedStudent = students.find(s => s.id === formData.studentId);
      
      // Create invoice document
      await addDoc(collection(db, 'invoices'), {
        ...formData,
        studentName: selectedStudent.name,
        studentEmail: selectedStudent.email,
        createdAt: new Date(),
        status: 'pending',
        receiptId: `INV-${Date.now()}`
      });

      // Reset form
      setFormData({
        studentId: '',
        amount: '',
        month: '',
        paymentMode: 'cash',
        description: ''
      });

      alert('Invoice created successfully!');
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice. Please try again.');
    }
  };

  // Helper function to format payment mode
  const formatPaymentMode = (paymentMode) => {
    if (typeof paymentMode === 'object') {
      // If it's an object, find the first true value
      return Object.keys(paymentMode).find(key => paymentMode[key]) || 'N/A';
    }
    return paymentMode || 'N/A';
  };

  const handleReceiptClick = (receipt) => {
    // Create a new URL with student data as query parameters
    const params = new URLSearchParams({
      studentData: JSON.stringify({
        id: receipt.studentId,
        name: receipt.name,
        email: receipt.studentEmail,
        registrationNo: receipt.registrationNo,
        admissionFee: receipt.admissionFee,
        monthlyInstallment: receipt.tuitionFee,
        month: receipt.month,
        save: false
      })
    });
    
    // Open in new tab using the existing receipt page structure
    window.open(`/receipt?${params.toString()}`, '_blank');
  };

  return (
    <div>

      {/* Receipts List */}
      <div style={{ marginTop: '40px' }}>
        <h3 style={{ color: '#2d3748', marginBottom: '16px' }}>Receipt History</h3>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading receipts...
          </div>
        ) : receipts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            No receipts found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Receipt ID</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Student Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Month</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Payment Mode</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr key={receipt.id} style={{ 
                    borderBottom: '1px solid #e2e8f0',
                    '&:hover': { backgroundColor: '#f8fafc' }
                  }}>
                    <td style={{ padding: '12px' }}>
                      {receipt.createdAt instanceof Date 
                        ? receipt.createdAt.toLocaleDateString()
                        : typeof receipt.createdAt === 'string'
                        ? new Date(receipt.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td 
                      style={{ 
                        padding: '12px', 
                        cursor: 'pointer',
                        color: '#2563eb',
                        textDecoration: 'underline'
                      }}
                      onClick={() => handleReceiptClick(receipt)}
                    >
                      {receipt.id}
                    </td>
                    <td style={{ padding: '12px' }}>{receipt.name}</td>
                    <td style={{ padding: '12px' }}>₹{receipt.total}</td>
                    <td style={{ padding: '12px' }}>
                      {receipt.month ? new Date(receipt.month).toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      }) : 'N/A'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        textTransform: 'capitalize'
                      }}>
                        {formatPaymentMode(receipt.paymentMode)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default InvoiceForm;
