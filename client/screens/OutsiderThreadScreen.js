import React, { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { FixedTouchable, getIsRootMessageVisibleToMe, GroupIcon, MemberIcon, OneLineText, ScreenContentScroll, WideButton } from '../components/basics';
import { getCurrentUser, getDataAsync, getUser, internalReleaseWatchers, setDataAsync, watchData } from '../data/fbutil';
import _ from 'lodash';
import { flattenMessages, getMessageReplies, IndentedMessage, Message } from '../components/message';
import { GroupContext, ThreadContext } from '../components/context';
import { dayMillis, formatLongTimeDate, formatTime } from '../components/time';
import { reloadIfVersionChanged } from '../data/versioncheck';
import { FontAwesome } from '@expo/vector-icons';
import { highlightColor } from '../data/config';
import { LinkText } from '../components/linktext';
import { joinGroupAsync } from '../data/servercall';


export function OutsiderThreadScreenHeader({navigation, route}) {
    const {group, subgroup, rootKey} = route.params;
    const [title, setTitle] = useState('');
    const [groupName, setGroupName] = useState(null);
    useEffect(() => {
        var x = {}
        watchData(x, ['group', group, 'submsg', subgroup, rootKey, 'title'], setTitle, 'Thread');
        watchData(x, ['group', group, 'subgroup', subgroup, 'name'], setGroupName, 'Group');

        return () => internalReleaseWatchers(x);
    }, [group, rootKey])

    if (!title || !groupName) return null;

    return (
        <View style={{paddingHorizontal: 8}}>
            <OneLineText style={{fontSize: 16}}>{title}</OneLineText>
            <Text style={{fontSize: 13, alignSelf: Platform.OS == 'web' ? 'flex-start' : 'center'}}>
                in <Text style={{fontWeight: 'bold'}}>{groupName}</Text>
            </Text>
        </View>            
    )
}

export function OutsiderThreadScreen({navigation, route}) {
    const {group, subgroup, rootKey} = route.params;

    const [message, setMessage] = useState(null);
    const [memberName, setMemberName] = useState(null);

    useEffect(() => {
        var x = {};
        watchData(x, ['group', group, 'submsg', subgroup, rootKey], setMessage);
        watchData(x, ['group', group, 'member', getCurrentUser(), 'name'], setMemberName);
        return x => internalReleaseWatchers(x);
    }, [group, subgroup, rootKey]);

    if (!message) {
        return null;
    }

    async function visitGroup(){
        await joinGroupAsync({group:subgroup, memberName});
        navigation.replace('thread', {group: subgroup, rootKey: rootKey, messageKey: rootKey});
    }

    return (
        <ScreenContentScroll>
            <View style={{
                    backgroundColor: highlightColor,
                    borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                    marginVertical: 16,
                    marginHorizontal: 16,
                    paddingVertical: 8, paddingHorizontal: 8}}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={{flex: 1, fontWeight: 'bold', fontSize: 16, marginTop: 2, marginBottom: 8}}>{message.title}</Text>
                    <Text style={{color: '#666', paddingLeft: 8, fontSize: 11, flexShrink: 0}}>
                        {formatTime(message.time)}
                    </Text>
                </View>
                <LinkText text={message.text} style={{color: '#222', fontSize: 16, lineHeight: 20}} />      
                {message.photoKey ? 
                    <MessagePhoto photoKey={message.photoKey} photoUser={message.from} />
                : null}
            </View>
            <WideButton style={{alignSelf: 'center'}} progressText='Processing...' onPress={visitGroup}>
                Visit Group
            </WideButton>
            <Text style={{alignSelf: 'center', textAlign: 'center', fontSize: 11, color: '#666'}}>
                Visit this group to see comments on this post.
            </Text>
        </ScreenContentScroll>
    )
}

