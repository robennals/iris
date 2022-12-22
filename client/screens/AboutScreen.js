import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FixedTouchable, FormInput, FormTitle, MemberIcon, ScreenContentScroll, WideButton } from '../components/basics';
import _ from 'lodash';
import { appName, baseColor } from '../data/config';

function Head({children}){
    return (
        <Text style={{fontSize: 20, alignSelf: 'center', textAlign: 'center', marginTop: 24, marginBottom: 8, color: '#222', fontWeight: '600'}}>
            {children}
        </Text>
    )
}

function Para({children}) {
    return (
        <Text style={{marginVertical: 8, fontSize: 16, lineHeight: 20, color: '#444'}}>
            {children}
        </Text>
    )
}

function Bullet({title, children}) {
    return (
        <View style={{flexDirection: 'row', flexShrink: 1, marginVertical: 8}}>
            <Text style={{color: '#444', marginRight: 4}}>{'\u2022'}</Text>
            <Text style={{fontSize: 16, lineHeight: 20, color: '#444'}}>
                <Text style={{fontWeight: 'bold'}}>{title} - </Text>
                {children}
            </Text>
        </View>
    )
}

export function AboutScreen() {
    return (
        <ScreenContentScroll>
            <View style={{marginHorizontal: 32}}>
                <Text style={{fontSize: 40, fontWeight: '500', textAlign: 'center', alignSelf: 'center', marginTop: 16}}>
                    {appName}
                </Text>
                <Para>
                    {appName} helps you have small private group conversations with other members of your community.
                </Para>
                <Bullet title='Browse the Feed'>
                    Each community contains a feed of private conversations that you can ask to join.
                </Bullet>
                <Bullet title='Ask to Join'>
                    If you want to join a conversation, write a message to the conversation host and maybe they will let you in.
                </Bullet>
                <Bullet title='Create your Own'>
                    You can create your own private conversations and advertise them to other community members.
                </Bullet>
                <Bullet title='Talk Productively'>
                    Since conversations are private and moderated by someone you trust, you can talk honestly and productively
                    without the trolling and toxicity found on more open platforms.
                </Bullet>
                <Para>
                    Use conversations to get feedback on ideas, to make a decision, work with others to make something happen,
                    recruit people for long-running sub-communities, to get help with something, or just to chat 
                    about something that is on your mind.
                </Para>
            </View>
        </ScreenContentScroll>
    )
}
