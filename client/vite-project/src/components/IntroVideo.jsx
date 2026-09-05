import { useState } from "react";
import introVideo from "../assets/videos/create_a_drone_view_on_this_im.mp4";

function IntroVideo({ onFinish }) {
  const [fade, setFade] = useState(false);

  const handleVideoEnd = () => {
    localStorage.setItem("introVideoSeen", "true");
    setFade(true);

    setTimeout(() => {
      onFinish();
    }, 1000);
  };

  const handleSkip = () => {
    localStorage.setItem("introVideoSeen", "true");
    setFade(true);

    setTimeout(() => {
      onFinish();
    }, 300);
  };

  return (
    <div className="intro-video-shell">
      <video
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        className={fade ? "video fade" : "video"}
      >
        <source src={introVideo} type="video/mp4" />
      </video>

      <button type="button" className="skip-video-button" onClick={handleSkip}>
        Skip &raquo;
      </button>
    </div>
  );
}

export default IntroVideo;