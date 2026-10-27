import type { Lang } from "#/types/i18n.types";
import type {
  ModelCredit,
  ModelCreditsCopy,
  ModelId,
} from "#/types/models.types";

// Compressed with gltf-transform (meshopt geometry, WebP textures at most 1024 px).
export const MODEL_URL: Record<ModelId, string> = {
  diver: "/models/diver.glb",
  sardines: "/models/sardines.glb",
  fish: "/models/fish.glb",
  jelly: "/models/jelly.glb",
  boat: "/models/boat.glb",
  turtle: "/models/turtle.glb",
  dolphin: "/models/dolphin.glb",
  manta: "/models/manta.glb",
  shark: "/models/shark.glb",
  hammerheads: "/models/hammerheads.glb",
  humpback: "/models/humpback.glb",
  "research-sub": "/models/research-sub.glb",
  "glass-octopus": "/models/glass-octopus.glb",
  angler2: "/models/angler2.glb",
  "alien-fish": "/models/alien-fish.glb",
  "whale-fall": "/models/whale-fall.glb",
  helmet: "/models/helmet.glb",
  isopod: "/models/isopod.glb",
  star: "/models/star.glb",
  "star-cushion": "/models/star-cushion.glb",
  "coral-stylaster": "/models/coral-stylaster.glb",
  "coral-soft": "/models/coral-soft.glb",
  seahorse: "/models/seahorse.glb",
  seadragon: "/models/seadragon.glb",
  github: "/models/github.glb",
};

// The sea loads zone by zone (ADR 0019): the first view, near the surface, mid-water, then the seabed.
export const MODEL_WAVES: ModelId[][] = [
  ["diver", "sardines", "fish", "jelly"],
  ["boat", "turtle", "dolphin", "manta", "github"],
  [
    "shark",
    "hammerheads",
    "humpback",
    "research-sub",
    "glass-octopus",
    "angler2",
    "alien-fish",
  ],
  [
    "whale-fall",
    "helmet",
    "isopod",
    "star",
    "star-cushion",
    "coral-stylaster",
    "coral-soft",
    "seahorse",
    "seadragon",
  ],
];

// CC BY 4.0 requires these credits on the page; licences re-checked on Sketchfab on 2026-10-22.
export const MODEL_LICENSE = {
  name: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/",
};

export const MODEL_CREDITS_COPY: Record<Lang, ModelCreditsCopy> = {
  en: {
    summary: "3D model credits",
    close: "Close credits",
    by: "by",
    license: ["Licensed ", " unless marked CC0, resized for the web."],
  },
  he: {
    summary: "קרדיטים למודלים בתלת־ממד",
    close: "סגירת הקרדיטים",
    by: "מאת",
    license: ["ברישיון ", " אלא אם מסומן CC0, מוקטנים לרשת."],
  },
};

const SKETCHFAB = "https://sketchfab.com/3d-models/";

