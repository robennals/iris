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

export function AboutScreen() {
    return (
        <ScreenContentScroll>
            <View style={{marginHorizontal: 32}}>
                <Text style={{fontSize: 40, fontWeight: '500', textAlign: 'center', alignSelf: 'center', marginTop: 16}}>
                    {appName}
                </Text>
                <Para>
                    {appName} lets you take part in private small group conversations with other members of your organization.
                </Para>
                <Para>
                    The organization suggests topics that members might want to discuss. 
                    Members choose which questions they are 
                    interested in talking about. 
                    {appName} matches organization members into small groups to discuss that question.
                </Para>
                <Para>
                    You can also write a public viewpoint about a topic, and say which other people's viewpoints
                    you would like to discuss. 
                </Para>



                {/* <Para>
                    Let {appName} know what questions you want to talk about, and {appName} will assign you to discussion groups with people you might enjoy talking to.
                </Para> */}
            </View>
        </ScreenContentScroll>
    )
}
