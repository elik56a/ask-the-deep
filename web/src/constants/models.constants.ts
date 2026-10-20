import type { ModelCredit, ModelId } from "#/types/models.types";

export const MODEL_URL: Record<ModelId, string> = {
  diver: "/models/diver.glb",
  sardines: "/models/sardines.glb",
  fish: "/models/fish.glb",
  jelly: "/models/jelly.glb",
  angler: "/models/angler.glb",
};

// CC BY 4.0 requires these credits on the page; the files are resized for the web.
export const MODEL_LICENSE = {
  name: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/",
};

export const MODEL_CREDITS: ModelCredit[] = [
  {
    id: "diver",
    title: "Nanando diver – Underwater",
    author: "markolopezgallegos20",
    source:
      "https://sketchfab.com/3d-models/nanando-diver-underwater-0073b3e5348640fbbaf73278726400fb",
  },
  {
    id: "sardines",
    title: "Stylized 3D Sardine School",
    author: "White Rabbit",
    source:
      "https://sketchfab.com/3d-models/stylized-3d-sardine-school-620af16168b343a4942a9c43b41654f3",
  },
  {
    id: "fish",
    title: "Animated Low poly Fish",
    author: "Atlas",
    source:
      "https://sketchfab.com/3d-models/animated-low-poly-fish-64adc2e5a4be471e8279532b9610c878",
  },
  {
    id: "jelly",
    title: "Simple Jellyfish",
    author: "RickStikkelorum",
    source:
      "https://sketchfab.com/3d-models/simple-jellyfish-f77876d8297846eeb23c4ad82dbebb97",
  },
  {
    id: "angler",
    title: "Weird deepsea anglerfish",
    author: "RickStikkelorum",
    source:
      "https://sketchfab.com/3d-models/weird-deepsea-anglerfish-3085eefe0bb348d89902cd51e7e91f05",
  },
];
