import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FixedTouchable, FormInput, FormTitle, MemberIcon, ScreenContentScroll, WideButton } from '../components/basics';
import { getCurrentUser, watchData } from '../data/fbutil';
import _ from 'lodash';
import { appName, baseColor } from '../data/config';
import { useCustomNavigation } from '../components/shim';

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
    const navigation = useCustomNavigation();
    return (
        <ScreenContentScroll>
            <View style={{marginHorizontal: 32}}>
                <Text style={{fontSize: 40, fontWeight: '500', textAlign: 'center', alignSelf: 'center', marginTop: 16}}>
                    {appName}
                </Text>
                <Para>
                    {appName} lets you take part in small group conversations with other members of your organization.
                </Para>
                <Para>
                    The organization suggests questions that members might want to discuss. Members choose which questions they are 
                    interested in talking about. {appName} matches organization members into small groups to discuss that question.
                </Para>

                <Para>
                    To use {appName} you need to have been invited to a small-group conversations by the organization you are part of.
                </Para>

                {/* <Para>
                    Let {appName} know what questions you want to talk about, and {appName} will assign you to discussion groups with people you might enjoy talking to.
                </Para> */}
            </View>
        </ScreenContentScroll>
    )
}
