export interface LandfillPhoto {
  id: string;
  title: string;
  image: string;
  alt: string;
  width: number;
  height: number;
  captured: string;
  photographer: string;
  sourceUrl: string;
}

export const INDIA_WASTE_REPORT = {
  scope: 'Urban India · municipal solid waste',
  published: '29 January 2026',
  generatedTonnesPerDay: 162162,
  processedTonnesPerDay: 131837,
  sourceTitle: 'Achievements and status of SBM-U',
  sourcePublisher: 'Ministry of Housing & Urban Affairs / PIB',
  sourceUrl: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2220345',
} as const;

export const INDIA_FOCUS = { latitude: 22.6, longitude: 79.0 } as const;
export const GHAZIPUR_LOCATION: [number, number] = [28.626, 77.328];
export const PHOTO_LICENSE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';

export const LANDFILL_PHOTOS: LandfillPhoto[] = [
  {
    id: 'workers',
    title: 'Life on a mountain of waste',
    image: '/images/ghazipur-workers-2013.jpg',
    alt: 'Workers on top of mixed waste at the Ghazipur landfill in Delhi, photographed in 2013',
    width: 1024,
    height: 526,
    captured: '2013',
    photographer: 'FacetsOfNonStickPans',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Workers_on_top_of_Ghazipur_landfill_2013.jpg',
  },
  {
    id: 'dogs',
    title: 'A landscape shaped by what we discard',
    image: '/images/ghazipur-dogs-2013.jpg',
    alt: 'Dogs standing among discarded materials at the Ghazipur landfill in Delhi, photographed in 2013',
    width: 1024,
    height: 609,
    captured: '2013',
    photographer: 'FacetsOfNonStickPans',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Dogs_on_Ghazipur_landfill_2013.jpg',
  },
];
