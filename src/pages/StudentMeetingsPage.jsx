import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

function StudentMeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const meetingsRef = collection(db, 'meetings');
    const q = query(meetingsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meetingsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMeetings(meetingsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="student-meetings">
      <h1>Available Classes</h1>
      
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="meetings-list">
          {meetings.map(meeting => (
            <div key={meeting.id} className="meeting-card">
              <div className="meeting-details">
                <h3>{meeting.subject} - {meeting.topic}</h3>
                <p>Batch: {meeting.batch}</p>
                <p>Status: {meeting.status}</p>
              </div>
              <div className="meeting-actions">
                {meeting.status === 'scheduled' && (
                  <a 
                    href={meeting.joinUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="join-button"
                  >
                    Join Class
                  </a>
                )}
                {meeting.status === 'completed' && meeting.recordingKey && (
                  <Link 
                    to={`/play/${encodeURIComponent(meeting.recordingKey)}`}
                    className="watch-recording"
                  >
                    Watch Recording
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentMeetingsPage;
