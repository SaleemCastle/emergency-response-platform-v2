import { View, Platform, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useLinkBuilder, useTheme } from '@react-navigation/native';
import { Text, PlatformPressable } from '@react-navigation/elements';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import TabBarButton from './TabBarButton';
import { useCallback, useState } from 'react';
import Animated, { withSpring, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

export const TabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    const { colors } = useTheme();
    const [dimensions, setDimensions] = useState({ width: 100, height: 20 })

    const buttonWidth = dimensions.width / state.routes.length

    const onTabBarLayout = useCallback((event: LayoutChangeEvent) => {
        setDimensions({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })
    }, [])

    const tabPositionX = useSharedValue(0)
    
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: tabPositionX.value }],
        }
    })


    return (
        <View style={styles.tabBar} onLayout={onTabBarLayout}>
            <Animated.View style={[animatedStyle, {
                position: 'absolute',
                backgroundColor: '#fb5969',
                borderRadius: 30,
                marginHorizontal: 12,
                height: dimensions.height - 15,
                width: buttonWidth - 25
            }]}/>    
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label =
                    options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                const isFocused = state.index === index;

                const onPress = () => {
                    tabPositionX.value = withSpring(index * buttonWidth, {duration: 1500})
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name, route.params);
                    }
                };

                const onLongPress = () => {
                    navigation.emit({
                        type: 'tabLongPress',
                        target: route.key,
                    });
                };

                return (
                    <TabBarButton
                        key={route.key}
                        isFocused={isFocused}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        routeName={route.name}
                        color={isFocused ? '#fff' : colors.text}
                        label={label as string}
                    />
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        marginHorizontal: Platform.OS === 'ios' ? 80 : 20,
        paddingVertical: 15,
        borderRadius: 35,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    tabBarItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,

    },
})
