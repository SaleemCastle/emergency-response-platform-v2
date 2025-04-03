import * as SecureStore from 'expo-secure-store';
import { socketManager } from './socket';

export interface Emergency {
  type: string;
  location: string;
  description: string;
  mediaUrl?: string;
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
    const pushToken = await SecureStore.getItemAsync('expoPushToken');
    
    if (!userId) {
      throw new Error('User ID not found. Please sign in again.');
    }

    // If there's a photo/recording URL, use FormData
    if (emergency.mediaUrl) {
      const formData = new FormData();
      
      formData.append('userId', userId);
      formData.append('type', emergency.type);
      formData.append('location', emergency.location);
      formData.append('description', emergency.description);
      formData.append('expoPushToken', pushToken || '');

      // Handle media file
      const uriParts = emergency.mediaUrl.split('.');
      const fileType = uriParts[uriParts.length - 1];

      const mimeType = emergency.type === 'VOICE' ? 'audio/m4a' : `image/${fileType}`;

      formData.append('media', {
        uri: emergency.mediaUrl,
        name: `emergency-media.${fileType}`,
        type: mimeType,
      } as any);

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/emergencies`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create emergency');
      }

      const createdEmergency = await response.json();
      socketManager.getSocket()?.emit('newEmergency', createdEmergency);
      return createdEmergency;

    } else {
      // For emergencies without media, use regular JSON
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/emergencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type: emergency.type,
          location: emergency.location,
          description: emergency.description,
          expoPushToken: pushToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create emergency');
      }

      const createdEmergency = await response.json();
      socketManager.getSocket()?.emit('newEmergency', createdEmergency);
      return createdEmergency;
    }

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

export async function getUserByEmail(email: string): Promise<User> {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/user/email/${encodeURIComponent(email)}`
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch user');
    }

    const user = await response.json();
    
    // Store the user ID in SecureStore
    await SecureStore.setItemAsync('userId', user.id);
    
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
} 