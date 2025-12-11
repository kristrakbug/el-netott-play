export enum ProfileType {
  LIVE_TV = 'LIVE_TV',
  MOVIES = 'MOVIES',
  SERIES = 'SERIES',
  ADMIN = 'ADMIN' // Special internal type
}

export interface User {
  id: string;
  username: string;
  password?: string; // Only for admin checks
  isAdmin: boolean;
  active: boolean;
  expirationDate: string;
}

export interface StreamItem {
  id: string;
  name: string;
  group: string;
  logo?: string;
  url: string;
  type: 'live' | 'vod' | 'series';
}

export interface Category {
  name: string;
  items: StreamItem[];
}

export interface PlaylistData {
  rawContent: string;
  lastUpdated: number;
}