export const MODEL_CREDITS: ModelCredit[] = [
  {
    id: "diver",
    title: "Nanando diver – Underwater",
    author: "markolopezgallegos20",
    source: `${SKETCHFAB}nanando-diver-underwater-0073b3e5348640fbbaf73278726400fb`,
  },
  {
    id: "sardines",
    title: "Stylized 3D Sardine School",
    author: "White Rabbit",
    source: `${SKETCHFAB}stylized-3d-sardine-school-620af16168b343a4942a9c43b41654f3`,
  },
  {
    id: "fish",
    title: "Animated Low poly Fish",
    author: "Atlas",
    source: `${SKETCHFAB}animated-low-poly-fish-64adc2e5a4be471e8279532b9610c878`,
  },
  {
    id: "jelly",
    title: "Simple Jellyfish",
    author: "RickStikkelorum",
    source: `${SKETCHFAB}simple-jellyfish-f77876d8297846eeb23c4ad82dbebb97`,
  },
  {
    id: "boat",
    title: "Fisher boat",
    author: "Batuhan13",
    source: `${SKETCHFAB}fisher-boat-385b039e95754dca8d8c045ed0c515cf`,
  },
  {
    id: "turtle",
    title: "Model 53A – Flatback Sea Turtle",
    author: "DigitalLife3D",
    source: `${SKETCHFAB}model-53a-flatback-sea-turtle-442372b7f02b4730882d41d959726156`,
  },
  {
    id: "dolphin",
    title: "Game-Ready dolphin (Swimming)",
    author: "Allie2k",
    source: `${SKETCHFAB}game-ready-dolphin-swimming-b621ec8894734bc79c04338edff3cd0d`,
  },
  {
    id: "manta",
    title: "Manta Ray",
    author: "s4306270",
    source: `${SKETCHFAB}manta-ray-a5a49438893e4bd1b82cad7b69a95edf`,
  },
  {
    id: "shark",
    title: "Animated Swimming Great White Shark Loop",
    author: "LasquetiSpice",
    source: `${SKETCHFAB}animated-swimming-great-white-shark-loop-297ed35c6a5f43749b0ae189d991a3f1`,
  },
  {
    id: "hammerheads",
    title: "Waltz of the sharks",
    author: "Eques_inferno",
    source: `${SKETCHFAB}waltz-of-the-sharks-a2120785dd7e43b797301413ba109c37`,
  },
  {
    id: "humpback",
    title: "Humpback Whale (Swimming)",
    author: "Connlan_Immure",
    source: `${SKETCHFAB}humpback-whale-swimming-f4912be9163a4f45b2480df8ccb8b2c6`,
  },
  {
    id: "research-sub",
    title: "Yellow Submarine",
    author: "LandonWright",
    source: `${SKETCHFAB}yellow-submarine-0dcb53b8f0734509a83a51e672d27dc4`,
  },
  {
    id: "glass-octopus",
    title: "Glass octopus",
    author: "andrey.",
    source: `${SKETCHFAB}glass-octopus-0238634d283a4cff9a0029eaf74dfe58`,
  },
  {
    id: "angler2",
    title: "Anglerfish",
    author: "Abby_Holzworth1",
    source: `${SKETCHFAB}anglerfish-5e2f4b2d2e1a4613a008b6caaf40d50c`,
  },
  {
    id: "alien-fish",
    title: "Alien Fish (animated)",
    author: "jungle_jim",
    source: `${SKETCHFAB}alien-fish-animated-f7f672a642fe4734a889d9482a3d8144`,
  },
  {
    id: "whale-fall",
    title: "Whale Fall at the Davidson Octopus Gardens",
    author: "mbari",
    source: `${SKETCHFAB}whale-fall-at-the-davidson-octopus-gardens-1f3e23b319734019a3d5f251ea43975a`,
  },
  {
    id: "helmet",
    title: "Rusty Diving Helmet – 4096px²",
    author: "mark-peters",
    source: `${SKETCHFAB}rusty-diving-helmet-4096px2-6a4bc40246c94218bd0f73fff50ef447`,
  },
  {
    id: "isopod",
    title: "Giant Isopod",
    author: "RISDNaturelab",
    source: `${SKETCHFAB}giant-isopod-46469c568b3743ec8fb4bb711949d49a`,
  },
  {
    id: "star",
    title: "Sea Star",
    author: "RISDNaturelab",
    source: `${SKETCHFAB}sea-star-d0cb382f9c9a450fb16bf71dba1b369f`,
  },
  {
    id: "star-cushion",
    title: "Cushion Sea Star",
    author: "RISDNaturelab",
    source: `${SKETCHFAB}cushion-sea-star-dbcc468ad62949529bd8031b06434765`,
  },
  {
    id: "coral-stylaster",
    title: "Stylaster sanguineus",
    author: "Smithsonian",
    source: `${SKETCHFAB}stylaster-sanguineus-4f1ddd8352944d16bf3b821b3e71b473`,
    cc0: true,
  },
  {
    id: "coral-soft",
    title: "Soft Coral Set",
    author: "Kanna-nakajima",
    source: `${SKETCHFAB}soft-coral-set-256355f15fcb4095af17b75ae572bff0`,
  },
  {
    id: "seahorse",
    title: "Seahorse Sf",
    author: "kenchoo",
    source: `${SKETCHFAB}seahorse-sf-a803bd39df534becb587453c27a0a9a9`,
  },
  {
    id: "seadragon",
    title: "Leafy seadragon",
    author: "ZorDob",
    source: `${SKETCHFAB}leafy-seadragon-0e5d20921f6947218edb32c60473743b`,
  },
  {
    id: "github",
    title: "Github_kitten",
    author: "m.adityamondal2003",
    source: `${SKETCHFAB}github-kitten-83d5a6d1a12b4427bbfd662fbc478f8d`,
  },
];
