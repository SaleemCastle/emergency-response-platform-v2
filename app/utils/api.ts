import * as SecureStore from 'expo-secure-store';

export interface Emergency {
  type: string;
  location: string;
  description: string;
  photoUrl?: string;
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

    return await response.json();
  } catch (error) {
    console.error('Error creating emergency:', error);
    throw error;
  }
}

export async function getUserId(): Promise<string | null> {
  return await SecureStore.getItemAsync('userId');
} 