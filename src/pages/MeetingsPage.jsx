import { useState } from 'react';
import ZoomMeetingStarter from '../components/ZoomMeetingStarter';
import ZoomRecorder from '../components/ZoomRecorder';
import VideoPlayer from '../components/VideoPlayer';

function MeetingsPage() {
  const [currentMeetingId, setCurrentMeetingId] = useState(null);

  return (
    <div>
      <h1>Meetings</h1>
      <ZoomMeetingStarter onMeetingCreated={setCurrentMeetingId} />
      {currentMeetingId && <ZoomRecorder meetingId={currentMeetingId} />}
      <VideoPlayer 
        bucketName="zenithvideo"
        videoKey={currentMeetingId ? `lecture-${currentMeetingId}.mp4` : null}
      />
    </div>
  );
}

export default MeetingsPage;