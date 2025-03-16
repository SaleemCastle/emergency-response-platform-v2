import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';

const UserProfileScreen = ({ navigation }) => {
  const [profileImage, setProfileImage] = useState(null);
  // This would typically come from your auth system
  const [userName, setUserName] = useState('John Doe');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    (async () => {
      // Request permissions when component mounts
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
      
      // Check permissions again just in case
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
                // This will open the app settings on iOS
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

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        // Simulate upload delay
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

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // Add your logout logic here
            // For example: navigation.replace('Login');
            Alert.alert('Logged Out', 'You have been successfully logged out.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Icon name="logout" size={24} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

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
          {isUploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="#FFF" size="large" />
              <Text style={styles.uploadingText}>Updating...</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.userName}>{userName}</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Icon name="phone" size={24} color="#666" />
          <Text style={styles.infoText}>Emergency Contact: 911</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="map-marker" size={24} color="#666" />
          <Text style={styles.infoText}>Location Services: Enabled</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  logoutText: {
    color: '#FF3B30',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
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
  },
  infoSection: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  infoText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#FFF',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default UserProfileScreen; 
