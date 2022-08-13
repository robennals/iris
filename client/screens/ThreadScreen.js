import React, { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { FixedTouchable, getIsRootMessageVisibleToMe, GroupIcon, MemberIcon, OneLineText, ScreenContentScroll, WideButton } from '../components/basics';
import { getCurrentUser, getDataAsync, getUser, internalReleaseWatchers, setDataAsync, watchData } from '../data/fbutil';
import _ from 'lodash';
import { flattenMessages, getMessageReplies, IndentedMessage, Message } from '../components/message';
import { GroupContext, ThreadContext } from '../components/context';
import { dayMillis, formatLongTimeDate } from '../components/time';
import { reloadIfVersionChanged } from '../data/versioncheck';
import { FontAwesome } from '@expo/vector-icons';

export function ThreadScreenHeader({navigation, route}) {
    const {group, rootKey} = route.params;
    const [title, setTitle] = useState('');
    const [groupName, setGroupName] = useState(null);
    useEffect(() => {
        var x = {}
        watchData(x, ['group', group, 'post', rootKey, rootKey, 'title'], setTitle, 'Thread');
        watchData(x, ['group', group, 'name'], setGroupName, 'Group');

        return () => internalReleaseWatchers(x);
    }, [group, rootKey])

    if (!title || !groupName) return null;

    function gotoGroup() {
        navigation.reset({
            index: 1, 
            routes: [
                {name: 'home'},
                {name: 'group', params: {group}}
            ]
        });
    }

    return (
        <View style={{paddingHorizontal: 8}}>
            <OneLineText style={{fontSize: 16}}>{title}</OneLineText>
            <FixedTouchable onPress={gotoGroup}>
                <Text style={{fontSize: 13, alignSelf: Platform.OS != 'ios' ? 'flex-start' : 'center'}}>
                    in <Text style={{fontWeight: 'bold'}}>{groupName}</Text>
                </Text>
            </FixedTouchable>
        </View>            
    )
}

function getLatestReplies({latestReplies = {}, messages, messageKey, replies}) {
    const message = _.get(messages, messageKey, {});
    var latest = message.time || 0;
    const messageReplies = replies[messageKey];
    _.forEach(messageReplies, replyKey => {
        getLatestReplies({latestReplies, messages, messageKey: replyKey, replies});
        const replyLatest = latestReplies[replyKey];
        if (replyLatest > latest) {
            latest = replyLatest;
        }
    })
    latestReplies[messageKey] = latest;
    return latestReplies;
}

function showModeTime({showMode, readTime}) {
    switch (showMode) {
        case 'unread': return readTime;
        case 'today': return Date.now() - dayMillis;
        case 'all': return 0;
    }
}

export function ThreadScreen({navigation, route}){
    const {group, messageKey, rootKey, member} = route.params;
    const [members, setMembers] = useState(null);
    const [messages, setMessages] = useState(null);
    const [readTime, setReadTime] = useState(null);
    const [contentOffset, setContentOffset] = useState(null);
    const [showMode, setShowMode] = useState('unread'); 
    const [blocks, setBlocks] = useState(null);

    const scrollRef = useRef(null);
    const [hasScrolled, setHasScrolled] = useState(false);

    const title = _.get(messages, [rootKey, 'title'], 'Thread');

    useEffect(() => {
        navigation.setOptions({title: title || ''});
        reloadIfVersionChanged();
    }, [title])

    async function getAndUpdateReadTimeAsync() {
        const lastReadTime = await getDataAsync(['userPrivate', getCurrentUser(), 'threadReadTime', group, rootKey]);
        setReadTime(lastReadTime || 0);
        setDataAsync(['userPrivate', getCurrentUser(), 'threadReadTime', group, rootKey], Date.now());
        setDataAsync(['userPrivate', getCurrentUser(), 'lastAction'], Date.now())
        // console.log('setReadTime', getCurrentUser(), group, rootKey, lastReadTime, Date.now());
    }
 
    useEffect(() => {
        var x = {}
        watchData(x, ['group', group, 'member'], setMembers);
        watchData(x, ['group', group, 'post', rootKey], setMessages);
        watchData(x, ['group', group, 'block'], setBlocks);
        getAndUpdateReadTimeAsync();
        return () => internalReleaseWatchers(x);
    }, [group])

    useEffect(() => {
        setHasScrolled(false);
    }, [messageKey])
    
    if (!members || !messages || readTime == null || !blocks) return null;

    const meName = members[getCurrentUser()].name;
    const meAdmin = members[getCurrentUser()].role == 'admin';

    const replies = getMessageReplies(messages);
    const latestReplies = getLatestReplies({messages, messageKey: rootKey, replies});

    // const showTime = showModeTime({showMode, readTime});
    const showTime = readTime;
    // console.log('showTime', showMode, showTime);

    const flatMessages = flattenMessages({messages, replies, messageKey: rootKey});

    function onLayout(ev) {
        const y = ev.nativeEvent.layout.y;
        if (scrollRef && scrollRef.current && !hasScrolled) {
            scrollRef.current.scrollTo({y, animated: true});
            setHasScrolled(true);
        }
        // setContentOffset(y);
    }

    const rootMessage = messages[rootKey];
    const visible = getIsRootMessageVisibleToMe({members, messages, rootKey});
    if (!visible) {
        return (
            <Text style={{margin: 16}}>Access Denied</Text>
        )
    }

    return (
        <ThreadContext.Provider value={{group, blocks, title, meAdmin, showTime, rootKey, readTime, highlightKey: messageKey, highlightMember: member, messages, members, replies, latestReplies}}>  
            <GroupContext.Provider value={{group, meName}}>
                <ScreenContentScroll contentOffset={contentOffset} scrollRef={scrollRef}>  
                    <View style={{marginTop: 8}} />        
                    <View style={{marginHorizontal: 8}}>
                        {rootMessage.membersOnly ?
                            <View style={{alignSelf: 'flex-start', marginHorizontal: 8, backgroundColor: 'black', borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', paddingHorizontal: 8, paddingVertical: 4, marginBottom: 16}}>
                                <Text>
                                    <FontAwesome name='lock' color='white'/> 
                                    <Text style={{fontWeight: 'bold', color: 'white', marginBottom: 2}}> Members Only</Text>
                                </Text> 
                                <Text style={{color: '#eee'}}>Visible if you were a member {formatLongTimeDate(rootMessage.firstTime || rootMessage.time)}
                                </Text>    
                            </View>
                        : null}

                        {flatMessages.map(flat => 
                            <View key={flat.messageKey}
                                // onLayout={onLayout}
                                onLayout={flat.messageKey== messageKey ? onLayout : null} key={flat.messageKey}
                                >
                            <IndentedMessage 
                                key={flat.messageKey} messages={messages}
                                flat={flat} />
                            </View>
                        )}
                    </View>
                    {/* <Message messageKey={rootKey} /> */}
                </ScreenContentScroll>
            </GroupContext.Provider>
        </ThreadContext.Provider>
    )
}

