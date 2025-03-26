import * as SecureStore from 'expo-secure-store';
import { socketManager } from './socket';

export interface Emergency {
  type: string;
  location: string;
  description: string;
  photoUrl?: string;
}

export interface EmergencyResponse {
  id: string;
  userId: string;
  type: string;
  location: string;
  description: string;
  mediaUrl?: string;
  status: string;
  timestamp: string;
  severity: number;
  user: User;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export async function createEmergency(emergency: Emergency) {
  try {
    const userId = await SecureStore.getItemAsync('userId');
    if (!userId) {
      throw new Error('User ID not found. Please sign in again.');
    }

    // Create FormData object
    const formData = new FormData();
    
    // Add all emergency data as form fields
    formData.append('userId', userId);
    formData.append('type', emergency.type);
    formData.append('location', emergency.location);
    formData.append('description', emergency.description);

    // If there's a photo/recording URL (from emergency.photoUrl), add it as media
    if (emergency.photoUrl) {
      // Get the file extension from the URI
      const uriParts = emergency.photoUrl.split('.');
      const fileType = uriParts[uriParts.length - 1];

      // Create appropriate mime type based on file type
      let mimeType: string;
      if (emergency.type === 'VOICE') {
        mimeType = 'audio/m4a';  // For voice recordings
      } else {
        mimeType = `image/${fileType}`;  // For images
      }

      formData.append('media', {
        uri: emergency.photoUrl,
        name: `emergency-media.${fileType}`,
        type: mimeType,
      } as any);
    }

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/emergencies`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        // Note: Don't set Content-Type header, it will be automatically set with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create emergency');
    }

    const createdEmergency = await response.json();

    // Get socket instance and emit event if socket is connected
    const socket = socketManager.getSocket();
    if (socket?.connected) {
      socket.emit('newEmergency', createdEmergency);
    }

    return createdEmergency;
  } catch (error) {
    console.error('Error creating emergency:', error);
    throw error;
  }
}

export async function getAllEmergencies(): Promise<EmergencyResponse[]> {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/emergencies`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch emergencies');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching emergencies:', error);
    throw error;
  }
}

export async function confirmEmergency(emergencyId: string) {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/emergencies/${emergencyId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to confirm emergency');
    }

    // store all confirmed emergencies in the local storage so we can only show the user the emergencies they have not confirmed

    const confirmedEmergencies = await SecureStore.getItemAsync('confirmedEmergencies');
    if (confirmedEmergencies) {
      await SecureStore.setItemAsync('confirmedEmergencies', JSON.stringify([...confirmedEmergencies, emergencyId]));
    } else {
      await SecureStore.setItemAsync('confirmedEmergencies', JSON.stringify([emergencyId]));
    }

    return await response.json();
  } catch (error) {
    console.error('Error confirming emergency:', error);
    throw error;
  }
} 


export async function getUserId(): Promise<string | null> {
  return await SecureStore.getItemAsync('userId');
} 