import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { PersistentBackground } from "./components/PersistentBackground";
import { Scene1Intro } from "./scenes/Scene1Intro";
import { Scene2Templates } from "./scenes/Scene2Templates";
import { Scene3CreateCase } from "./scenes/Scene3CreateCase";
import { Scene4AddDocs } from "./scenes/Scene4AddDocs";
import { Scene5AdvisorUpload } from "./scenes/Scene5AdvisorUpload";
import { Scene6ClientPortal } from "./scenes/Scene6ClientPortal";
import { Scene7Signatures } from "./scenes/Scene7Signatures";
import { Scene8Reminders } from "./scenes/Scene8Reminders";
import { Scene9SendToBanker } from "./scenes/Scene9SendToBanker";
import { Scene11Billing } from "./scenes/Scene11Billing";
import { Scene12Timer } from "./scenes/Scene12Timer";
import { Scene13ClientArea } from "./scenes/Scene13ClientArea";
import { Scene10Outro } from "./scenes/Scene10Outro";

const T = 35;
const timing = springTiming({ config: { damping: 200 }, durationInFrames: T });

export const MainVideo = () => (
  <AbsoluteFill>
    <PersistentBackground />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={180}><Scene1Intro /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={280}><Scene2Templates /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={250}><Scene3CreateCase /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={240}><Scene4AddDocs /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={220}><Scene5AdvisorUpload /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={250}><Scene6ClientPortal /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={240}><Scene7Signatures /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={220}><Scene8Reminders /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={240}><Scene9SendToBanker /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={210}><Scene11Billing /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={210}><Scene12Timer /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={220}><Scene13ClientArea /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={180}><Scene10Outro /></TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
