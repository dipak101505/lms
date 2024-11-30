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
        });

        const command = new GetObjectCommand({
          Bucket: "zenithvideo",
          Key: urlVideoKey || "bk.mp4",
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        setVideoUrl(url);
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setError(err.message);
      }
    };

    getS3Url();
  }, [urlVideoKey]);
  // Rest of your Artplayer configuration remains the same
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
        setting: false,
        loop: false,
        flip: true,
        playbackRate: false,
        aspectRatio: true,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: true,
        miniProgressBar: true,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: true,
        theme: '#ff0000', // YouTube red theme
        
        // Quality settings (if you have multiple qualities)
        quality: [
          {
            default: true,
            html: '1080p',
            url: videoUrl
          },
          {
            html: '720p',
            url: videoUrl // Replace with actual 720p URL
          },
          {
            html: '480p',
            url: videoUrl // Replace with actual 480p URL
          }
        ],
  
        controls: [
          {
            name: 'fast-forward',
            position: 'right',
            index: 10,
            html: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>',
            click: function(art) {
              art.seek(art.currentTime + 10);
            },
          },
          {
            name: 'playback-rate',
            position: 'right',
            index: 12,
            html: '<i>1.0x</i>',
            selector: [
              { html: '0.25x', value: 0.25 },
              { html: '0.5x', value: 0.5 },
              { html: '0.75x', value: 0.75 },
              { html: '1.0x', value: 1.0, default: true },
              { html: '1.25x', value: 1.25 },
              { html: '1.5x', value: 1.5 },
              { html: '1.75x', value: 1.75 },
              { html: '2.0x', value: 2.0 }
            ],
            onSelect: function(item) {
              art.playbackRate = item.value;
              this.html = `<i>${item.html}</i>`;
            }
          }
        ],
  
        // Keyboard shortcuts
        hotkey: true,
        // Custom keyboard controls
        keyboard: {
          // Space bar for play/pause
          space: function(art) {
            art.toggle();
          },
          // Left/Right arrows for seeking
          arrowLeft: function(art) {
            art.seek(art.currentTime - 5);
          },
          arrowRight: function(art) {
            art.seek(art.currentTime + 5);
          },
          // Up/Down arrows for volume
          arrowUp: function(art) {
            art.volume = Math.min(1, art.volume + 0.1);
          },
          arrowDown: function(art) {
            art.volume = Math.max(0, art.volume - 0.1);
          },
          // M for mute
          m: function(art) {
            art.muted = !art.muted;
          },
          // F for fullscreen
          f: function(art) {
            art.fullscreen = !art.fullscreen;
          }
        },
  
        icons: {
          loading: `<svg width="40" height="40" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" stroke="#fff">
            <g fill="none" fill-rule="evenodd" stroke-width="2">
              <circle cx="22" cy="22" r="1">
                <animate attributeName="r" begin="0s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"/>
                <animate attributeName="stroke-opacity" begin="0s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"/>
              </circle>
              <circle cx="22" cy="22" r="1">
                <animate attributeName="r" begin="-0.9s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite"/>
                <animate attributeName="stroke-opacity" begin="-0.9s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite"/>
              </circle>
            </g>
          </svg>`,
          state: `<svg width="48" height="48" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z"/>
          </svg>`,
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