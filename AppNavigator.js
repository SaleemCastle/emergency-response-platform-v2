import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AlertScreen from '../screens/AlertScreen';
// import MapScreen from '../screens/MapScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Alert"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Alert" component={AlertScreen} />
        {/* <Stack.Screen name="Map" component={MapScreen} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 
