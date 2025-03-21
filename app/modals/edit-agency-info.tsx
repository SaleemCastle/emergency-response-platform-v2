import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function EditAgencyInfoScreen() {
  const router = useRouter();
  const { agencyType } = useLocalSearchParams();

  const [agencyInfo, setAgencyInfo] = useState({
    agencyName: '',
    identifier: '', // Badge number, medical license, or fire service ID
    role: '',
    jurisdiction: '',
    department: ''
  });

  const getIdentifierLabel = () => {
    switch (agencyType) {
      case 'hospital':
        return 'Medical License Number';
      case 'police':
        return 'Badge Number';
      case 'fire_brigade':
        return 'Service ID';
      default:
        return 'Identifier';
    }
  };

  const handleSave = () => {
    // TODO: Save agency info to backend
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Agency Information</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Agency Name</Text>
          <TextInput
            style={styles.input}
            value={agencyInfo.agencyName}
            onChangeText={(text) => setAgencyInfo(prev => ({ ...prev, agencyName: text }))}
            placeholder="Agency Name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{getIdentifierLabel()}</Text>
          <TextInput
            style={styles.input}
            value={agencyInfo.identifier}
            onChangeText={(text) => setAgencyInfo(prev => ({ ...prev, identifier: text }))}
            placeholder={getIdentifierLabel()}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Role</Text>
          <TextInput
            style={styles.input}
            value={agencyInfo.role}
            onChangeText={(text) => setAgencyInfo(prev => ({ ...prev, role: text }))}
            placeholder="Your Role"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Jurisdiction</Text>
          <TextInput
            style={styles.input}
            value={agencyInfo.jurisdiction}
            onChangeText={(text) => setAgencyInfo(prev => ({ ...prev, jurisdiction: text }))}
            placeholder="Area of Operation"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Department (Optional)</Text>
          <TextInput
            style={styles.input}
            value={agencyInfo.department}
            onChangeText={(text) => setAgencyInfo(prev => ({ ...prev, department: text }))}
            placeholder="Department Name"
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