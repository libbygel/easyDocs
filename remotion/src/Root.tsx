import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 14 scenes, ~108 seconds total (added: smart case management)
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={3235}
    fps={30}
    width={1920}
    height={1080}
  />
);
