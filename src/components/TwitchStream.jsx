import React, { useEffect, useState } from 'react';

/**
 * @type {Window & { Twitch: any }}
 */
const w = window;

const TwitchStream = ({ domain }) => {
  const [streamStatus, setStreamStatus] = useState('loading');

  useEffect(() => {
    // Wait for Twitch to be available
    if (!w.Twitch) {
      console.error('Twitch Player script not loaded');
      return;
    }

    let player = null;
    
    try {
      // Create Twitch player
      player = new w.Twitch.Player("twitch-embed", {
        channel: "dipakag",
        parent: [domain],
        height: 378,
        width: 620,
        controls: false,
        layout: 'video'
      });

      // Event handlers
      player.addEventListener(w.Twitch.Player.READY, () => {
        console.log('Player is ready');
      });

      player.addEventListener(w.Twitch.Player.ONLINE, () => {
        setStreamStatus('online');
      });

      player.addEventListener(w.Twitch.Player.OFFLINE, () => {
        setStreamStatus('offline');
      });

      player.addEventListener(w.Twitch.Player.PLAYING, () => {
        setStreamStatus('playing');
      });

    } catch (error) {
      console.error('Error creating Twitch player:', error);
    }

    // Cleanup
    return () => {
      if (player) {
        player.removeEventListener(w.Twitch.Player.READY);
        player.removeEventListener(w.Twitch.Player.ONLINE);
        player.removeEventListener(w.Twitch.Player.OFFLINE);
        player.removeEventListener(w.Twitch.Player.PLAYING);
        // Destroy the player
        player.destroy();
      }
    };
  }, [domain]);

  return (
    <div className="twitch-container">
      <div id="twitch-embed"></div>
      
      {streamStatus === 'offline' && (
        <div className="offline-overlay">
          <h2>The class will start soon</h2>
          <p>Please stay tuned</p>
        </div>
      )}

      <style jsx>{`
        .twitch-container {
          position: relative;
          width: 620px;
          height: 378px;
        }

        /* Hide Twitch UI elements */
        #twitch-embed iframe {
          height: 100% !important;
        }

        /* Add these rules to hide hover elements */
        #twitch-embed {
          pointer-events: none;
        }

        #twitch-embed iframe {
          pointer-events: none !important;
        }

        .offline-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: white;
          text-align: center;
        }

        .offline-overlay h2 {
          font-size: 24px;
          margin-bottom: 10px;
        }

        .offline-overlay p {
          font-size: 16px;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

export default TwitchStream;