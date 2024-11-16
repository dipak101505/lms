import { useEffect, useState } from 'react';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import { Buffer } from 'buffer';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const ZoomRecorder = ({ meetingId, classDetails }) => {
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    const checkAndUploadRecording = async () => {
      try {
        // 1. Check meeting status using Zoom API
        const getAccessToken = async () => {
          const response = await axios.post(
            `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.REACT_APP_ZOOM_ACCOUNT_ID}`,
            null,
            {
              headers: {
                'Authorization': `Basic ${Buffer.from(`${process.env.REACT_APP_ZOOM_CLIENT_ID}:${process.env.REACT_APP_ZOOM_CLIENT_SECRET}`).toString('base64')}`,
              },
            }
          );
          return response.data.access_token;
        };

        const accessToken = await getAccessToken();
        const meetingResponse = await axios.get(
          `https://api.zoom.us/v2/meetings/${meetingId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (meetingResponse.data.status === 'ended') {
          // 2. Get recording details
          const recordingResponse = await axios.get(
            `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const videoRecording = recordingResponse.data.recording_files.find(
            file => file.file_type === 'MP4'
          );

          if (videoRecording) {
            // 3. Download recording
            const videoData = await axios.get(videoRecording.download_url, {
              responseType: 'blob'
            });

            // 4. Upload to S3
            const s3Client = new S3Client({
              region: process.env.REACT_APP_AWS_REGION,
              credentials: {
                accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
              },
            });

            const key = `${classDetails.batch}/${classDetails.subject}/${classDetails.topic}/lecture-${meetingId}-${Date.now()}.mp4`;

            const command = new PutObjectCommand({
              Bucket: 'zenithvideo',
              Key: key,
              Body: videoData.data,
              ContentType: 'video/mp4',
            });

            await s3Client.send(command);
            
            // Update meeting status in Firestore
            await updateDoc(doc(db, 'meetings', meetingId), {
              status: 'completed',
              recordingKey: key
            });

            setUploadStatus('success');
          }
        }
      } catch (err) {
        console.error('Error:', err);
        setUploadStatus('error');
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkAndUploadRecording, 5 * 60 * 1000);
    
    // Initial check
    checkAndUploadRecording();

    return () => clearInterval(interval);
  }, [meetingId, classDetails]);

  return (
    <div className="recorder-status">
      {uploadStatus === 'success' && (
        <div className="success-message">
          Recording uploaded successfully to:
          <br />
          {classDetails.batch}/{classDetails.subject}/{classDetails.topic}
        </div>
      )}
      {uploadStatus === 'error' && (
        <div className="error-message">
          Error uploading recording. Please check console for details.
        </div>
      )}
    </div>
  );
};

export default ZoomRecorder;