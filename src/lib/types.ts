export interface Child {
  id: string;
  name: string;
  birthDate: Date;
  avatarUrl?: string;
  color: 'primary' | 'sage' | 'lavender' | 'peach' | 'sky';
}

export interface Photo {
  id: string;
  url: string;
  childId: string;
  date: Date;
  caption?: string;
  eventId?: string;
  tags?: Tag[];
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  storagePath: string;
}

export interface Event {
  id: string;
  name: string;
  icon: string;
  childId: string;
  date: Date;
  color: string;
}

export interface Tag {
  id: string;
  name: string;
  icon: string;
  color: string;
  isPredefined: boolean;
}

export type AgeUnit = 'days' | 'weeks' | 'months' | 'years';

export interface AgeFilter {
  value: number;
  unit: AgeUnit;
}
