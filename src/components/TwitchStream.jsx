import React, { useRef, useEffect } from 'react';
import { TwitchPlayer } from 'react-twitch-embed';

function TwitchStream() {
  const domain = window.location.hostname;
  const playerRef = useRef(null);
  const tapTimeoutRef = useRef(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .offline-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 1.2rem;
        z-index: 1000;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleTap = (event) => {
    if (tapTimeoutRef.current === null) {
      tapTimeoutRef.current = setTimeout(() => {
        tapTimeoutRef.current = null;
      }, 300);
    } else {
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

  const handleOffline = () => {
    const container = document.querySelector('.player-container');
    if (!container.querySelector('.offline-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'offline-overlay';
      overlay.textContent = 'Please revise your notes!';
      container.appendChild(overlay);
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
        <div className="player-container" style={playerContainerStyle}>
          <TwitchPlayer
            {...options}
            onReady={(player) => {
              playerRef.current = player;
              player.setVolume(1.0);
              player.setMuted(false);
            }}
            onOffline={handleOffline}
          />
        </div>
      </div>
    </div>
  );
}

export default TwitchStream;