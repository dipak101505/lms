import React from 'react';

const TwitchStream = () => {
  // Get your domain dynamically
  const domain = window.location.hostname;

  return (
    <div className="twitch-stream-container">
      <iframe
        src={`https://player.twitch.tv/?channel=dipakag&parent=${domain}&hide_controls=true&muted=false&controls=false&layout=video&offline_image_url=https://static-cdn.jtvnw.net/jtv_user_pictures/asmongold-channel_offline_image-f7ddcbd033e45dde-1920x1080.png&show_offline_screen=true`}
        frameBorder="0"
        allowFullScreen={true}
        scrolling="no"
        height="378"
        width="620"
        title="Twitch Stream"
      />
    </div>
  );
};

export default TwitchStream;