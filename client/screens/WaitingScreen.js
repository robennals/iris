import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FixedTouchable, FormInput, FormTitle, MemberIcon, ScreenContentScroll, WideButton } from '../components/basics';
import _ from 'lodash';

function Para({children}) {
    return (
        <Text style={{marginVertical: 8, fontSize: 15, lineHeight: 20, color: '#444'}}>
            {children}
        </Text>
    )
}

export function WaitingScreen() {
    return (
        <ScreenContentScroll style={{marginHorizontal: 32}}>
            <Text style={{fontSize: 20, fontWeight: '500', textAlign: 'center', alignSelf: 'center', marginTop: 16, marginBottom: 16}}>
                You have not yet been matched into any group chats.
            </Text>
            <Para>
                We will send you an email when we have matched you into a group. 
                If you have turned on notifications then you will also receive a notification.
            </Para>            
            <Para>
                To get matched into private group chats with other community members, go to your 
                topic feed and say which topics you want to talk about. You can also increase your
                chance of a good match by writing viewpoints about topics. We will then match you
                into private group chats with other community members who want to talk about the 
                same topic.
            </Para>
        </ScreenContentScroll>
    )   
}