import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import EditStudentForm from './EditStudentForm';

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const studentsList = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleDelete = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteDoc(doc(db, 'students', studentId));
        setStudents(students.filter(student => student.id !== studentId));
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Error deleting student. Please try again.');
      }
    }
  };

  const handleUpdate = (updatedStudent) => {
    setStudents(students.map(student => 
      student.id === updatedStudent.id ? updatedStudent : student
    ));
    setSelectedStudent(null);
  };

  if (loading) {
    return <div>Loading students...</div>;
  }

  return (
    <div style={{ marginTop: '40px' }}>
      <h2>Students List</h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '20px',
        padding: '20px' 
      }}>
        {students.map(student => (
          <div key={student.id} style={{ 
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '15px',
            backgroundColor: 'white'
          }}>
            <h3>{student.name}</h3>
            <p><strong>Email:</strong> {student.email}</p>
            <p><strong>Batch:</strong> {student.batch}</p>
            <p><strong>Centres:</strong> {student.centres.join(', ')}</p>
            <p><strong>Subjects:</strong> {student.subjects.join(', ')}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button
                onClick={() => setSelectedStudent(student)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0066FF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(student.id)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedStudent && (
        <EditStudentForm
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
};

export default StudentList;