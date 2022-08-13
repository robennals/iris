
import React from 'react';
import { Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenContentScroll, WideButton } from '../components/basics';
import { leaveGroupAsync } from '../data/servercall';

export function LeaveGroupScreen({navigation, route}){
    const {group} = route.params;

    function leaveGroup() {
        navigation.reset({index: 0, routes: [{name: 'home'}]});
        leaveGroupAsync({group});
    }

    return (
        <ScreenContentScroll>
            <Text>Are you sure you want to leave this group?</Text>

            <WideButton style={{alignSelf: 'flex-start'}} onPress={() => leaveGroup()}>Confirm - Leave Group</WideButton>
        </ScreenContentScroll>
    )

}