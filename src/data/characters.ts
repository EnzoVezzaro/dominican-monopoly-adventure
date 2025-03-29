export interface Character {
  name: string;
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
    name: "Ambulance",
    buildings: {
      house_1: "Building_1.fbx",
      house_2: "Building_2.fbx",
      house_3: "Building_3.fbx",
      house_4: "Building_4.fbx",
      hotel: "Building_5.fbx"
    },
    model: "Ambulance.fbx",
    hasAnimation: false
  },
  {
    name: "Bus",
    buildings: {
      house_1: "Building_1.fbx",
      house_2: "Building_2.fbx",
      house_3: "Building_3.fbx",
      house_4: "Building_4.fbx",
      hotel: "Building_5.fbx"
    },
    model: "Bus_1.fbx",
    hasAnimation: false
  },
  {
    name: "Car",
    buildings: {
      house_1: "Building_1.fbx",
      house_2: "Building_2.fbx",
      house_3: "Building_3.fbx",
      house_4: "Building_4.fbx",
      hotel: "Building_5.fbx"
    },
    model: "Car_1_1.fbx",
    hasAnimation: false
  },
  {
    name: "Truck",
    buildings: {
      house_1: "Building_1.fbx",
      house_2: "Building_2.fbx",
      house_3: "Building_3.fbx",
      house_4: "Building_4.fbx",
      hotel: "Building_5.fbx"
    },
    model: "Main_Truck_1.fbx",
    hasAnimation: false
  },
  {
    name: "Police",
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
    name: "Taxi",
    buildings: {
      house_1: "Building_1.fbx",
      house_2: "Building_2.fbx",
      house_3: "Building_3.fbx",
      house_4: "Building_4.fbx",
      hotel: "Building_5.fbx"
    },
    model: "Taxi.fbx",
    hasAnimation: false
  },
  {
    name: "Train",
    buildings: {
      house_1: "Building_1.fbx",
      house_2: "Building_2.fbx",
      house_3: "Building_3.fbx",
      house_4: "Building_4.fbx",
      hotel: "Building_5.fbx"
    },
    model: "Train.fbx",
    hasAnimation: false
  }
];
