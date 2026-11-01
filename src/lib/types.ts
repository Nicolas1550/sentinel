export type Earthquake = {
  id: string;
  title: string;
  place: string;
  magnitude: number;
  latitude: number;
  longitude: number;
  depth: number;
  time: number;
  url: string;
};

export type QuakeResponse = {
  source: 'usgs' | 'demo';
  updatedAt: string;
  events: Earthquake[];
  notice?: string;
};

export type Region = {
  id: string;
  name: string;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

export type Favorite = {
  earthquakeId: string;
  title: string;
  magnitude: number;
  latitude: number;
  longitude: number;
  depth: number;
  time: number;
  url: string;
  savedAt: string;
};

export type User = { id: string; name: string; email: string };
