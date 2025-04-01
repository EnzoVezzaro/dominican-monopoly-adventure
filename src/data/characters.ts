export interface Character {
  name: string;
  scale: number;
  scalePreview: number;
  boardPosition: { x: number; y: number; z: number }; // Add board position
  buildings: {
    house_1: string;
    house_2: string;
    house_3: string;
    house_4: string;
    hotel: string;
  };
  model: string;
  hasAnimation: boolean;
}

export const characters: Character[] = [
  {
    name: "Platano",
    scale: 0.85,
    scalePreview: 0.08,
    boardPosition: { x: 0, y: 0.4, z: 0 },
    buildings: {
      house_1: "Building_1.fbx",
      house_2: "Building_2.fbx",
      house_3: "Building_3.fbx",
      house_4: "Building_4.fbx",
      hotel: "Building_5.fbx"
    },
    model: "platano.glb",
    hasAnimation: false
  },
  {
    name: "Guira",
    scale: 0.008,
    scalePreview: 0.0008,
    boardPosition: { x: 0, y: 0.4, z: 0 },
    buildings: {
      house_1: "Building_1.fbx",
      house_2: "Building_2.fbx",
      house_3: "Building_3.fbx",
      house_4: "Building_4.fbx",
      hotel: "guira.fbx"
    },
    model: "guira.fbx",
    hasAnimation: false
  },
  {
    name: "Tambora",
    scale: 0.65,
    scalePreview: 0.04,
    boardPosition: { x: 0, y: 0.4, z: 0 },
    buildings: {
      house_1: "Building_1.fbx",
      house_2: "Building_2.fbx",
      house_3: "Building_3.fbx",
      house_4: "Building_4.fbx",
      hotel: "Building_5.fbx"
    },
    model: "drum.glb",
    hasAnimation: false
  },
  {
    name: "Concho",
    scale: 0.75,
    scalePreview: 0.06,
    boardPosition: { x: 0, y: 0.4, z: 0 },
    buildings: {
      house_1: "Building_1.fbx",
      house_2: "Building_2.fbx",
      house_3: "Building_3.fbx",
      house_4: "Building_4.fbx",
      hotel: "Building_5.fbx"
    },
    model: "concho.glb",
    hasAnimation: false
  },
  {
    name: "Police",
    scale: 0.75,
    scalePreview: 0.008,
    boardPosition: { x: 0, y: 0.4, z: 0 },
    buildings: {
      house_1: "Building_1.fbx",
      house_2: "Building_2.fbx",
      house_3: "Building_3.fbx",
      house_4: "Building_4.fbx",
      hotel: "Building_5.fbx"
    },
    model: "Police.fbx",
    hasAnimation: false
  },
  {
    name: "Campesino",
    scale: 0.85,
    scalePreview: 0.06,
    boardPosition: { x: 0, y: 0.4, z: 0 },
    buildings: {
      house_1: "Building_1.fbx",
      house_2: "Building_2.fbx",
      house_3: "Building_3.fbx",
      house_4: "Building_4.fbx",
      hotel: "Building_5.fbx"
    },
    model: "campesino.glb",
    hasAnimation: false
  },
];
