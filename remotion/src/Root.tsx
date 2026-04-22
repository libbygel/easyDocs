import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 10 scenes, ~75 seconds total (slower pacing for clarity)
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={2300}
    fps={30}
    width={1920}
    height={1080}
  />
);
