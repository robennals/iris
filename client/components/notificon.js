import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/core';
import { Text, useWindowDimensions, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { getCurrentUser, internalReleaseWatchers, setDataAsync, watchData } from '../data/fbutil';
import { FixedTouchable } from './basics';
import * as Notifications from 'expo-notifications';
import { minTwoPanelWidth } from '../data/config';
import { getCurrentDomain } from './shim';
import _ from 'lodash';


function clearNotifCount() {
    setDataAsync(['userPrivate', getCurrentUser(), 'notifCount'], 0);
    Notifications.setBadgeCountAsync(0);
}

export function NotifIcon({navigation, alwaysShow}){
    const {width} = useWindowDimensions();
    // const [count, setCount] = useState(0);
    const [notifReadTime, setNotifReadTime] = useState(0);
    const [userReadTime, setUserReadTime] = useState(0);
    const [notifs, setNotifs] = useState(null);
    const [threadReadTime, setThreadReadTime] = useState(null);
    useEffect(() => {
        var x = {};
        // watchData(x, ['userPrivate', getCurrentUser(), 'notifCount'], setCount, 0);
        watchData(x, ['userPrivate', getCurrentUser(), 'notifReadTime'], setNotifReadTime, 0);
        watchData(x, ['userPrivate', getCurrentUser(), 'readTime'], setUserReadTime, {})
        watchData(x, ['userPrivate', getCurrentUser(), 'notif'], setNotifs);
        watchData(x, ['userPrivate', getCurrentUser(), 'threadReadTime'], setThreadReadTime);
        return () => internalReleaseWatchers(x);
    }, [])

    if (!alwaysShow && width > minTwoPanelWidth) {
        return null;
    }

    const unreadNotifs = _.filter(_.keys(notifs), n => 
        notifs[n].time > notifReadTime && 
        notifs[n].time > _.get(userReadTime, [notifs[n].group, notifs[n].from], 0) &&
        notifs[n].time > _.get(threadReadTime, [notifs[n].group, notifs[n].rootKey],0));

    const count = unreadNotifs.length;
    Notifications.setBadgeCountAsync(0);

    function gotoNotifs() {
        clearNotifCount();
        navigation.navigate('notifs', {readTime: notifReadTime});
        setDataAsync(['userPrivate', getCurrentUser(), 'notifReadTime'], Date.now());
    }
    return (
        <FixedTouchable onPress={() => gotoNotifs()}>
            <Ionicons name='notifications' size={24} color={count > 0 ? '#666' : '#999'} style={{marginHorizontal: 10}} />
            {count > 0 ?
                <View style={{backgroundColor: 'red', paddingHorizontal: 4, borderRadius: 16, 
                        position: 'absolute', top: 0, right: 4}}>
                    <Text style={{color: 'white', fontSize: 13}}>{count}</Text> 
                </View>
            : null}

        </FixedTouchable>
    )
}


