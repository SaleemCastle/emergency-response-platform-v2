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
  photoUrl?: string;
  status: string;
  timestamp: string;
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

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/emergencies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...emergency,
        userId,
      }),
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

    return await response.json();
  } catch (error) {
    console.error('Error confirming emergency:', error);
    throw error;
  }
} 


export async function getUserId(): Promise<string | null> {
  return await SecureStore.getItemAsync('userId');
} 