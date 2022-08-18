import React, { useContext, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { NewMessageSound } from '../components/alertping';
import { FixedTouchable, HeaderSpaceView, OneLineText } from '../components/basics';
import { ChatEntryBox } from '../components/chatentry';
import { GroupContext } from '../components/context';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { LinkText } from '../components/linktext';
import { MessageEntryBox } from '../components/messageentrybox';
import { EnableNotifsBanner } from '../components/notifpermission';
import { GroupPhotoIcon } from '../components/photo';
import { BottomFlatScroller, TitleBlinker } from '../components/shim';
import { setTitle } from '../components/shim';
import { getCurrentUser, internalReleaseWatchers, watchData } from '../data/fbutil';
import _ from 'lodash';

export function ChatScreenHeader({navigation, route}) {
    const {group} = route.params;
    const [name, setName] = useState('');

    useEffect(() => {
        var x = {}
        watchData(x, ['group', group, 'name'], setName);

        return () => internalReleaseWatchers(x);
    }, [group])

    return (
        <FixedTouchable onPress={() => navigation.navigate('groupProfile', {group})}>
            <View style={{flexDirection: 'row', alignItems: 'center', padding: 8}}>
                <OneLineText style={{fontSize: 16, marginLeft: 8}}>
                    {name}
                </OneLineText>
            </View>
        </FixedTouchable>
    )
}


function NewMessageTracker({group}) {
    const [groups, setGroups] = useState({});
    useEffect(() => {
        var x = {};
        watchData(x, ['userPrivate', getCurrentUser(), 'group'], setGroups);
        return () => internalReleaseWatchers(x);
    }, [group]);
    const groupKeys = Object.keys(groups || {});
    const unreadGroups = _.filter(groupKeys, 
        k => (groups[k].readTime < _.get(groups,[k, 'lastMessage', 'time']))
            && _.get(groups, [k, 'lastMessage', 'from']) != getCurrentUser()
    );
    const unreadCount = unreadGroups.length;

    const title = _.get(groups, [group, 'name']);
    setTitle(title);
    // console.log('NewMessageTracker', title, groups, group);

    return <TitleBlinker count={unreadCount} title={title} />
}

// export function ChatScreen() {
//     return (
//         <View style={{flex: 1, backgroundColor: 'white'}}>
//             <Text>Chat</Text>
//         </View>
//     )
// }
export function ChatScreen({navigation, route}) {
    const {group} = route.params;
    return (
      <GroupContext.Provider value={{group}} >
      <KeyboardSafeView style={{flex: 1}}>
        <HeaderSpaceView style={{flex:1 }}>
          <EnableNotifsBanner />
          <NewMessageSound />
          <NewMessageTracker group={group} />
          <View style={{backgroundColor: 'white', flex: 1}}>
            {/* <NotifBanner meeting={meeting} navigation={navigation} /> */}
            {/* <PhotoPopup />             */}
            <MessageList group={group} />
            <ChatEntryBox group={group} />
          </View>
        </HeaderSpaceView>
      </KeyboardSafeView>
      </GroupContext.Provider>
    )
}

function MessageList({group}) {
    const [messages, setMessages] = useState(null);
    const scrollRef = React.createRef();

    useEffect(() => {
        var x = {}
        watchData(x, ['group', group, 'message'], setMessages);

        return () => internalReleaseWatchers(x);
    }, [group]);

    const messageKeys = Object.keys(messages || {});
    const sortedMessageKeys = _.sortBy(messageKeys, k => messages[k].time);

    // console.log('sortedMessageKeys', sortedMessageKeys);
    // console.log('messages', messages);

    return (
        <View style={{flex: 1}}>
            <BottomFlatScroller style={{flex: 1,flexShrink: 1}} ref={scrollRef} data={[
                ... sortedMessageKeys.map(k => ({key: k, item: <Message key={k} messages={messages} messageKey={k} />})),
                {key: 'pad', item: <View style={{height: 8}} />}
            ]} />
        </View>
    )
}

function Message({messages, messageKey}) {
    const message=messages[messageKey];
    const myMessage = message.from == getCurrentUser();

    return (
        <View style={myMessage ? styles.myMessageRow : styles.theirMessageRow}>
            <View style={myMessage ? styles.myMessage : styles.theirMessage}>
                <LinkText linkColor={myMessage ? 'white' : 'black'} colorLinks={!myMessage} style={myMessage ? styles.myMessageText : styles.theirMessageText} text={message.text}/>
            </View>
            <View style={{width: 64, height: 40, flexShrink: 0, color: 'red'}} />
        </View>
    )
}

const styles = StyleSheet.create({
    myMessage: {
        backgroundColor: '#0084FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        marginVertical: 4,
        marginHorizontal: 8,
        flexShrink: 1
    },
    theirMessage: {
        backgroundColor: '#F3F3F4',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        marginVertical: 4,
        marginHorizontal: 8,
        flexShrink: 1
    },
    myMessageRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'flex-end',
        alignSelf: 'flex-end'
    },
    theirMessageRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start'
    },
    myMessageText: {
        color: 'white',
        fontSize: Platform.OS == 'web' ? 14 : 16,
        lineHeight: Platform.OS == 'web' ? undefined : 20
    },
    theirMessageText: {
        color: '#222',
        fontSize: Platform.OS == 'web' ? 14 : 16,
        lineHeight: Platform.OS == 'web' ? undefined : 20
    },
    myMessageLink: {
        color: 'white',
        textDecorationLine: 'underline'
    },
    theirMessageLink: {
        textDecorationLine: 'underline'
    }
})


