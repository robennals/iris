import React, { useContext, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { NewMessageSound } from '../components/alertping';
import { FixedTouchable, HeaderSpaceView, OneLineText } from '../components/basics';
import { ChatEntryBox } from '../components/chatentry';
import { GroupContext } from '../components/context';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { LinkText } from '../components/linktext';
import { MessageEntryBox } from '../components/messageentrybox';
import { EnableNotifsBanner } from '../components/notifpermission';
import { GroupMultiIcon, GroupPhotoIcon, GroupSideBySideIcon, MemberPhotoIcon } from '../components/photo';
import { addFocusListener, BottomFlatScroller, ModalMenu, removeFocusListener, TitleBlinker, vibrate } from '../components/shim';
import { setTitle } from '../components/shim';
import { getCurrentUser, internalReleaseWatchers, setDataAsync, watchData } from '../data/fbutil';
import _ from 'lodash';
import { PhotoPromo } from '../components/profilephoto';
import { Entypo, FontAwesome } from '@expo/vector-icons';

export function ChatScreenHeader({navigation, route}) {
    const {group} = route.params;
    const [name, setName] = useState('');
    const [members, setMembers] = useState({});

    function markThisChatRead() {
        setDataAsync(['userPrivate', getCurrentUser(), 'group', group, 'readTime'], Date.now());
        setDataAsync(['userPrivate', getCurrentUser(), 'lastAction'], Date.now())
    }

    useEffect(() => {
        var x = {}
        watchData(x, ['group', group, 'name'], setName);
        watchData(x, ['group', group, 'member'], setMembers);

        addFocusListener(markThisChatRead);

        return () => {
            internalReleaseWatchers(x);
            removeFocusListener(markThisChatRead);
        }
    }, [group])

    return (
        <FixedTouchable onPress={() => navigation.navigate('groupProfile', {group})}>
            <View style={{flexDirection: 'row', alignItems: 'center', padding: 8}}>
                {/* <GroupMultiIcon members={members} size={32} /> */}
                <GroupSideBySideIcon members={members} size={32} />
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
    const [messages, setMessages] = useState(null);
    const [localMessages, setLocalMessages] = useState({});
    const [members, setMembers] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const scrollRef = React.createRef();

    useEffect(() => {
        var x = {}
        watchData(x, ['group', group, 'message'], setMessages);
        watchData(x, ['group', group, 'member'], setMembers);
        watchData(x, ['userPrivate', getCurrentUser(), 'localMessage', group], setLocalMessages);

        return () => internalReleaseWatchers(x);
    }, [group]);

    const allMessages = messages ? {...localMessages, ...messages} : {};

    return (
      <GroupContext.Provider value={{group}} >
      <KeyboardSafeView style={{flex: 1}}>
        <HeaderSpaceView style={{flex:1 }}>
          <EnableNotifsBanner />
          <PhotoPromo />
          <NewMessageTracker group={group} />
          <View style={{backgroundColor: 'white', flex: 1}}>
            {/* <PhotoPopup />             */}
            <MessageList group={group} messages={allMessages} members={members} onReply={setReplyTo} />
            <ChatEntryBox group={group} messages={allMessages} members={members} replyTo={replyTo} onClearReply={() => setReplyTo(null)} />
          </View>
        </HeaderSpaceView>
      </KeyboardSafeView>
      </GroupContext.Provider>
    )
}

function MoreButton({showCount, messageCount, onMore}) {
    if (showCount < messageCount) {
        return (
            <FixedTouchable onPress={onMore} >
                <View style={{alignSelf: 'center', borderColor: '#ddd', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 6}}>
                    <Text>Show More Messages</Text>
                </View>
            </FixedTouchable>
        )
    } else {
        return null;
    }
}

function MessageList({group, messages, members, onReply}) {
    const scrollRef = React.createRef();
    const [showCount, setShowCount] = useState(20);

    const messageKeys = Object.keys(messages || {});
    const sortedMessageKeys = _.sortBy(messageKeys, k => messages[k].time);
    // const shownMessageKeys = sortedMessageKeys.slice(-showCount);
    const shownMessageKeys = sortedMessageKeys;

    return (
        <View style={{flex: 1}}>
            <BottomFlatScroller style={{flex: 1,flexShrink: 1}} ref={scrollRef} data={[
                // {key: 'more', item: 
                    // <MoreButton showCount={showCount} messageCount={sortedMessageKeys.length} onMore={() => setShowCount(showCount+40)} />},
                ... shownMessageKeys.map(k => ({key: k, item: 
                    <Message key={k} messages={messages} members={members} messageKey={k} onReply={onReply}/>})),
                {key: 'pad', item: <View style={{height: 8}} />}
            ]} />
        </View>
    )
}


function Message({messages, members, messageKey, onReply}) {
    const message=messages[messageKey];
    const myMessage = message.from == getCurrentUser();
    const fromMember = members[message.from];
    const [hover, setHover] = useState(false);
    const [popup, setPopup] = useState(false);

    return (
        // <Swipeable renderLeftActions={() =>
        //     <View style={{justifyContent: 'space-around', padding: 8, alignItems: myMessage ? 'flex-end' : 'flex-start'}}>
        //     <Entypo name='reply' size={24} color='#999' />
        //     </View>
        // }
        //     onSwipeableWillOpen={() => onReply(messageKey)}
        // >
        <View style={[myMessage ? styles.myMessageRow : styles.theirMessageRow]} 
            onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>            
            {popup ? 
                <MessagePopup onClose={() => setPopup(false)} onReply={onReply} messageKey={messageKey} />
            : null}
            <FixedTouchable dummy={Platform.OS == 'web'} onPress={() => {vibrate(); setPopup(true)}} onLongPress={() => {vibrate(); setPopup(true)}} style={{flex: 1}}>
                <View style={myMessage ? styles.myMessage : styles.theirMessage} >
                    {myMessage ? null :
                        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                            <MemberPhotoIcon photoKey={fromMember.photo} user={message.from} name={fromMember.name} size={14} style={{marginRight: 2}}/>
                            <Text style={{fontWeight: 'bold', fontSize: 12}}>{fromMember.name}</Text>
                        </View>
                    }
                    {message.replyTo ?
                        <View style={{paddingLeft: 8, marginVertical: 4, borderLeftColor: myMessage ? 'white' : '#666', borderLeftWidth: StyleSheet.hairlineWidth}}>
                            <Text style={{fontSize: 12, color: myMessage ? 'white' : '#666', fontWeight: 'bold', marginBottom: 4}}>{members[messages[message.replyTo].from].name}</Text>
                            <Text style={{fontSize: 12, color: myMessage ? 'white' : '#666'}}>{messages[message.replyTo].text}</Text>
                        </View> 
                    : null}
                    <LinkText linkColor={myMessage ? 'white' : 'black'} colorLinks={!myMessage} style={myMessage ? styles.myMessageText : styles.theirMessageText} text={message.text}/>
                    {message.pending ?
                        <FontAwesome name='clock-o' size={14} style={{position: 'absolute', right:-4, bottom: -4, backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, padding: 2, borderRadius: 8}}/> 
                    : null}
                </View>
            </FixedTouchable>

            <View style={{width: 64, flexShrink: 0}}>
                {hover ? 
                <View style={{alignSelf: myMessage ? 'flex-end' : 'flex-start'}}>
                    <FixedTouchable onPress={() => onReply(messageKey)}>
                        <Entypo name='reply' size={24} color='#999' />
                    </FixedTouchable>
                </View>
                : null}
            </View>
        </View>
        // </Swipeable>
    )
}


function MessagePopup({messageKey, onReply, onClose}) {
    var actions = [];
    actions.push({id: 'reply', label: 'Reply'});

    return <ModalMenu items={actions} onClose={onClose} onSelect={async id => {
        switch (id) {
            case 'reply': 
                onClose();
                return onReply(messageKey)
            default:
                onClose();
        }
    }} />
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
        alignSelf: 'flex-end',
        alignItems: 'center',
    },
    theirMessageRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center'
    },
    myMessageText: {
        color: 'white',
        fontSize: Platform.OS == 'web' ? 15 : 16,
        lineHeight: Platform.OS == 'web' ? undefined : 20
    },
    theirMessageText: {
        color: '#222',
        fontSize: Platform.OS == 'web' ? 15 : 16,
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


