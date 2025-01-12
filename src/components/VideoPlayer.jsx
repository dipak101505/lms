import { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import { useParams } from 'react-router-dom';

const VideoPlayer = () => {
  const artRef = useRef();
  const { videoKey } = useParams();

  useEffect(() => {
    // Function to handle HLS playback
    function playM3u8(video, url, art) {
      if (Hls.isSupported()) {
        if (art.hls) art.hls.destroy();
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        art.hls = hls;
        art.on('destroy', () => hls.destroy());
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
      } else {
        art.notice.show = 'HLS is not supported for this browser';
      }
    }
    
    const art = new Artplayer({
        container: artRef.current,
        url: `https://vz-d5d4ebc7-6d2.b-cdn.net/${videoKey}/playlist.m3u8`,
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
          m3u8: function(video, url) {
              if (Hls.isSupported()) {
                  const hls = new Hls({
                      maxBufferSize: 0,
                      maxBufferLength: 5, // 1 minute in seconds
                      maxMaxBufferLength: 10, // 2 minutes in seconds
                      liveDurationInfinity: false
                  });
                  hls.loadSource(url);
                  hls.attachMedia(video);
              }
          }
      }
    });

    return () => {
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
  }, [videoKey]);

  return (
    <div>
      <div ref={artRef} style={{ width: '100%', height: '500px' }} />
    </div>
  );
};

export default VideoPlayer;