import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Alert, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import MapView, { Marker, Region, LatLng, PROVIDER_GOOGLE, Callout, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  withSpring,
  Layout,
} from 'react-native-reanimated';
import { EmergencyResponse } from '../utils/api';
import { getAllEmergencies } from '../utils/api';
import { socketManager } from '../utils/socket';

interface Emergency {
  id: string;
  coordinate: LatLng;
  title: string;
  description: string;
  type: 'medical' | 'fire' | 'police';
  distance: number;
  confirmed?: boolean;
}

interface Hotspot {
  center: LatLng;
  count: number;
  emergencies: EmergencyResponse[];
}

// Calculate distance between two coordinates in meters
const calculateDistance = (coord1: LatLng, coord2: LatLng): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Function to generate random coordinates with some close and some far
const generateRandomNearbyLocation = (center: LatLng, index: number): LatLng => {
  const isNearby = index < 2; // Make first 2 emergencies nearby
  const maxRadius = isNearby ? 100 : 500; // 100m for nearby, 500m for far
  const radiusInDegrees = maxRadius / 111320;

  const randomAngle = Math.random() * 2 * Math.PI;
  const randomRadius = (isNearby ? 0.3 : 0.7) * radiusInDegrees + (Math.random() * 0.3 * radiusInDegrees);

  const latOffset = randomRadius * Math.cos(randomAngle);
  const lonOffset = randomRadius * Math.sin(randomAngle);

  return {
    latitude: center.latitude + latOffset,
    longitude: center.longitude + lonOffset,
  };
};

const emergencyTypes: Emergency['type'][] = ['medical', 'fire', 'police'];

// Function to generate random emergency data around a location
const generateEmergencyData = (center: LatLng): Emergency[] => {
  return Array.from({ length: 5 }, (_, i) => {
    const coordinate = generateRandomNearbyLocation(center, i);
    const distance = calculateDistance(center, coordinate);
    return {
      id: (i + 1).toString(),
      coordinate,
      title: `${emergencyTypes[i % 3]} Emergency`,
      description: `${emergencyTypes[i % 3]} emergency ${Math.round(distance)}m away`,
      type: emergencyTypes[i % 3],
      distance,
      confirmed: false,
    };
  });
};

interface NearbyAlertsProps {
  emergencies: EmergencyResponse[];
  userLocation: LatLng;
  onConfirm: (emergencyId: string) => void;
}

const getEmergencyIcon = (type: string) => {
  switch (type) {
    case 'medical':
      return <FontAwesome5 name="hospital-symbol" size={20} color="#FF0000" />;
    case 'fire':
      return <MaterialIcons name="local-fire-department" size={24} color="#FF6B00" />;
    case 'police':
      return <MaterialIcons name="local-police" size={24} color="#0066FF" />;
    default:
      return <MaterialIcons name="emergency" size={24} color="#ed2d2d" />;
  }
};

