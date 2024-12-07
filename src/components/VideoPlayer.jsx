import { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { useParams } from 'react-router-dom';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const VideoPlayer = ({ bucketName, videoKey }) => {
  const artRef = useRef();
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState(null);
  const { videoKey:urlVideoKey } = useParams();

  useEffect(() => {
    const getS3Url = async () => {
      try {
        const s3Client = new S3Client({
          region: process.env.REACT_APP_AWS_REGION,
          credentials: {
            accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
          },
          headers: {
            'Referer': window.location.origin,
            'Range': 'bytes=0-'
          }
        });

        const command = new GetObjectCommand({
          Bucket: "zenithvideo",
          Key: urlVideoKey
        });

        const url = await getSignedUrl(s3Client, command, { 
          expiresIn: 3600,
          ResponseContentType: 'video/mp4',
          ResponseCacheControl: 'no-cache',
          ResponseContentDisposition: 'inline'
        });
        setVideoUrl(url);
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setError(err.message);
      }
    };

    getS3Url();
  }, [urlVideoKey]);

  useEffect(() => {
    if (!videoUrl) return;
    
    const art = new Artplayer({
        container: artRef.current,
        url: videoUrl,
        volume: 0.5,
        isLive: false,
        muted: false,
        autoplay: false,
        pip: true,
        autoSize: true,
        autoMini: true,
        screenshot: false,
        setting: true,
        loop: false,
        flip: true,
        playbackRate: true,
        aspectRatio: true,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: true,
        miniProgressBar: true,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: true,
        theme: '#ff0000',
        preload: 'auto',
        videoAttribute: {
          'preload': 'auto',
          'x-webkit-airplay': 'allow',
          'webkit-playsinline': 'true',
          'playsinline': 'true',
          'x-playsinline': 'true'
        },
        customType: {
          mp4: function(video, url) {
            video.src = url;
            video.addEventListener('loadedmetadata', () => {
              if (video.buffered.length) {
                const bufferSize = 15;
                const currentTime = video.currentTime;
                if (currentTime + bufferSize < video.duration) {
                  video.currentTime = currentTime + bufferSize;
                  video.currentTime = currentTime;
                }
              }
            });
          }
        }
    });

    return () => {
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
  }, [videoUrl]);

  return (
    <div>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      {!videoUrl && !error && <div>Loading video...</div>}
      <div ref={artRef} style={{ width: '100%', height: '500px' }} />
    </div>
  );
};

export default VideoPlayer;