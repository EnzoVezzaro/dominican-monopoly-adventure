import { Property, PropertyType } from "@/types/game";

export const DEFAULT_COLOR = '#cccccc';
export const DEFAULT_PROPERTY_COLOR = '#cccccc';
export const DEFAULT_RAILROAD_COLOR = '#534741';
export const DEFAULT_UTILITY_COLOR = '#ff4e00';
export const DEFAULT_SURPRISE_COLOR = '#800080';
export const DEFAULT_BOX_COLOR = '#FFD700';

export const getPropertyColor = (property: Property) => {
  if (!property) return DEFAULT_PROPERTY_COLOR;
  
  switch (property.type) {
    case 'railroad':
      return DEFAULT_RAILROAD_COLOR;
    case 'utility':
      return DEFAULT_UTILITY_COLOR;
    case 'surprise':
      return DEFAULT_SURPRISE_COLOR;
    case 'box':
      return DEFAULT_BOX_COLOR;
    default:
      return property.color || DEFAULT_PROPERTY_COLOR;
  }
}