const NearbyAlerts: React.FC<NearbyAlertsProps> = ({ emergencies, userLocation, onConfirm }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const contentHeight = useSharedValue('auto');
  const rotateAnimation = useSharedValue(0);
  
  const rotateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateAnimation.value}deg` }],
    };
  });

  const nearbyEmergencies = emergencies.filter(e => {
    const emergencyLocation = parseLocationString(e.location);
    return calculateDistance(userLocation, emergencyLocation) <= 100;
  });

  if (nearbyEmergencies.length === 0) return null;

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    rotateAnimation.value = withSpring(isMinimized ? 0 : 180);
  };

  return (
    <View style={styles.alertsContainer}>
      <View style={styles.alertsHeaderContainer}>
        <View>
          <Text style={styles.alertsTitle}>🚨 Nearby Emergencies</Text>
          <Text style={styles.alertsSubtitle}>
            {nearbyEmergencies.length} {nearbyEmergencies.length === 1 ? 'alert' : 'alerts'} nearby
          </Text>
        </View>
        <TouchableOpacity onPress={toggleMinimize} style={styles.minimizeButton}>
          <Animated.Text style={[styles.minimizeIcon, rotateStyle]}>▼</Animated.Text>
        </TouchableOpacity>
      </View>
      <Animated.View layout={Layout}>
        <ScrollView style={styles.scrollView}>
        {!isMinimized && nearbyEmergencies.map(emergency => (
          <View key={emergency.id} style={styles.alertItem}>
            <View style={styles.alertInfo}>
              <View style={styles.alertTitleContainer}>
                {getEmergencyIcon(emergency.type)}
                <Text style={[styles.alertTitle, { marginLeft: 8 }]}>
                  {'Emergency'}
                </Text>
              </View>
              <Text style={styles.alertDistance}>{Math.round(calculateDistance(userLocation, parseLocationString(emergency.location)))}m away</Text>
            </View>
            <View style={styles.alertActions}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: getMarkerColor(emergency.type) }]}
                onPress={() => onConfirm(emergency.id)}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>

              <TouchableOpacity>
                <Text>Can't Confirm</Text>
            </TouchableOpacity>
            </View>
          </View>
        ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

interface AnimatedMarkerProps {
  coordinate: LatLng;
  type: string;
  title: string;
  description: string;
}

const getMarkerColor = (type: string): string => {
  switch (type) {
    case 'medical':
      return '#FF0000'; // Red
    case 'fire':
      return '#FF6B00'; // Orange
    case 'police':
      return '#0066FF'; // Blue
    default:
      return '#FF0000';
  }
};

const AnimatedMarker: React.FC<AnimatedMarkerProps> = ({ coordinate, type, title, description }) => {
  const scale = useSharedValue(1);
  const [isCalloutVisible, setIsCalloutVisible] = useState(false);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const markerColor = getMarkerColor(type);

  return (
    <Marker 
      coordinate={coordinate}
      onPress={() => setIsCalloutVisible(true)}
    >
      <View style={styles.markerContainer}>
        <Animated.View 
          style={[
            styles.marker, 
            animatedStyle, 
            { 
              backgroundColor: `${markerColor}50`,
              borderColor: markerColor,
            }
          ]} 
        />
      </View>
      {isCalloutVisible && (
        <Callout 
          tooltip
          onPress={() => setIsCalloutVisible(false)}
        >
          <View style={[styles.calloutContainer, { borderColor: markerColor }]}>
            <View style={[styles.calloutHeader, { backgroundColor: markerColor }]}>
              <Text style={styles.calloutTitle}>{title}</Text>
            </View>
            <View style={styles.calloutBody}>
              <Text style={styles.calloutDescription}>{description}</Text>
              <Text style={[styles.calloutType, { color: markerColor }]}>
                Type: {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </View>
          </View>
        </Callout>
      )}
    </Marker>
  );
};

// Add this function before the MapScreen component
const parseLocationString = (locationString: string): LatLng => {
  try {
    const location = JSON.parse(locationString);
    return {
      latitude: Number(location.latitude),
      longitude: Number(location.longitude)
    };
  } catch (error) {
    console.error('Error parsing location string:', error);
    // Return a default location or handle the error as needed
    return { latitude: 0, longitude: 0 };
  }
};

// Add this function to detect hotspots
const detectHotspots = (emergencies: EmergencyResponse[], radius: number = 300): Hotspot[] => {
  const hotspots: Hotspot[] = [];
  const processed = new Set<string>();

  emergencies.forEach(emergency => {
    if (processed.has(emergency.id)) return;
    
    const location = parseLocationString(emergency.location);
    const nearbyEmergencies = emergencies.filter(e => {
      if (processed.has(e.id)) return false;
      const eLoc = parseLocationString(e.location);
      return calculateDistance(location, eLoc) <= radius;
    });

    if (nearbyEmergencies.length >= 2) { // Minimum 2 emergencies to form a hotspot
      // Calculate center point of all emergencies in cluster
      const center = nearbyEmergencies.reduce((acc, e) => {
        const loc = parseLocationString(e.location);
        return {
          latitude: acc.latitude + loc.latitude / nearbyEmergencies.length,
          longitude: acc.longitude + loc.longitude / nearbyEmergencies.length,
        };
      }, { latitude: 0, longitude: 0 });

      hotspots.push({
        center,
        count: nearbyEmergencies.length,
        emergencies: nearbyEmergencies,
      });

      // Mark all emergencies in this hotspot as processed
      nearbyEmergencies.forEach(e => processed.add(e.id));
    }
  });

  return hotspots;
};

// Add the HotspotCircle component
interface HotspotCircleProps {
  hotspot: Hotspot;
  radius: number;
}

const HotspotCircle: React.FC<HotspotCircleProps> = ({ hotspot, radius }) => {
  const opacity = Math.min(0.35, 0.15 + (hotspot.count * 0.05)); // Increase opacity with more emergencies
  
  return (
    <Circle
      center={hotspot.center}
      radius={radius}
      fillColor={`rgba(255, 0, 0, ${opacity})`}
      strokeColor="rgba(255, 0, 0, 0.5)"
      strokeWidth={1}
    />
  );
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emergencies, setEmergencies] = useState<EmergencyResponse[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);

  // Initialize socket connection
  useEffect(() => {
    const socket = socketManager.connect();

    socket.on('newEmergency', (data: {data: EmergencyResponse}) => {
      console.log('New emergency received:', data);
      setEmergencies(prev => {
        const exists = prev.some(e => e.id === data.data.id);
        if (exists) return prev;
        return [...prev, data.data];
      });

      if (location) {
        const emergencyLocation = parseLocationString(data.data.location);
        const userLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        const distance = calculateDistance(userLocation, emergencyLocation);
        
        if (distance <= 1000) {
          Alert.alert(
            'Nearby Emergency',
            `A new ${data.data.type.toLowerCase()} emergency has been reported ${Math.round(distance)}m away from your location.`
          );
        }
      }
    });

    return () => {
      socketManager.disconnect();
    };
  }, [location]);

  // Keep your existing useEffect for location and initial emergencies
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        Alert.alert('Permission Denied', 'Location permission is required to show nearby emergencies.');
        return;
      }

      try {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
        
        const newEmergencies = await getAllEmergencies();
        setEmergencies(newEmergencies);
        
        // Detect hotspots whenever emergencies update
        const newHotspots = detectHotspots(newEmergencies);
        setHotspots(newHotspots);

        mapRef.current?.animateToRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      } catch (error) {
        setErrorMsg('Error getting location');
        Alert.alert('Error', 'Failed to get your current location.');
      }
    })();
  }, []);

  const initialRegion: Region = {
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

    function handleConfirmEmergency(emergencyId: string): void {
        console.log('Emergency confirmed:', emergencyId);
    }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        provider={Platform.select({
          ios: PROVIDER_DEFAULT,  // Use Apple Maps on iOS
          android: PROVIDER_GOOGLE // Use Google Maps on Android
        })}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        mapType="standard"
      >
        {/* Render hotspots first so they appear under the markers */}
        {hotspots.map((hotspot, index) => (
          <HotspotCircle
            key={`hotspot-${index}`}
            hotspot={hotspot}
            radius={100}
          />
        ))}
        
        {emergencies.map((emergency) => (
          <AnimatedMarker
            key={emergency.id}
            coordinate={parseLocationString(emergency.location)}
            type={emergency.type}
            title={emergency.type}
            description={emergency.description}
          />
        ))}
      </MapView>
      {location && (
        <NearbyAlerts
          emergencies={emergencies}
          userLocation={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          onConfirm={handleConfirmEmergency}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  markerContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  calloutContainer: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  calloutHeader: {
    padding: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  calloutTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  calloutBody: {
    padding: 8,
    backgroundColor: 'white',
  },
  calloutDescription: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
  calloutType: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  alertsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
    maxHeight: 300,
  },
  alertsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  minimizeButton: {
    padding: 8,
  },
  minimizeIcon: {
    fontSize: 16,
    color: '#666',
  },
  alertsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  alertsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  alertInfo: {
    flex: 1,
    marginRight: 12,
  },
  alertTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  alertDistance: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  confirmButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    // paddingBottom: 20,
  },
}); 