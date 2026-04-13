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
}

export interface Event {
  id: string;
  name: string;
  icon: string;
  childId: string;
  date: Date;
  color: string;
}

export type AgeUnit = 'days' | 'weeks' | 'months' | 'years';

export interface AgeFilter {
  value: number;
  unit: AgeUnit;
}
