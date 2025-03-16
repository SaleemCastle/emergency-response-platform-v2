import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Dimensions, TouchableWithoutFeedback, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Audio } from 'expo-av';
import { createEmergency } from '../utils/api';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
const maxScale = Math.max(width, height) / 80; // Scale to cover the entire screen
const COOLDOWN_DURATION = 2000; // 2 seconds cooldown
const BUTTON_COLOR = '#fb2c36';  // Adding grey color constant
const ECHO_COLOR = '#ff3b30';  // Add red color for echo effect
const MAX_CHARS = 1000;
const RECORDING_DURATION = 5000; // 5 seconds
const NUM_BARS = 30; // Number of bars in the waveform
const MIN_BAR_HEIGHT = 0.2; // Minimum height of a bar as a percentage

// Recording configuration
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

const AlertScreen = () => {
  const [isPressed, setIsPressed] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [emergencyText, setEmergencyText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(5);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [recordingLevel, setRecordingLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnims = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const levelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(Array(NUM_BARS).fill(MIN_BAR_HEIGHT));
  const waveformAnims = useRef(Array(NUM_BARS).fill(0).map(() => new Animated.Value(MIN_BAR_HEIGHT))).current;
  const [location, setLocation] = useState<string>('Unknown location');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation values for option buttons
  const optionAnims = {
    left: useRef(new Animated.Value(0)).current,
    right: useRef(new Animated.Value(0)).current,
    top: useRef(new Animated.Value(0)).current,
    scale: useRef(new Animated.Value(0)).current,
    opacity: useRef(new Animated.Value(0)).current,
  };

  // Check for permissions when component mounts
  useEffect(() => {
    checkPermissions();
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(JSON.stringify({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude
        }));
      }
    })();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (levelTimerRef.current) clearInterval(levelTimerRef.current);
      stopRecording();
    };
  }, []);

  const checkPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      const hasPermission = status === 'granted';
      setHasPermission(hasPermission);
      
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please grant microphone access to record audio emergencies.',
          [
            { text: 'OK', onPress: () => checkPermissions() }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      Alert.alert('Error', 'Failed to check microphone permissions');
    }
  };

  const handleCooldown = () => {
    setIsButtonDisabled(true);
    setTimeout(() => {
      setIsButtonDisabled(false);
    }, COOLDOWN_DURATION);
  };

  const showOptionButtons = () => {
    console.log('Long press detected!');
    
    // First set the state
    setShowOptions(true);
    
    // Then start animations in the next frame
    requestAnimationFrame(() => {
      // Reset animation values
      optionAnims.scale.setValue(0);
      optionAnims.opacity.setValue(0);
      optionAnims.left.setValue(0);
      optionAnims.right.setValue(0);
      optionAnims.top.setValue(0);
      
      // Start animations
      Animated.parallel([
        Animated.spring(optionAnims.scale, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(optionAnims.opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(optionAnims.left, {
          toValue: -130,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(optionAnims.right, {
          toValue: 130,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(optionAnims.top, {
          toValue: -130,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const hideOptionButtons = () => {
    Animated.parallel([
      Animated.timing(optionAnims.scale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(optionAnims.opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(optionAnims.left, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(optionAnims.right, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(optionAnims.top, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowOptions(false));
  };

  const handleTextSubmit = async () => {
    if (emergencyText.trim() && !isSubmitting) {
      Alert.alert(
        'Confirm Emergency Report',
        'Are you sure you want to submit this emergency report?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setShowTextModal(false);
              hideOptionButtons();
            }
          },
          {
            text: 'Submit',
            style: 'destructive',
            onPress: async () => {
              if (isSubmitting) return;
              try {
                setIsSubmitting(true);
                setIsButtonDisabled(true);

                const emergency = await createEmergency({
                  type: 'TEXT',
                  location: location,
                  description: emergencyText.trim(),
                });

                console.log('Emergency created:', emergency);
                Alert.alert('Emergency Reported', 'Your emergency has been reported successfully. Help is on the way.');
                setShowTextModal(false);
                hideOptionButtons();
                setEmergencyText('');
                handleCooldown();
              } catch (error) {
                console.error('Failed to create emergency:', error);
                Alert.alert('Error', 'Failed to report emergency. Please try again.');
                setIsButtonDisabled(false);
              } finally {
                setIsSubmitting(false);
              }
            }
          }
        ]
      );
    } else {
      Alert.alert('Error', 'Please enter some text before submitting.');
    }
  };

  const triggerEchoEffect = (callback: () => void) => {
    setIsPressed(true);
    
    // Reset all animations
    pulseAnims.forEach(anim => anim.setValue(1));
    
    const pulseAnimations = pulseAnims.map((anim, index) => 
      Animated.sequence([
        Animated.delay(index * 200),
        Animated.timing(anim, {
          toValue: maxScale,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const buttonAnimation = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]);

    Animated.parallel([
      buttonAnimation,
      ...pulseAnimations
    ]).start(() => {
      setIsPressed(false);
      if (callback) callback();
    });
  };

  const handleEmergencyPress = async (type: string) => {
    if (isButtonDisabled || isSubmitting) return;

    try {
      if (location === 'Unknown location') {
        Alert.alert('Warning', 'Unable to get your precise location. Emergency will be reported with unknown location.');
      }

      if (type === 'Text') {
        setShowTextModal(true);
      } else if (type === 'Voice') {
        startRecording();
      } else {
        Alert.alert(
          'Confirm Emergency',
          `Are you sure you want to report a ${type.toLowerCase()} emergency?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: hideOptionButtons
            },
            {
              text: 'Report Emergency',
              style: 'destructive',
              onPress: async () => {
                if (isSubmitting) return;
                try {
                  setIsSubmitting(true);
                  setIsButtonDisabled(true);
                  
                  const emergency = await createEmergency({
                    type: type.toUpperCase(),
                    location: location,
                    description: `Emergency reported via ${type.toLowerCase()} button`,
                  });
                  
                  console.log('Emergency created:', emergency);
                  Alert.alert('Emergency Reported', 'Your emergency has been reported successfully. Help is on the way.');
                  hideOptionButtons();
                  handleCooldown();
                } catch (error) {
                  console.error('Failed to create emergency:', error);
                  Alert.alert('Error', 'Failed to report emergency. Please try again.');
                  setIsButtonDisabled(false);
                } finally {
                  setIsSubmitting(false);
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error in handleEmergencyPress:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const renderOptionButton = (position: string, icon: string, color: string, onPress: () => void) => {
    const translateX = position === 'left' ? optionAnims.left : 
                      position === 'right' ? optionAnims.right : 0;
    const translateY = position === 'top' ? optionAnims.top : 0;

    return (
      <Animated.View
        style={[
          styles.optionButtonContainer,
          {
            transform: [
              { translateX },
              { translateY },
              { scale: optionAnims.scale }
            ],
            opacity: optionAnims.opacity,
            zIndex: 2,
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.optionButton, { backgroundColor: color }]}
          onPress={onPress}
        >
          <Icon name={icon} size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const animateWaveform = () => {
    if (!isRecording) return;

    // Generate new random heights for the waveform bars
    const newWaveformData = Array(NUM_BARS).fill(0).map(() => 
      Math.max(MIN_BAR_HEIGHT, Math.min(1, Math.random() * recordingLevel + 0.3))
    );
    setWaveformData(newWaveformData);

    // Animate each bar to its new height
    const animations = newWaveformData.map((height, index) =>
      Animated.spring(waveformAnims[index], {
        toValue: height,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    );

    Animated.parallel(animations).start(() => {
      if (isRecording) {
        requestAnimationFrame(animateWaveform);
      }
    });
  };

  const startRecording = async () => {
    try {
      if (!hasPermission) {
        await checkPermissions();
        if (!hasPermission) return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setShowRecordingModal(true);
      setRecordingTime(5);

      // Start monitoring recording level and animate waveform
      levelTimerRef.current = setInterval(async () => {
        if (recordingRef.current) {
          try {
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording) {
              // Simulate audio level for visual feedback
              const level = Math.random() * 0.7 + 0.3; // Random value between 0.3 and 1.0
              setRecordingLevel(level);
            }
          } catch (error) {
            console.error('Error getting recording status:', error);
          }
        }
      }, 100);

      // Start waveform animation
      requestAnimationFrame(animateWaveform);

      // Start countdown timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => {
          if (prevTime <= 1) {
            stopRecording();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      // Stop recording after duration
      setTimeout(() => {
        stopRecording();
      }, RECORDING_DURATION);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
      setShowRecordingModal(false);
    }
  };

  const stopRecording = async () => {
    try {
      // Clear timers first
      if (levelTimerRef.current) {
        clearInterval(levelTimerRef.current);
        levelTimerRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording) {
            await recordingRef.current.stopAndUnloadAsync();
          }
          const uri = recordingRef.current.getURI();
          console.log('Recording saved at:', uri);
          
          recordingRef.current = null;
          setIsRecording(false);
          setShowRecordingModal(false);
          setRecordingTime(5);
          setRecordingLevel(0);

          if (uri) {
            Alert.alert(
              'Confirm Emergency Report',
              'Are you sure you want to submit this voice recording?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: hideOptionButtons
                },
                {
                  text: 'Submit',
                  style: 'destructive',
                  onPress: async () => {
                    if (isSubmitting) return;
                    try {
                      setIsSubmitting(true);
                      setIsButtonDisabled(true);
                      
                      const emergency = await createEmergency({
                        type: 'VOICE',
                        location: location,
                        description: 'Voice recording emergency report',
                        photoUrl: uri,
                      });

                      console.log('Emergency created:', emergency);
                      Alert.alert('Emergency Reported', 'Your voice emergency report has been submitted successfully. Help is on the way.');
                      hideOptionButtons();
                      handleCooldown();
                    } catch (error) {
                      console.error('Failed to create emergency:', error);
                      Alert.alert('Error', 'Failed to report emergency. Please try again.');
                      setIsButtonDisabled(false);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }
                }
              ]
            );
          }
        } catch (error) {
          console.error('Error stopping recording:', error);
          recordingRef.current = null;
          setIsRecording(false);
          setShowRecordingModal(false);
          setRecordingTime(5);
          setRecordingLevel(0);
          Alert.alert('Error', 'Failed to save recording. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error in stopRecording:', error);
      if (recordingRef.current) {
        recordingRef.current = null;
      }
      setIsRecording(false);
      setShowRecordingModal(false);
      setRecordingTime(5);
      setRecordingLevel(0);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleMainButtonPress = () => {
    if (!isButtonDisabled) {
      if (showOptions) {
        hideOptionButtons();
      } else {
        triggerEchoEffect(() => handleEmergencyPress('General'));
      }
    }
  };

  const renderRecordingModal = () => (
    <Modal
      visible={showRecordingModal}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.recordingModalContent}>
          <View style={styles.waveformContainer}>
            {waveformAnims.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveformBar,
                  {
                    transform: [{ scaleY: anim }],
                    backgroundColor: ECHO_COLOR,
                    opacity: 0.7,
                  },
                ]}
              />
            ))}
          </View>
          <ActivityIndicator size="large" color={ECHO_COLOR} style={styles.recordingIndicator} />
          <Text style={styles.recordingText}>Recording... {recordingTime}s</Text>
          <Text style={styles.recordingSubtext}>Please speak clearly</Text>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SafeZone</Text>
        <Text style={styles.subtitle}>Press the REPORT EMERGENCY button to report an emergency and Long press to choose report type</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        {/* Echo effect circles */}
        {pulseAnims.map((pulseAnim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.echoCircle,
              {
                opacity: isPressed ? pulseAnim.interpolate({
                  inputRange: [1, maxScale],
                  outputRange: [0.4, 0],
                }) : 0,
                transform: [
                  { scale: pulseAnim },
                ],
              },
            ]}
          />
        ))}
        
        {/* Main button */}
        <Animated.View
          style={[
            styles.buttonWrapper,
            {
              transform: [{ scale: scaleAnim }],
              opacity: isButtonDisabled ? 0.6 : 1,
            },
          ]}
        >
          <TouchableOpacity 
            style={styles.emergencyButton}
            onLongPress={() => {
              if (!isButtonDisabled) {
                showOptionButtons();
              }
            }}
            onPress={handleMainButtonPress}
            activeOpacity={0.8}
            delayLongPress={1000}
            disabled={isButtonDisabled}
          >
            <Text style={[styles.buttonText, isButtonDisabled && styles.disabledText]}>
              {isButtonDisabled ? 'PLEASE WAIT...' : (showOptions ? 'CANCEL' : 'REPORT\nEMERGENCY')}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Option buttons with overlay */}
        {showOptions && (
          <>
            <TouchableWithoutFeedback onPress={hideOptionButtons}>
              <View style={styles.overlay} />
            </TouchableWithoutFeedback>
            <View style={styles.optionsContainer}>
              {renderOptionButton('left', 'message-text', BUTTON_COLOR, () => handleEmergencyPress('Text'))}
              {renderOptionButton('right', 'microphone', BUTTON_COLOR, () => handleEmergencyPress('Voice'))}
              {renderOptionButton('top', 'camera', BUTTON_COLOR, () => handleEmergencyPress('Camera'))}
            </View>
          </>
        )}

        {/* Text Input Modal */}
        <Modal
          visible={showTextModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowTextModal(false);
            hideOptionButtons();
          }}
        >
          <TouchableWithoutFeedback onPress={() => setShowTextModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <KeyboardAvoidingView 
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  style={styles.modalContent}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Describe Your Emergency</Text>
                    <Text style={styles.charCount}>
                      {emergencyText.length}/{MAX_CHARS}
                    </Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    multiline
                    maxLength={MAX_CHARS}
                    placeholder="Please describe your emergency situation..."
                    value={emergencyText}
                    onChangeText={setEmergencyText}
                    autoFocus
                  />
                  <View style={styles.modalButtons}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setShowTextModal(false);
                        hideOptionButtons();
                      }}
                    >
                      <Text style={styles.modalButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.submitButton]}
                      onPress={handleTextSubmit}
                    >
                      <Text style={styles.modalButtonText}>Submit</Text>
                    </TouchableOpacity>
                  </View>
                </KeyboardAvoidingView>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>

      {renderRecordingModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  buttonWrapper: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyButton: {
    width: 160,
    height: 160,
    backgroundColor: BUTTON_COLOR,  // Changed to grey
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  echoCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: ECHO_COLOR,  // Change to red color
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
  },
  optionsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionButtonContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  optionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledText: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  charCount: {
    color: '#666',
  },
  textInput: {
    height: 150,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  submitButton: {
    backgroundColor: BUTTON_COLOR,
  },
  modalButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  waveformContainer: {
    width: 250,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  waveformBar: {
    width: 4,
    height: 40,
    backgroundColor: ECHO_COLOR,
    borderRadius: 2,
  },
  recordingModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 250,
  },
  recordingIndicator: {
    marginBottom: 20,
  },
  recordingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  recordingSubtext: {
    fontSize: 14,
    color: '#666',
  },
});

export default AlertScreen; 