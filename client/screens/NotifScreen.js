import { useNavigation } from '@react-navigation/core';
import React, { useEffect, useState } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { FixedTouchable, getNotifAction, MemberIcon, ScreenContentScroll, stripNewLines } from '../components/basics';
import { getCurrentUser, getDataAsync, internalReleaseWatchers, setDataAsync, watchData } from '../data/fbutil';
import * as Notifications from 'expo-notifications';
import _ from 'lodash';
import { baseColor, highlightColor } from '../data/config';
import { useCustomNavigation } from '../components/shim';


function Notif({notif, readTime}){
    const {fromName, group, text, rootKey, groupName, threadTitle, messageKey, type} = notif;
    const navigation = useCustomNavigation();
    const action = getNotifAction(type);
    const unread = notif.time > (readTime || 0);
    const screen = (type == 'join' && !messageKey) ? 'group' : 'thread'

    return (
        <FixedTouchable onPress={() => navigation.navigate(screen, {group, rootKey, messageKey})}>
            <View style={{flexDirection: 'row', alignItems: 'center', padding: 8, maxWidth: 500, backgroundColor: unread ? highlightColor : null}}>
                <MemberIcon name={fromName} size={40} style={{marginTop: 2}}/>
                <View style={{marginLeft: 12, flex: 1}}>
                    <Text numberOfLines={1}>
                        <Text style={{fontWeight: 'bold'}}>{fromName}
                        </Text> {action} <Text style={{fontWeight: 'bold'}}>{type == 'join' ? groupName : threadTitle}</Text>
                    </Text>
                    <Text numberOfLines={1} style={{color: '#666'}}>{stripNewLines(text || '')}</Text>
                </View>
            </View>
        </FixedTouchable>
    )
}

export function NotifScreen({route}) {
    console.log('route', route);
    // const {readTime} = route.params;
    const [readTime, setReadTime] = useState(null);
    const [notifs, setNotifs] = useState(null);
    const [showCount, setShowCount] = useState(20);

    useEffect(async () => {
        var x = {};
        watchData(x, ['userPrivate', getCurrentUser(), 'notif'], setNotifs, {});
        const lastReadTime = await getDataAsync(['userPrivate', getCurrentUser(), 'notifReadTime'], 0);
        setReadTime(lastReadTime);
        setDataAsync(['userPrivate', getCurrentUser(), 'notifReadTime'], Date.now());
        return () => internalReleaseWatchers(x);
    },[])

    console.log('notifReadTime', readTime);

    // console.log('notifs', notifs);

    if (!notifs || readTime == null) return null;

    const notifKeys = _.keys(notifs);
    const sortedNotifs = _.sortBy(notifKeys, k => notifs[k].time).reverse();
    const firstNotifs = sortedNotifs.slice(0, showCount);

    return (
        <ScreenContentScroll>
            <View style={{marginTop: 8}}></View>
            {firstNotifs.map(k => 
                <Notif key={k} notif={notifs[k]} readTime={readTime} />
            )}
            {showCount < sortedNotifs.length ? 
                <FixedTouchable onPress={() => setShowCount(showCount + 20)} style={{margin: 16}}>
                    <View style={{alignSelf: 'flex-start', borderWidth: StyleSheet.hairlineWidth, borderColor: baseColor, paddingVertical: 3, paddingHorizontal: 6}}>
                        <Text style={{color: baseColor}}>Show more</Text>
                    </View>
                </FixedTouchable>                             
            : null}
        </ScreenContentScroll>
    )
}