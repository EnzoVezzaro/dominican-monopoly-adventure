import { Property } from "@/types/game";

const DEFUALT_COLOR = '#cccccc';
const DEFUALT_PROPERTY_COLOR = '#cccccc';
const DEFUALT_RAILROAD_COLOR = '#534741';
const DEFUALT_UTILITY_COLOR = '#ff4e00';


export const getPropertyColor = (property: Property) => {
  let colorProperty;
  switch (property?.color) {
    case 'railroad':
      colorProperty = DEFUALT_RAILROAD_COLOR
      break;
    case 'utility':
      colorProperty = DEFUALT_UTILITY_COLOR
      break;
    default:
      colorProperty = property ? property.color : DEFUALT_PROPERTY_COLOR
      break;
  }
  return colorProperty;
}