import React, { useRef } from 'react';
import { TwitchPlayer } from 'react-twitch-embed';

function TwitchStream() {
  const domain = window.location.hostname;
  const playerRef = useRef(null);
  const tapTimeoutRef = useRef(null);

  const handleTap = (event) => {
    if (tapTimeoutRef.current === null) {
      // First tap - just start the timer
      tapTimeoutRef.current = setTimeout(() => {
        tapTimeoutRef.current = null;
      }, 300);
    } else {
      // Double tap - toggle fullscreen
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
      
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
    cursor: 'pointer'
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