import { useEffect, useState } from 'react';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const GoogleMeetRecorder = ({ meetingId }) => {
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    const checkAndUploadRecording = async () => {
      try {
        // Google Meet saves recordings to Google Drive
        // We can use Google Drive API to get the recording
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=name contains '${meetingId}'`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.REACT_APP_GOOGLE_ACCESS_TOKEN}`
            }
          }
        );

        const { files } = await response.json();
        const recording = files[0];

        if (recording) {
          // Download from Google Drive
          const videoResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${recording.id}?alt=media`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.REACT_APP_GOOGLE_ACCESS_TOKEN}`
              }
            }
          );

          const videoBlob = await videoResponse.blob();

          // Upload to S3 using your existing S3 configuration
          const s3Client = new S3Client({
            region: process.env.REACT_APP_AWS_REGION,
            credentials: {
              accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
            },
          });

          const command = new PutObjectCommand({
            Bucket: 'zenithvideo',
            Key: `lecture-${meetingId}-${Date.now()}.mp4`,
            Body: videoBlob,
            ContentType: 'video/mp4',
          });

          await s3Client.send(command);
          setUploadStatus('success');
        }
      } catch (err) {
        console.error('Error:', err);
        setUploadStatus('error');
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkAndUploadRecording, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [meetingId]);

  return (
    <div>
      {uploadStatus === 'success' && (
        <div style={{ color: 'green' }}>Recording uploaded successfully!</div>
      )}
      {uploadStatus === 'error' && (
        <div style={{ color: 'red' }}>Error uploading recording</div>
      )}
    </div>
  );
};

export default GoogleMeetRecorder;