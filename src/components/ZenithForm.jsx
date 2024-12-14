'use client'

import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';


const ZenithForm = ({ studentData, onClose }) => {
  const { user } = useAuth();
  console.log(studentData);

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().slice(0, 7);

  const generateRegistrationNumber = () => {
    const now = new Date();
    return parseInt(now.getTime().toString().slice(-8));
  };

  const [formData, setFormData] = useState({
    registrationNo: generateRegistrationNumber(),
    date: today,
    name: studentData?.name || '',
    month: currentMonth,
    admissionFee: '',
    tuitionFee: studentData?.monthlyInstallment || 0,
    chequeNo: '',
    paymentMode: {
      cash: false,
      cheque: false,
      online: false,
    },
    subjects: {
      maths: studentData?.subjects?.includes('Mathematics') || false,
      physics: studentData?.subjects?.includes('Physics') || false,
      chemistry: studentData?.subjects?.includes('Chemistry') || false,
      biology: studentData?.subjects?.includes('Biology') || false,
      AI: studentData?.subjects?.includes('AI') || false,
      Robotics: studentData?.subjects?.includes('Robotics') || false
    }
  });

  const numberToWords = (num) => {
    const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';

    const formatTens = (n) => {
      if (n < 10) return single[n];
      if (n < 20) return double[n - 10];
      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + single[n % 10] : '');
    };

    const convert = (n) => {
      if (n < 100) return formatTens(n);
      if (n < 1000) return single[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + formatTens(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    };

    return `${convert(num)} Rupees Only`;
  };

  const handleNumericInput = (e, field) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, [field]: value });
  };

  const saveToFirestore = async () => {
    try {
      const receiptData = {
        ...formData,
        loginId: user.uid,
        timestamp: new Date(),
        total: calculateTotal(),
        registrationNo: formData.registrationNo,
        createdAt: new Date().toISOString(),
        status: 'completed',
        printCount: 1
      };

      const docRef = await addDoc(collection(db, "receipts"), receiptData);
      console.log("Receipt saved with ID:", docRef.id);
      return docRef.id;

    } catch (error) {
      console.error("Error saving receipt:", error);
      throw error; // Re-throw to be caught by handlePrint
    }
  };
  

  const handleSubjectChange = (subject) => {
    setFormData({
      ...formData,
      subjects: {
        ...formData.subjects,
        [subject]: !formData.subjects[subject]
      }
    });
  };

  const handlePaymentModeChange = (mode) => {
    setFormData({
      ...formData,
      paymentMode: {
        cash: mode === 'cash',
        cheque: mode === 'cheque',
        online: mode === 'online'
      },
      chequeNo: mode === 'cash' || mode === 'online' ? '' : formData.chequeNo
    });
  };

  const calculateTotal = () => {
    const admission = parseInt(formData.admissionFee) || 0;
    const tuition = parseInt(formData.tuitionFee) || 0;
    return admission + tuition;
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  useEffect(() => {
    const printStyles = document.createElement('style');
    printStyles.textContent = `
      @media print {
        @page {
          size: A4;
          margin: 5mm;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        input {
          border: none !important;
          outline: none !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(printStyles);
    return () => document.head.removeChild(printStyles);
  }, []);

  const handlePrint = async () => {
    try {
      // Validate required fields
      if (!formData.name || (!formData.admissionFee && !formData.tuitionFee)) {
        alert('Please fill in all required fields');
        return;
      }

      // Check if at least one payment mode is selected
      if (!formData.paymentMode.cash && !formData.paymentMode.cheque && !formData.paymentMode.online) {
        alert('Please select a payment mode');
        return;
      }

      // If cheque is selected, ensure cheque number is provided
      if (formData.paymentMode.cheque && !formData.chequeNo) {
        alert('Please enter the cheque number');
        return;
      }

      // Save receipt first
      const receiptId = await saveToFirestore();

      // Update student document with payment info
      if (studentData?.id) {
        const studentRef = doc(db, 'students', studentData.id);
        const studentDoc = await getDoc(studentRef);
        
        if (studentDoc.exists()) {
          const payments = studentDoc.data().payments || [];
          const newPayment = {
            month: formData.month,
            amount: calculateTotal(),
            receiptId: receiptId,
            timestamp: new Date().toISOString(),
            admissionFee: parseInt(formData.admissionFee) || 0,
            tuitionFee: parseInt(formData.tuitionFee) || 0,
            paymentMode: Object.keys(formData.paymentMode).find(key => formData.paymentMode[key]) || 'unknown'
          };

          await updateDoc(studentRef, {
            payments: [...payments, newPayment],
            amountPending: studentDoc.data().amountPending - calculateTotal()
          });
        }
      }

      // Trigger print
      window.print();


      // Optional: Clear form or show success message
      alert('Receipt saved and printed successfully!');
      
      // Optional: Close the form
      onClose();

    } catch (error) {
      console.error('Error processing receipt:', error);
      alert('Error saving or printing receipt. Please try again.');
    }
  };

  useEffect(() => {
    const printStyles = document.createElement('style');
    printStyles.textContent = `
      @media print {
        @page {
          size: A4;
          margin: 5mm;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        input {
          border: none !important;
          outline: none !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(printStyles);
    return () => document.head.removeChild(printStyles);
  }, []);

  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      minWidth: '100vw',
      // padding: '2rem',
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px'
    },
    container: {
      // maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: 'white',
      padding: '2rem',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      borderRadius: '8px',
      fontSize: '26px'
    },
    form: {
      border: '2px solid #e2e8f0',
      padding: '2rem',
      borderRadius: '4px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem',
      paddingBottom: '1rem',
      borderBottom: '1px solid #e2e8f0'
    },
    logo: {
      width: '200px',
      height: 'auto'
    },
    officeCopy: {
      fontStyle: 'italic',
      textDecoration: 'underline'
    },
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '1rem'
    },
    label: {
      color: '#475569',
      fontWeight: '500',
      marginRight: '0.5rem',
      marginTop: '0.5rem',
      fontSize: '26px'
    },
    input: {
      border: 'none',
      borderBottom: '1px solid #cbd5e1',
      padding: '0.25rem',
      outline: 'none',
      minWidth: '126px',
      fontSize: '26px'
    },
    subjectsContainer: {
      display: 'flex',
      gap: '1rem',
      padding: '1rem',
      backgroundColor: '#f8fafc',
      borderRadius: '4px',
      marginBottom: '1rem',
      flexWrap: 'wrap'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      cursor: 'pointer'
    },
    checkbox: {
      width: '32px',
      height: '32px',
      cursor: 'pointer'
    },
    particulars: {
      marginTop: '0rem',
      backgroundColor: '#f8fafc',
      padding: '0.5rem',
      borderRadius: '4px',
      fontSize: '32px',
      fontWeight: '500'
    },
    feeRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem',
      padding: '0.5rem'
    },
    total: {
      display: 'inline-block',
      border: '2px solid #1e40af',
      padding: '0.5rem 1rem',
      marginTop: '1rem',
      fontWeight: '500'
    },
    inWords: {
      marginTop: '0rem',
      padding: '1rem',
      backgroundColor: '#f8fafc',
      borderRadius: '4px'
    },
    paymentSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      flexWrap: 'wrap'
    },
    paymentOptions: {
      display: 'flex',
      gap: '1rem',
      alignItems: 'center'
    },
    chequeInput: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    signature: {
      marginTop: '3rem',
      textAlign: 'right',
      paddingRight: '2rem'
    },
    signatureLine: {
      borderTop: '1px solid #94a3b8',
      display: 'inline-block',
      paddingTop: '0.5rem',
      width: '200px',
      textAlign: 'center'
    },
    buttonContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '1rem',
      marginTop: '1.5rem'
    },
    printButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1.5rem',
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '26px'
    },
    logoutButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1.5rem',
      backgroundColor: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '26px'
    }
  };

  const renderForm = (isOfficeCopy) => (
    <div style={styles.container}>
      <div style={styles.form}>
        <div style={styles.header}>
          <div>
            <img
              src="/zenithLogo.png"
              alt="Zenith"
              width={200}
              height={50}
              style={styles.logo}
            />
          </div>
          <div style={styles.officeCopy}>{isOfficeCopy ? 'Office Copy' : 'Student Copy'}</div>
        </div>

        <div style={styles.row}>
          <div>
            <label style={styles.label}>Registration No:</label>
            <input
              type="number"
              style={styles.input}
              value={formData.registrationNo}
              onChange={(e) => setFormData({
                ...formData,
                registrationNo: parseInt(e.target.value) || 0
              })}
            />
          </div>
          <div>
            <label style={styles.label}>Date:</label>
            <input
              type="date"
              style={styles.input}
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>
        </div>

        <div style={styles.row}>
          <label style={styles.label}>Name:</label>
          <input
            style={{...styles.input, width: '80%'}}
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>

        <div style={styles.subjectsContainer}>
          {Object.entries(formData.subjects).map(([subject, checked]) => (
            <label key={subject} style={styles.checkboxLabel}>
              <input
                type="checkbox"
                style={styles.checkbox}
                checked={checked}
                onChange={() => handleSubjectChange(subject)}
              />
              {subject.charAt(0).toUpperCase() + subject.slice(1)}
            </label>
          ))}
        </div>

        <div style={styles.row}>
          <label style={styles.label}>Month:</label>
          <input
            type="month"
            style={{...styles.input, width: '80%'}}
            value={formData.month}
            onChange={(e) => setFormData({...formData, month: e.target.value})}
          />
        </div>

        <div style={styles.particulars}>
          <span style={{marginBottom: '0.2rem', fontWeight: '500'}}>Particulars:</span>
          
          <div style={styles.feeRow}>
            <span>1. Admission Fee</span>
            <input
              style={{...styles.input, textAlign: 'right'}}
              value={formData.admissionFee}
              onChange={(e) => handleNumericInput(e, 'admissionFee')}
            />
          </div>

          <div style={styles.feeRow}>
            <span>2. Tuition Fee</span>
            <input
              style={{...styles.input, textAlign: 'right'}}
              value={formData.tuitionFee}
              onChange={(e) => handleNumericInput(e, 'tuitionFee')}
            />
          </div>

          <div style={{textAlign: 'right'}}>
            <span style={styles.total}>
              Total: {formatCurrency(calculateTotal())}
            </span>
          </div>
        </div>

        <div style={styles.inWords}>
          <span style={styles.label}>In words:</span>
          <span style={{fontStyle: 'italic', marginLeft: '0.5rem'}}>
            {numberToWords(calculateTotal())}
          </span>
        </div>

        <div style={styles.row}>
          <div style={styles.paymentSection}>
            <label style={styles.label}>Paid By:</label>
            <div style={styles.paymentOptions}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={formData.paymentMode.cash}
                  onChange={() => handlePaymentModeChange('cash')}
                />
                Cash
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={formData.paymentMode.cheque}
                  onChange={() => handlePaymentModeChange('cheque')}
                />
                Cheque
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={formData.paymentMode.online}
                  onChange={() => handlePaymentModeChange('online')}
                />
                Online
              </label>
            </div>
            {formData.paymentMode.cheque && (
              <div style={styles.chequeInput}>
                <label style={styles.label}>Cheque No:</label>
                <input
                  style={styles.input}
                  value={formData.chequeNo}
                  onChange={(e) => setFormData({...formData, chequeNo: e.target.value})}
                />
              </div>
            )}
          </div>
        </div>

        <div style={styles.signature}>
          <div style={styles.signatureLine}>Admin Signature</div>
        </div>
      </div>
    </div>
  );


  return (
    <div>
      <div >
        {renderForm(true)}
        <div style={{marginTop: '6rem'}}>
          {renderForm(false)}
          </div>
       </div>

      {/* Print Button Container */}
      <div style={styles.buttonContainer} className="no-print">
        <button onClick={handlePrint} style={styles.printButton}>
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2z"/>
          </svg>
          Print Receipt
        </button>
        <button onClick={onClose} style={styles.cancelButton}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ZenithForm;