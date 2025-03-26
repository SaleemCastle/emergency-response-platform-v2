import { Feather, MaterialCommunityIcons } from "@expo/vector-icons"

export const icon = {
    explore: (props: any) => {
        return <Feather name='home' size={24} color={props.color} />
    },
    map: (props: any) => {
        return <MaterialCommunityIcons name='alarm-light' size={24} color={props.color} />
    },
    profile: (props: any) => {
        return <Feather name='user' size={24} color={props.color} />
    },
}