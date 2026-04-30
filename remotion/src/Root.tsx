import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 13 scenes, ~97 seconds total (added: billing, timer, client area)
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={2940}
    fps={30}
    width={1920}
    height={1080}
  />
);
