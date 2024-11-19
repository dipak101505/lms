import { useState } from 'react';
import TwitchStream from '../components/TwitchStream';
function MeetingsPage() {
  const [currentMeetingId, setCurrentMeetingId] = useState(null);

  return (
    <div>
      <h1>Meetings</h1>
      <TwitchStream />
    </div>
  );
}

export default MeetingsPage;