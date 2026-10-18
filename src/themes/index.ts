import { abyss } from "./abyss";
import { auroraTundra } from "./aurora-tundra";
import { arcade8bit } from "./arcade-8bit";
import { boldEsports } from "./bold-esports";
import { cleanSlate } from "./clean-slate";
import { cozyCafe } from "./cozy-cafe";
import { daylight } from "./daylight";
import { eclipse } from "./eclipse";
import { forestNight } from "./forest-night";
import { neonGrid } from "./neon-grid";
import { paperCut } from "./paper-cut";
import { pastelCloud } from "./pastel-cloud";
import { phosphor } from "./phosphor";
import { quest } from "./quest";
import { rainCity } from "./rain-city";
import { sakura } from "./sakura";
import { session } from "./session";
import { shonen } from "./shonen";
import { skateDeck } from "./skate-deck";
import { vaporwaveSunset } from "./vaporwave-sunset";
import type { Theme, ThemeId } from "./types";
import "./eclipse.css";
import "./rain-city.css";
import "./paper-cut.css";
import "./aurora-tundra.css";

export const themes: Record<ThemeId, Theme> = {
  "clean-slate": cleanSlate,
  "neon-grid": neonGrid,
  "cozy-cafe": cozyCafe,
  "arcade-8bit": arcade8bit,
  "pastel-cloud": pastelCloud,
  "forest-night": forestNight,
  "bold-esports": boldEsports,
  "vaporwave-sunset": vaporwaveSunset,
  daylight,
  abyss,
  session,
  shonen,
  sakura,
  "skate-deck": skateDeck,
  phosphor,
  quest,
  eclipse,
  "rain-city": rainCity,
  "paper-cut": paperCut,
  "aurora-tundra": auroraTundra,
};
