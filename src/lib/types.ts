export interface Child {
  id: string;
  name: string;
  birthDate: Date;
  avatarUrl?: string;
  color: 'primary' | 'sage' | 'lavender' | 'peach' | 'sky';
  ownerId?: string;
  fullName?: string;
  profilePhotoPath?: string;
}

export type ActivityType = 'sport' | 'hobby' | 'other';

export interface Activity {
  id: string;
  childId: string;
  name: string;
  type: ActivityType;
  icon?: string;
  createdAt: Date;
}

export interface BirthdayNotificationSettings {
  id?: string;
  userId: string;
  childId: string;
  notifySameDay: boolean;
  notifyDayBefore: boolean;
}

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl?: string;
  childId: string;
  date: Date;
  caption?: string;
  eventId?: string;
  tags?: Tag[];
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  storagePath: string;
  thumbnailPath?: string | null;
  isShared: boolean;
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
