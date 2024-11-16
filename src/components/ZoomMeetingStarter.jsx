import { useState } from 'react';
import axios from 'axios';
import { Buffer } from 'buffer';

const ZoomMeetingStarter = ({ onMeetingCreated }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [error, setError] = useState(null);

  const getAccessToken = async () => {
    try {
      const credentials = Buffer.from(
        `${process.env.REACT_APP_ZOOM_CLIENT_ID}:${process.env.REACT_APP_ZOOM_CLIENT_SECRET}`
      ).toString('base64');

      const tokenResponse = await axios({
        method: 'post',
        url: 'https://zoom.us/oauth/token',
        params: {
          grant_type: 'account_credentials',
          account_id: process.env.REACT_APP_ZOOM_ACCOUNT_ID
        },
        auth: {
          username: process.env.REACT_APP_ZOOM_CLIENT_ID,
          password: process.env.REACT_APP_ZOOM_CLIENT_SECRET
        },
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });

      return tokenResponse.data.access_token;
    } catch (err) {
      console.error('Token Error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      throw new Error('Failed to get Zoom access token');
    }
  };

  const startMeeting = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      const accessToken = await getAccessToken();
      console.log('Access Token:', accessToken);

      const userResponse = await axios({
        method: 'get',
        url: 'https://api.zoom.us/v2/users/me',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const meetingResponse = await axios({
        method: 'post',
        url: `https://api.zoom.us/v2/users/${userResponse.data.id}/meetings`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          topic: 'Lecture Session',
          type: 2,
          duration: 180,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: true,
            auto_recording: 'cloud',
            waiting_room: false
          }
        }
      });

      setMeetingUrl(meetingResponse.data.join_url);
      onMeetingCreated(meetingResponse.data.id);
    } catch (err) {
      console.error('Full error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="meeting-starter">
      <button 
        onClick={startMeeting} 
        disabled={isCreating}
        style={{
          padding: '10px 20px',
          backgroundColor: isCreating ? '#ccc' : '#0066FF',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isCreating ? 'not-allowed' : 'pointer'
        }}
      >
        {isCreating ? 'Creating Meeting...' : 'Start Meeting'}
      </button>

      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          Error: {error}
        </div>
      )}

      {meetingUrl && (
        <div style={{ marginTop: '20px' }}>
          <p>Meeting URL:</p>
          <input
            type="text"
            value={meetingUrl}
            readOnly
            onClick={(e) => e.target.select()}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '5px'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ZoomMeetingStarter;