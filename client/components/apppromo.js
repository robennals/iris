import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Text, View, Button, Platform, StyleSheet, Image } from 'react-native';
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
            <View style={{borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth, marginBottom: 16}}>
                <Text style={{alignSelf: 'center', marginVertical: 16, fontWeight: 'bold'}}>Install the app</Text>

                <a target='_blank' rel='noreferrer' href='https://apps.apple.com/us/app/iris-talk/id1640562508' style={{alignSelf: 'center', textDecoration: 'none'}}>
                    <Image source={{uri: 'https://iris-talk.com/ios_app_promo.png'}} style={{width: 153, height: 45}} />
                </a>
                <View style={{height: 16}} />
                <a target='_blank' rel='noreferrer' href='https://play.google.com/store/apps/details?id=us.mix5' style={{alignSelf: 'center', textDecoration: 'none'}}>
                    <Image source={{uri: 'https://iris-talk.com/android_app_promo.png'}} style={{width: 153, height: 45}} />
                </a>
            </View>
        )
    }
}