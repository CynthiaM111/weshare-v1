import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import type { FindRideMapHandle, FindRideMapProps } from '@/components/find-ride-map-shared';

const TEAL = '#00C9B1';
const ACCENT = '#FF6B35';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7f99' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#08111f' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#162944' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#1a3354' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1f3d66' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#05101d' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0b1929' }] },
];

const LIGHT_MAP_STYLE = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#e8e8e8' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#555' }] },
];

const FindRideMap = forwardRef<FindRideMapHandle, FindRideMapProps>(function FindRideMap(
  { isDark, initialRegion, fromCoord, toCoord, routeCoords, routeDashed, onPress },
  ref,
) {
  const mapRef = useRef<MapView | null>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion(region, duration) {
      mapRef.current?.animateToRegion(region, duration);
    },
    fitToCoordinates(coordinates, options) {
      mapRef.current?.fitToCoordinates(coordinates, options);
    },
  }));

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      initialRegion={initialRegion}
      style={StyleSheet.absoluteFill}
      customMapStyle={isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}
      onPress={onPress}
    >
      {fromCoord && (
        <Marker coordinate={fromCoord}>
          <View style={styles.pinWrap}>
            <View style={[styles.pin, { backgroundColor: TEAL, shadowColor: TEAL }]}>
              <View style={styles.pinInner} />
            </View>
            <View style={[styles.pinTail, { borderTopColor: TEAL }]} />
          </View>
        </Marker>
      )}
      {toCoord && (
        <Marker coordinate={toCoord}>
          <View style={styles.pinWrap}>
            <View style={[styles.pin, { backgroundColor: ACCENT, shadowColor: ACCENT }]}>
              <View style={styles.pinInner} />
            </View>
            <View style={[styles.pinTail, { borderTopColor: ACCENT }]} />
          </View>
        </Marker>
      )}
      {routeCoords && routeCoords.length >= 2 && (
        <Polyline
          coordinates={routeCoords}
          strokeColor={ACCENT}
          strokeWidth={3.5}
          lineCap="round"
          lineJoin="round"
          lineDashPattern={routeDashed ? [10, 7] : undefined}
        />
      )}
    </MapView>
  );
});

export default FindRideMap;

const styles = StyleSheet.create({
  pinWrap: { alignItems: 'center' },
  pin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  pinInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.9)' },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
