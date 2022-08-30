import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Text, View, Button, Platform, StyleSheet } from 'react-native';
import { getCurrentUser, internalReleaseWatchers, watchData } from '../data/fbutil';
import { FixedTouchable } from './basics';
import _ from 'lodash';

export function AppPromo(){
    const [notifToken, setNotifToken] = useState(null);

    useEffect(() => {
        var x = {};
        watchData(x, ['userPrivate', getCurrentUser(), 'notifToken'], setNotifToken, 'no-token');
        return () => internalReleaseWatchers(x)
    },[]);

    if (!notifToken || notifToken != 'no-token' || Platform.OS != 'web') {
        return null;
    } else {
        return (
            <a target='_blank' href='https://apps.apple.com/us/app/iris-talk/id1640562508' style={{alignSelf: 'center', textDecoration: 'none'}}>
                <View style={{backgroundColor: 'black', alignSelf: 'center', flexDirection: 'row', 
                alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, marginTop: 8, 
                    marginHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', borderRadius: 8}}>
                    <FontAwesome name='apple' style={{marginRight: 8}} size={24}  color='white' />
                    <Text style={{fontSize: 18, color: 'white', textDecorationLine: 'none'}}>Get the iOS App</Text>
                </View>
            </a>
        )
    }
}