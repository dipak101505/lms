import React, { useEffect, useRef, useState } from 'react';
import { TwitchPlayer } from 'react-twitch-embed';

function TwitchStream() {
  const domain = window.location.hostname;
  const playerRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const tapTimeoutRef = useRef(null);
  
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .twitch-embed {
        background: #000 !important;
      }

      .twitch-embed iframe {
        background: #000 !important;
      }

      [data-a-target="player-overlay-click-handler"],
      [data-a-target="player-overlay"],
      .video-player__overlay,
      .tw-root--theme-dark .video-player,
      .tw-root--theme-dark .video-player__overlay,
      .video-player__default-player-overlay,
      .player-logo,
      .tw-svg__asset--inherit,
      iframe [href*="twitch.tv"],
      .player-controls__right-control-group,
      [data-a-target="player-volume-slider"],
      [data-a-target="player-mute-button"],
      .player-buttons-right,
      .volume-slider__slider-container {
        display: none !important;
      }

      .video-player {
        background-color: #000 !important;
      }

      [data-a-target="player-twitch-logo-button"],
      .tw-absolute.tw-bottom-0.tw-right-0,
      .tw-absolute.tw-right-0.tw-bottom-0,
      .player-brand {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleTap = (event) => {
    if (tapTimeoutRef.current === null) {
      // First tap
      tapTimeoutRef.current = setTimeout(() => {
        // Single tap - toggle mute
        if (playerRef.current) {
          const newMutedState = !isMuted;
          playerRef.current.setMuted(newMutedState);
          setIsMuted(newMutedState);
          playerRef.current.setVolume(1); // Keep volume at max
        }
        tapTimeoutRef.current = null;
      }, 300); // Wait for potential second tap
    } else {
      // Double tap
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
      
      // Toggle fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        const playerElement = event.currentTarget;
        if (playerElement.requestFullscreen) {
          playerElement.requestFullscreen();
        }
      }
    }
  };

  const options = {
    width: '100%',
    height: '100%',
    channel: "dipakag",
    parent: ["localhost", domain],
    layout: "video",
    muted: false,
    theme: "dark",
    allowfullscreen: true,
    controls: false,
    branding: false,
    displayMode: 'video',
    showInfo: false,
    hideBranding: true,
    autoplay: true,
    hideControls: true,
    volume: 1.0
  };

  const containerStyle = {
    position: 'relative',
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#000',
    cursor: 'pointer' // Add pointer cursor
  };

  const wrapperStyle = {
    position: 'relative',
    paddingTop: '56.25%',
    overflow: 'hidden'
  };

  const playerContainerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%'
  };

  return (
    <div style={containerStyle} onClick={handleTap}>
      <div style={wrapperStyle}>
        <div style={playerContainerStyle}>
          <TwitchPlayer 
            {...options} 
            onReady={(player) => {
              playerRef.current = player;
              player.setVolume(1);
              player.setMuted(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default TwitchStream;