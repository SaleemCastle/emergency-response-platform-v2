import { View, Text, StyleSheet, Image, Alert, Platform, Linking, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Types for different user categories
type UserType = 'civilian' | 'agency';
type AgencyType = 'hospital' | 'police' | 'fire_brigade';

interface AgencyInfo {
  agencyName: string;
  identifier: string; // Badge number, medical license, or fire service ID
  role: string;
  jurisdiction: string;
  department?: string;
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  // Basic profile state
  const [profileImage, setProfileImage] = useState(user?.imageUrl);
  const [userName, setUserName] = useState(user?.fullName);
  const [isUploading, setIsUploading] = useState(false);
  
  // TODO: These would come from user's auth/signup data
  const [userType, setUserType] = useState<UserType>('civilian');
  const [agencyType, setAgencyType] = useState<AgencyType | null>(null);
  
  // Civilian specific state
  const [emergencyContact, setEmergencyContact] = useState({
    name: '',
    phone: '',
    relationship: ''
  });

  // Agency specific state
  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo>({
    agencyName: '',
    identifier: '',
    role: '',
    jurisdiction: '',
    department: ''
  });

  // Verification status (would come from backend)
  const [isVerified, setIsVerified] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Sorry, we need camera roll permissions to upload your profile photo.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  const handleImagePick = async () => {
    try {
      setIsUploading(true);
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable photo library access in your device settings to change your profile photo.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                }
              }
            }
          ]
        );
        setIsUploading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        allowsMultipleSelection: false,
      }); 

      if (!result.canceled && result.assets && result.assets[0]) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProfileImage(result.assets[0].uri);
        Alert.alert(
          'Success',
          'Profile photo updated successfully!',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Error',
        'Failed to update profile photo. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Render agency-specific identification section based on agency type
  const renderAgencyIdentification = () => {
    switch (agencyType) {
      case 'hospital':
        return (
          <View style={styles.infoRow}>
            <Icon name="medical-bag" size={24} color="#666" />
            <Text style={styles.infoLabel}>Medical License:</Text>
            <Text style={styles.infoText}>{agencyInfo.identifier}</Text>
          </View>
        );
      case 'police':
        return (
          <View style={styles.infoRow}>
            <Icon name="badge-account" size={24} color="#666" />
            <Text style={styles.infoLabel}>Badge Number:</Text>
            <Text style={styles.infoText}>{agencyInfo.identifier}</Text>
          </View>
        );
      case 'fire_brigade':
        return (
          <View style={styles.infoRow}>
            <Icon name="fire" size={24} color="#666" />
            <Text style={styles.infoLabel}>Service ID:</Text>
            <Text style={styles.infoText}>{agencyInfo.identifier}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  // Render agency badge/verification based on type
  const renderAgencyBadge = () => {
    let icon = "shield-check";
    let color = "#007AFF";
    let text = "Emergency Response Official";

    switch (agencyType) {
      case 'hospital':
        icon = "hospital-building";
        color = "#4CAF50";
        text = "Medical Services";
        break;
      case 'police':
        icon = "police-badge";
        color = "#1a237e";
        text = "Law Enforcement";
        break;
      case 'fire_brigade':
        icon = "fire";
        color = "#d32f2f";
        text = "Fire Service";
        break;
    }

    return (
      <View style={[styles.badgeContainer, { backgroundColor: `${color}20` }]}>
        <Icon name={icon} size={20} color={color} />
        <Text style={[styles.badgeText, { color }]}>{text}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Temporary Type Switcher */}
      <View style={styles.typeSwitcher}>
        <Text style={styles.switcherLabel}>User Type:</Text>
        <TouchableOpacity
          style={[styles.switcherButton, userType === 'civilian' && styles.switcherButtonActive]}
          onPress={() => {
            setUserType('civilian');
            setAgencyType(null);
          }}
        >
          <Text style={[styles.switcherText, userType === 'civilian' && styles.switcherTextActive]}>Civilian</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.switcherButton, userType === 'agency' && styles.switcherButtonActive]}
          onPress={() => setUserType('agency')}
        >
          <Text style={[styles.switcherText, userType === 'agency' && styles.switcherTextActive]}>Agency</Text>
        </TouchableOpacity>
      </View>

      {/* Agency Type Selector (only visible when agency is selected) */}
      {userType === 'agency' && (
        <View style={styles.typeSwitcher}>
          <Text style={styles.switcherLabel}>Agency Type:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.agencyTypesScroll}>
            {(['hospital', 'police', 'fire_brigade'] as AgencyType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.switcherButton, agencyType === type && styles.switcherButtonActive]}
                onPress={() => setAgencyType(type)}
              >
                <Text style={[styles.switcherText, agencyType === type && styles.switcherTextActive]}>
                  {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.profileSection}>
        <TouchableOpacity 
          style={styles.imageContainer}
          onPress={handleImagePick}
          disabled={isUploading}
        >
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Icon name="account" size={80} color="#666" />
            </View>
          )}
          <View style={styles.editIconContainer}>
            {isUploading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Icon name="camera" size={20} color="#FFF" />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.userName}>{userName}</Text>
        {userType === 'agency' && renderAgencyBadge()}
        {userType === 'civilian' && isVerified && (
          <View style={styles.verificationBadge}>
            <Icon name="check-circle" size={20} color="#4CAF50" />
            <Text style={styles.verifiedText}>Verified User</Text>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Icon name="id-card" size={24} color="#666" />
          <Text style={styles.infoLabel}>User ID:</Text>
          <Text style={styles.infoText}>{user?.id}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Icon name="email" size={24} color="#666" />
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoText}>{user?.emailAddresses[0]?.emailAddress}</Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="phone" size={24} color="#666" />
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoText}>{user?.phoneNumbers[0]?.phoneNumber || 'Not set'}</Text>
        </View>
      </View>

      {userType === 'civilian' && (
        <>
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Emergency Contact</Text>
          </View>

          <View style={styles.emergencyContactSection}>
            <View style={styles.infoRow}>
              <Icon name="account-alert" size={24} color="#666" />
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoText}>{emergencyContact.name || 'Not set'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Icon name="phone-alert" size={24} color="#666" />
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoText}>{emergencyContact.phone || 'Not set'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Icon name="account-question" size={24} color="#666" />
              <Text style={styles.infoLabel}>Relationship:</Text>
              <Text style={styles.infoText}>{emergencyContact.relationship || 'Not set'}</Text>
            </View>

            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => router.push('/modals/edit-emergency-contact')}
            >
              <Icon name="pencil" size={20} color="#FFF" />
              <Text style={styles.editButtonText}>Edit Emergency Contact</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {userType === 'agency' && (
        <>
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Agency Information</Text>
          </View>

          <View style={styles.agencySection}>
            <View style={styles.infoRow}>
              <Icon name="office-building" size={24} color="#666" />
              <Text style={styles.infoLabel}>Agency:</Text>
              <Text style={styles.infoText}>{agencyInfo.agencyName}</Text>
            </View>

            {renderAgencyIdentification()}

            <View style={styles.infoRow}>
              <Icon name="account-tie" size={24} color="#666" />
              <Text style={styles.infoLabel}>Role:</Text>
              <Text style={styles.infoText}>{agencyInfo.role}</Text>
            </View>

            <View style={styles.infoRow}>
              <Icon name="map-marker" size={24} color="#666" />
              <Text style={styles.infoLabel}>Jurisdiction:</Text>
              <Text style={styles.infoText}>{agencyInfo.jurisdiction}</Text>
            </View>

            {agencyInfo.department && (
              <View style={styles.infoRow}>
                <Icon name="domain" size={24} color="#666" />
                <Text style={styles.infoLabel}>Department:</Text>
                <Text style={styles.infoText}>{agencyInfo.department}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => router.push({
                pathname: '/modals/edit-agency-info',
                params: { agencyType }
              })}
            >
              <Icon name="pencil" size={20} color="#FFF" />
              <Text style={styles.editButtonText}>Edit Agency Information</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleSignOut}
      >
        <Icon name="logout" size={24} color="#FFF" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  placeholderImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#E1E1E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#808080',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verifiedText: {
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    marginLeft: 4,
    fontWeight: '500',
  },
  infoSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  sectionTitle: {
    padding: 20,
    paddingBottom: 10,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
    width: 100,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  emergencyContactSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  agencySection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  editButtonText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    margin: 20,
    padding: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  typeSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  switcherLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 10,
  },
  switcherButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
  },
  switcherButtonActive: {
    borderColor: '#007AFF',
  },
  switcherText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  switcherTextActive: {
    fontWeight: '600',
  },
  agencyTypesScroll: {
    padding: 10,
  },
});