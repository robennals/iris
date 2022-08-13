import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/core';
import { Text, useWindowDimensions, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { getCurrentUser, internalReleaseWatchers, setDataAsync, watchData } from '../data/fbutil';
import { FixedTouchable, getNotifAction, stripNewLines } from './basics';
import * as Notifications from 'expo-notifications';
import { highlightColor, minTwoPanelWidth } from '../data/config';
import { getCurrentDomain } from './shim';
import { NotifIcon } from './notificon';
import { SafeAreaView } from 'react-native-safe-area-context';

function clearNotifCount() {
    setDataAsync(['userPrivate', getCurrentUser(), 'notifCount'], 0);
    Notifications.setBadgeCountAsync(0);
}

export function NotifLine({navigation}) {
    const [count, setCount] = useState(0);
    const [readTime, setReadTime] = useState(0);
    const [lastNotif, setLastNotif] = useState(null);
    useEffect(() => {
        var x = {};
        watchData(x, ['userPrivate', getCurrentUser(), 'notifCount'], setCount, 0);
        watchData(x, ['userPrivate', getCurrentUser(), 'notifReadTime'], setReadTime, 0);
        watchData(x, ['userPrivate', getCurrentUser(), 'lastNotif'], setLastNotif);

        return () => internalReleaseWatchers(x);
    }, [])

    if (!lastNotif || count == 0) {
        return null;
    }

    function gotoNotifs() {
        clearNotifCount();
        navigation.navigate('notifs', {readTime});
        setDataAsync(['userPrivate', getCurrentUser(), 'notifReadTime'], Date.now());
    }

    return (
        <View style={{backgroundColor: highlightColor}}>
        <SafeAreaView>
            <FixedTouchable onPress={() => gotoNotifs()}>
                <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: highlightColor, padding: 8}}>
                    <NotifIcon navigation={navigation} alwaysShow />
                    <View style={{marginLeft: 4}}>
                        <Text numberOfLines={1}>
                            <Text style={{fontWeight: 'bold'}} numberOfLines={1}>{lastNotif.fromName} </Text>
                            {getNotifAction(lastNotif.type)}
                            <Text style={{fontWeight: 'bold'}} numberOfLines={1}> {lastNotif.threadTitle || lastNotif.groupName}</Text>
                        </Text>
                        <Text numberOfLines={1} style={{color: '#666'}}>{stripNewLines(lastNotif.text)}</Text>
                    </View>
                </View>
            </FixedTouchable>
        </SafeAreaView>
        </View>
    )

}