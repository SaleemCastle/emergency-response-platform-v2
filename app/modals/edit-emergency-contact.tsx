import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// This would typically come from your app's state management (Redux, Context, etc.)
interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export default function EditEmergencyContactScreen() {
  const router = useRouter();
  const [contact, setContact] = useState<EmergencyContact>({
    name: '',
    phone: '',
    relationship: ''
  });

  const handleSave = () => {
    // Validate fields
    if (!contact.name.trim() || !contact.phone.trim() || !contact.relationship.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // TODO: Save contact info to backend and update global state
    // For now, we'll just go back
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Emergency Contact</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={contact.name}
            onChangeText={(text) => setContact(prev => ({ ...prev, name: text }))}
            placeholder="Contact Name"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={contact.phone}
            onChangeText={(text) => setContact(prev => ({ ...prev, phone: text }))}
            placeholder="Phone Number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Relationship</Text>
          <TextInput
            style={styles.input}
            value={contact.relationship}
            onChangeText={(text) => setContact(prev => ({ ...prev, relationship: text }))}
            placeholder="e.g. Parent, Spouse, Sibling"
            autoCapitalize="words"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
}); 