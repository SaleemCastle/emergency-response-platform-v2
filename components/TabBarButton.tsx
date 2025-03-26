import { icon } from '@/constants/Icons';
import { Easing, StyleSheet } from 'react-native';
import { Text, PlatformPressable } from '@react-navigation/elements';
import { useTheme } from '@react-navigation/native';
import { useLinkBuilder } from '@react-navigation/native';
import React, { useEffect } from 'react'
import { useAnimatedStyle, useSharedValue, withSpring, interpolate } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

interface ITabBarButtonProps {
    routeName: string;
    color: string;
    label: string;
    isFocused: boolean;
    onPress: () => void;
    onLongPress: () => void;
}
const TabBarButton = ({ routeName, color, label, isFocused, onPress, onLongPress }: ITabBarButtonProps) => {
    const { colors } = useTheme();
    const scale = useSharedValue(0)

    useEffect(() => {
        scale.value = withSpring(typeof isFocused === 'boolean' ? (isFocused ? 1 : 0) : isFocused, {
            duration: 350,
        })
    }, [scale, isFocused])

    const animatedTextStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scale.value, [0, 1], [1, 0])
        return {
            opacity,
        }
    })

    const animatedIconStyle = useAnimatedStyle(() => {
        const scaleValue = interpolate(scale.value, [0, 1], [1, 1.2])

        const top = interpolate(scale.value, [0, 1], [0, 9])
        return {
            transform: [{ scale: scaleValue }],
            top
        }
    })

    return (
        <PlatformPressable
            key={routeName}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabBarItem}
        >
            <Animated.View style={animatedIconStyle}>
                {icon[routeName as keyof typeof icon]({ color: isFocused ? '#fff' : colors.background })}
            </Animated.View>

            <Animated.Text style={[{ color: isFocused ? '#fff' : colors.background, fontSize: 12 }, animatedTextStyle]}>
                {label}
            </Animated.Text>
        </PlatformPressable>
    )
}

export default TabBarButton

const styles = StyleSheet.create({
    tabBarItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,

    },
})
