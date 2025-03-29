
import { Property, PropertyType } from '../types/game';
import { DEFAULT_SURPRISE_COLOR, DEFAULT_BOX_COLOR } from '../lib/colors';

export const dominicanProperties: Property[] = [
  {
    id: 'go-space',
    name: 'GO',
    price: 0,
    rent: [0],
    color: 'white',
    houses: 0,
    position: 0,
    mortgaged: false,
    type: 'utility' as PropertyType
  },
  // Special cards
  {
    id: 'surprise-1',
    name: '¡Sorpresa!',
    price: 0,
    rent: [],
    color: DEFAULT_SURPRISE_COLOR,
    houses: 0,
    position: 2,
    mortgaged: false,
    type: 'surprise' as PropertyType
  },
  {
    id: 'box-1', 
    name: 'Caja de Comunidad',
    price: 0,
    rent: [],
    color: DEFAULT_BOX_COLOR,
    houses: 0,
    position: 4,
    mortgaged: false,
    type: 'box' as PropertyType
  },
  // Brown
  {
    id: 'property-1',
    name: 'Santiago de los Caballeros',
    price: 60,
    rent: [2, 10, 30, 90, 160, 250],
    color: '#955436',
    houses: 0,
    position: 1,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'property-3',
    name: 'San Pedro de Macorís',
    price: 60,
    rent: [4, 20, 60, 180, 320, 450],
    color: '#955436',
    houses: 0,
    position: 3,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  
  // Light Blue
  {
    id: 'property-6',
    name: 'Puerto Plata',
    price: 100,
    rent: [6, 30, 90, 270, 400, 550],
    color: '#AAE0FA',
    houses: 0,
    position: 6,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'property-8',
    name: 'La Romana',
    price: 100,
    rent: [6, 30, 90, 270, 400, 550],
    color: '#AAE0FA',
    houses: 0,
    position: 8,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'property-9',
    name: 'Samaná',
    price: 120,
    rent: [8, 40, 100, 300, 450, 600],
    color: '#AAE0FA',
    houses: 0,
    position: 9,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'jail',
    name: 'Cárcel / Solo Visitando',
    price: 0,
    rent: [],
    color: 'gray',
    houses: 0,
    position: 10,
    mortgaged: false,
    type: 'utility' as PropertyType
  },
  
  // Pink
  {
    id: 'property-11',
    name: 'Las Terrenas',
    price: 140,
    rent: [10, 50, 150, 450, 625, 750],
    color: '#D93A96',
    houses: 0,
    position: 11,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'property-13',
    name: 'Bávaro',
    price: 140,
    rent: [10, 50, 150, 450, 625, 750],
    color: '#D93A96',
    houses: 0,
    position: 13,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'property-14',
    name: 'Punta Cana',
    price: 160,
    rent: [12, 60, 180, 500, 700, 900],
    color: '#D93A96',
    houses: 0,
    position: 14,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  
  // Orange
  {
    id: 'property-16',
    name: 'Santo Domingo Norte',
    price: 180,
    rent: [14, 70, 200, 550, 750, 950],
    color: '#F7941D',
    houses: 0,
    position: 16,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'property-18',
    name: 'Santo Domingo Este',
    price: 180,
    rent: [14, 70, 200, 550, 750, 950],
    color: '#F7941D',
    houses: 0,
    position: 18,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'parking',
    name: 'Parqueo Gratuito',
    price: 0,
    rent: [],
    color: 'green',
    houses: 0,
    position: 20,
    mortgaged: false,
    type: 'utility' as PropertyType
  },
  {
    id: 'property-19',
    name: 'Santo Domingo Oeste',
    price: 200,
    rent: [16, 80, 220, 600, 800, 1000],
    color: '#F7941D',
    houses: 0,
    position: 19,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  
  // Red
  {
    id: 'property-21',
    name: 'Jarabacoa',
    price: 220,
    rent: [18, 90, 250, 700, 875, 1050],
    color: '#ED1B24',
    houses: 0,
    position: 21,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'property-23',
    name: 'Constanza',
    price: 220,
    rent: [18, 90, 250, 700, 875, 1050],
    color: '#ED1B24',
    houses: 0,
    position: 23,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'property-24',
    name: 'La Vega',
    price: 240,
    rent: [20, 100, 300, 750, 925, 1100],
    color: '#ED1B24',
    houses: 0,
    position: 24,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  
  // Yellow
  {
    id: 'property-26',
    name: 'San Juan de la Maguana',
    price: 260,
    rent: [22, 110, 330, 800, 975, 1150],
    color: '#FFF200',
    houses: 0,
    position: 26,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'property-27',
    name: 'Barahona',
    price: 260,
    rent: [22, 110, 330, 800, 975, 1150],
    color: '#FFF200',
    houses: 0,
    position: 27,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'property-29',
    name: 'Pedernales',
    price: 280,
    rent: [24, 120, 360, 850, 1025, 1200],
    color: '#FFF200',
    houses: 0,
    position: 29,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  
  // Green
  {
    id: 'property-31',
    name: 'Juan Dolio',
    price: 300,
    rent: [26, 130, 390, 900, 1100, 1275],
    color: '#00A551',
    houses: 0,
    position: 31,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'property-32',
    name: 'Boca Chica',
    price: 300,
    rent: [26, 130, 390, 900, 1100, 1275],
    color: '#00A551',
    houses: 0,
    position: 32,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'property-34',
    name: 'Bayahibe',
    price: 320,
    rent: [28, 150, 450, 1000, 1200, 1400],
    color: '#00A551',
    houses: 0,
    position: 34,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  
  // Dark Blue
  {
    id: 'property-37',
    name: 'Zona Colonial',
    price: 350,
    rent: [35, 175, 500, 1100, 1300, 1500],
    color: '#0055A4',
    houses: 0,
    position: 37,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  {
    id: 'property-39',
    name: 'Santo Domingo',
    price: 400,
    rent: [50, 200, 600, 1400, 1700, 2000],
    color: '#0055A4',
    houses: 0,
    position: 38,
    mortgaged: false,
    type: 'property' as PropertyType
  },
  
  // Railroads
  {
    id: 'railroad-5',
    name: 'Puerto de Haina',
    price: 200,
    rent: [25, 50, 100, 200],
    color: 'railroad',
    houses: 0,
    position: 5,
    mortgaged: false,
    type: 'railroad' as PropertyType
  },
  {
    id: 'railroad-15',
    name: 'Puerto de San Pedro',
    price: 200,
    rent: [25, 50, 100, 200],
    color: 'railroad',
    houses: 0,
    position: 15,
    mortgaged: false,
    type: 'railroad' as PropertyType
  },
  {
    id: 'railroad-25',
    name: 'Puerto de Puerto Plata',
    price: 200,
    rent: [25, 50, 100, 200],
    color: 'railroad',
    houses: 0,
    position: 25,
    mortgaged: false,
    type: 'railroad' as PropertyType
  },
  {
    id: 'railroad-35',
    name: 'Aeropuerto Las Américas',
    price: 200,
    rent: [25, 50, 100, 200],
    color: 'railroad',
    houses: 0,
    position: 35,
    mortgaged: false,
    type: 'railroad' as PropertyType
  },
  
  // Utilities
  {
    id: 'utility-12',
    name: 'Empresa Eléctrica Dominicana',
    price: 150,
    rent: [4, 10],
    color: 'utility',
    houses: 0,
    position: 12,
    mortgaged: false,
    type: 'utility' as PropertyType
  },
  {
    id: 'utility-28',
    name: 'Acueducto Dominicano',
    price: 150,
    rent: [4, 10],
    color: 'utility',
    houses: 0,
    position: 28,
    mortgaged: false,
    type: 'utility' as PropertyType
  }
];
