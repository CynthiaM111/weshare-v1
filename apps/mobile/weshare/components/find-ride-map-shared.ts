export type LatLng = { latitude: number; longitude: number };

export type MapRegion = LatLng & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export type FindRideMapHandle = {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  fitToCoordinates: (
    coordinates: LatLng[],
    options?: {
      edgePadding?: { top: number; right: number; bottom: number; left: number };
      animated?: boolean;
    },
  ) => void;
};

export type FindRideMapProps = {
  isDark: boolean;
  initialRegion: MapRegion;
  fromCoord: LatLng | null;
  toCoord: LatLng | null;
  routeCoords: LatLng[] | null;
  routeDashed: boolean;
  onPress: () => void;
};
