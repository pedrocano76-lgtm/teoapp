import { Child, Photo, Event } from './types';

export const mockChildren: Child[] = [
  {
    id: '1',
    name: 'Emma',
    birthDate: new Date('2023-03-15'),
    color: 'primary',
  },
  {
    id: '2',
    name: 'Liam',
    birthDate: new Date('2024-08-22'),
    color: 'sage',
  },
];

export const mockEvents: Event[] = [
  { id: 'e1', name: 'Birth Day', icon: '👶', childId: '1', date: new Date('2023-03-15'), color: 'primary' },
  { id: 'e2', name: 'First Smile', icon: '😊', childId: '1', date: new Date('2023-05-10'), color: 'sage' },
  { id: 'e3', name: 'First Summer', icon: '☀️', childId: '1', date: new Date('2023-07-01'), color: 'peach' },
  { id: 'e4', name: '6 Months', icon: '🎂', childId: '1', date: new Date('2023-09-15'), color: 'lavender' },
  { id: 'e5', name: 'First Steps', icon: '🚶', childId: '1', date: new Date('2024-01-20'), color: 'sky' },
  { id: 'e6', name: '1st Birthday', icon: '🎉', childId: '1', date: new Date('2024-03-15'), color: 'primary' },
  { id: 'e7', name: 'First Words', icon: '💬', childId: '1', date: new Date('2024-06-01'), color: 'sage' },
  { id: 'e8', name: 'Birth Day', icon: '👶', childId: '2', date: new Date('2024-08-22'), color: 'sage' },
  { id: 'e9', name: 'First Smile', icon: '😊', childId: '2', date: new Date('2024-10-15'), color: 'peach' },
];

const placeholderPhotos = [
  'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1504151932400-72d4384f04b3?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1509924603850-a97cb0078b87?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1506836467174-27f1042aa48c?w=400&h=400&fit=crop',
];

export const mockPhotos: Photo[] = [];

// Generate photos for Emma
const emmaStart = new Date('2023-03-15');
for (let i = 0; i < 24; i++) {
  const date = new Date(emmaStart);
  date.setMonth(date.getMonth() + Math.floor(i / 2));
  date.setDate(date.getDate() + (i % 14));
  
  const matchingEvent = mockEvents.find(
    e => e.childId === '1' && Math.abs(e.date.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000
  );

  mockPhotos.push({
    id: `p${i + 1}`,
    url: placeholderPhotos[i % placeholderPhotos.length],
    childId: '1',
    date,
    caption: matchingEvent ? `${matchingEvent.icon} ${matchingEvent.name}` : undefined,
    eventId: matchingEvent?.id,
  });
}

// Generate photos for Liam
const liamStart = new Date('2024-08-22');
for (let i = 0; i < 8; i++) {
  const date = new Date(liamStart);
  date.setMonth(date.getMonth() + Math.floor(i / 2));
  date.setDate(date.getDate() + (i % 10));
  
  const matchingEvent = mockEvents.find(
    e => e.childId === '2' && Math.abs(e.date.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000
  );

  mockPhotos.push({
    id: `p${25 + i}`,
    url: placeholderPhotos[(i + 5) % placeholderPhotos.length],
    childId: '2',
    date,
    caption: matchingEvent ? `${matchingEvent.icon} ${matchingEvent.name}` : undefined,
    eventId: matchingEvent?.id,
  });
}
