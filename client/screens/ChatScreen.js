import React, { useContext, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { NewMessageSound } from '../components/alertping';
import { FixedTouchable, HeaderSpaceView, OneLineText, WideButton } from '../components/basics';
import { ChatEntryBox } from '../components/chatentry';
import { GroupContext } from '../components/context';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { LinkText } from '../components/linktext';
import { MessageEntryBox } from '../components/messageentrybox';
import { EnableNotifsBanner } from '../components/notifpermission';
import { CommunityPhotoIcon, GroupMultiIcon, GroupPhotoIcon, GroupSideBySideIcon, MemberPhotoIcon } from '../components/photo';
import { addFocusListener, BottomFlatScroller, ModalMenu, removeFocusListener, TitleBlinker, vibrate } from '../components/shim';
import { setTitle } from '../components/shim';
import { getCurrentUser, internalReleaseWatchers, isMasterUser, setDataAsync, watchData } from '../data/fbutil';
import _ from 'lodash';
import { PhotoPromo } from '../components/profilephoto';
import { Entypo, FontAwesome } from '@expo/vector-icons';
import { formatMessageTime, formatTime, minuteMillis } from '../components/time';
import { adminJoinGroupAsync } from '../data/servercall';

export function ChatScreenHeader({navigation, route}) {
    const {group} = route.params;
    const [name, setName] = useState('');
    const [members, setMembers] = useState({});
    const [community, setCommunity] = useState(null);
    const [communityInfo, setCommunityInfo] = useState(null);

    function markThisChatRead() {
        setDataAsync(['userPrivate', getCurrentUser(), 'group', group, 'readTime'], Date.now());
        setDataAsync(['userPrivate', getCurrentUser(), 'lastAction'], Date.now())
    }

    useEffect(() => {
        var x = {}
        watchData(x, ['group', group, 'name'], setName);
        watchData(x, ['group', group, 'member'], setMembers);
        watchData(x, ['group', group, 'community'], setCommunity, null);

        addFocusListener(markThisChatRead);

        return () => {
            internalReleaseWatchers(x);
            removeFocusListener(markThisChatRead);
        }
    }, [group])

    useEffect(() => {
        var x = {};
        if (community) {
            watchData(x, ['community', community], setCommunityInfo);
        }
        return () => internalReleaseWatchers(x);
    }, [community])

    return (
        <FixedTouchable onPress={() => navigation.navigate('groupProfile', {group})}>
            <View style={{flexDirection: 'row', alignItems: 'center', padding: 8}}>
                {/* <GroupMultiIcon members={members} size={32} /> */}
                <GroupSideBySideIcon members={members} size={36} />
                <View style={{marginLeft: 8}}>
                    {/* {communityInfo ? 
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} size={11} />
                            <Text style={{fontSize: 11, marginLeft: 3, marginBottom: 0, color: '#666'}}>{communityInfo.name}</Text>
                        </View>
                    : null} */}
                    {communityInfo ? 
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            {/* <Text style={{fontSize: 11, marginRight: 4, marginBottom: 0, color: '#666'}}>in</Text> */}
                            <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} size={11} />
                            <Text style={{fontSize: 11, marginLeft: 2, marginBottom: 0, color: '#666'}}>{communityInfo.name}</Text>                        
                        </View>
                    : null}

                    <OneLineText style={{fontSize: 20, fontWeight: 'bold'}}>
                        {name}
                    </OneLineText>
                    {/* {communityInfo ? 
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Text style={{fontSize: 11, marginRight: 4, marginBottom: 0, color: '#666'}}>in</Text>
                            <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} size={11} />
                            <Text style={{fontSize: 11, marginLeft: 2, marginBottom: 0, color: '#666'}}>{communityInfo.name}</Text>                        
                        </View>
                    : null} */}

                </View>
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

function howManyMessagesByMe({messages, sortedMessageKeys}) {
    var byMeCount = 0;
    for (var i = sortedMessageKeys.length -1; i >= 0; i--) {
        if (messages[sortedMessageKeys[i]].from == getCurrentUser()) {
            byMeCount ++;
        } else {
            return byMeCount;
        }
    }
    return byMeCount;
}

function ArchivedBanner(){
    return (
        <View style={{padding: 16, backgroundColor: 'white', borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth}}>
            <Text style={{fontWeight: 'bold'}}>This Conversation has been Archived</Text>
            <Text style={{color: '#666'}}>You cannot post new messages, but can continue to read messages for a limited time.</Text>
        </View>
    )
}

const standardHues = [0, 90, 180, 270, , ]

function memberKeysToHues(memberKeys) {
    const filteredKeys = memberKeys.filter(k => k != 'zzz_irisBot' && k != getCurrentUser());
    var hueMap = {};
    for (var i = 0; i < filteredKeys.length; i++) {
        hueMap[filteredKeys[i]] = (360/filteredKeys.length) * i;
    }
    return hueMap;
}

export function ChatScreen({navigation, route}) {
    const {group} = route.params;
    const [messages, setMessages] = useState(null);
    const [localMessages, setLocalMessages] = useState({});
    const [members, setMembers] = useState(null);
    const [archived, setArchived] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const scrollRef = React.createRef();
    const chatInputRef = React.createRef();

    useEffect(() => {
        var x = {}
        watchData(x, ['group', group, 'message'], setMessages);
        watchData(x, ['group', group, 'member'], setMembers);
        watchData(x, ['group', group, 'archived'], setArchived, false);
        watchData(x, ['userPrivate', getCurrentUser(), 'localMessage', group], setLocalMessages);

        return () => internalReleaseWatchers(x);
    }, [group]);

    function onReply(messageKey) {
        setReplyTo(messageKey);
        chatInputRef?.current?.focus();
    }

    const memberHues = memberKeysToHues(_.keys(members || {}));

    const iAmNotInGroup = members && !members[getCurrentUser()];

    const allMessages = messages ? {...localMessages, ...messages} : {};
    const messageKeys = Object.keys(allMessages || {});
    const sortedMessageKeys = _.sortBy(messageKeys, k => allMessages[k].time);
    const byMeCount = howManyMessagesByMe({messages: allMessages, sortedMessageKeys});
    // console.log('byMeCount', byMeCount);
    
    return (
      <GroupContext.Provider value={{group}} >
      <KeyboardSafeView style={{flex: 1}}>
        <HeaderSpaceView style={{flex:1 }}>
          <EnableNotifsBanner />
          <PhotoPromo />
          {archived ? 
            <ArchivedBanner />
          :null}
          <NewMessageTracker group={group} />
          <View style={{backgroundColor: 'white', flex: 1}}>
            {/* <PhotoPopup />             */}
            <MessageList group={group} memberHues={memberHues} messages={allMessages} sortedMessageKeys={sortedMessageKeys} members={members} onReply={onReply} />            
            {iAmNotInGroup ?
                <WideButton progressText='Joining...' onPress={() => adminJoinGroupAsync({group})}>
                    Join Group Chat
                </WideButton>
            :
                (archived && !isMasterUser(getCurrentUser()) ? 
                null
                :
                    <ChatEntryBox group={group} messages={allMessages} byMeCount={byMeCount} members={members} replyTo={replyTo} onClearReply={() => setReplyTo(null)} chatInputRef={chatInputRef} />
                )
            }
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

function MessageList({group, messages, sortedMessageKeys, members, memberHues, onReply}) {
    const scrollRef = React.createRef();
    const [showCount, setShowCount] = useState(20);

    // const messageKeys = Object.keys(messages || {});
    // const sortedMessageKeys = _.sortBy(messageKeys, k => messages[k].time);
    // // const shownMessageKeys = sortedMessageKeys.slice(-showCount);
    const shownMessageKeys = sortedMessageKeys;

    return (
        <View style={{flex: 1}}>
            <BottomFlatScroller style={{flex: 1,flexShrink: 1}} ref={scrollRef} data={[
                // {key: 'more', item: 
                    // <MoreButton showCount={showCount} messageCount={sortedMessageKeys.length} onMore={() => setShowCount(showCount+40)} />},
                {key: 'space', item: 
                    <View style={{height: 16}} />
                },
                ... shownMessageKeys.map((k,idx) => ({key: k, item: 
                    <Message key={k} messages={messages} members={members} 
                        messageKey={k} prevMessageKey={shownMessageKeys[idx-1]} nextMessageKey={shownMessageKeys[idx+1]}
                        memberHues={memberHues}
                        onReply={onReply}/>})),
                {key: 'pad', item: <View style={{height: 8}} />}
            ]} />
        </View>
    )
}


function Message({messages, members, messageKey, prevMessageKey, nextMessageKey, memberHues, onReply}) {
    const message = messages[messageKey];
    const prevMessage = messages[prevMessageKey] ?? {};
    const nextMessage = messages[nextMessageKey] ?? {};
    const myMessage = message.from == getCurrentUser();
    const fromMember = members[message.from];
    const [hover, setHover] = useState(false);
    const [popup, setPopup] = useState(false);
    const hue = memberHues[message.from];
    const hueStyle = (myMessage || message.from == 'zzz_irisbot') ? null : {backgroundColor: 'hsl(' + hue + ',40%, 90%)'};

    const samePrevAuthor = !myMessage && message.from == prevMessage.from;
    const sameNextAuthor = !myMessage && message.from == nextMessage.from;
    const prevAlsoMe = myMessage && prevMessage.from == getCurrentUser();
    const nextAlsoMe = myMessage && nextMessage.from == getCurrentUser();

    const timePassed = (message.time - (prevMessage.time || 0)) > (5 * minuteMillis);

    return (
        // <Swipeable renderLeftActions={() =>
        //     <View style={{justifyContent: 'space-around', padding: 8, alignItems: myMessage ? 'flex-end' : 'flex-start'}}>
        //     <Entypo name='reply' size={24} color='#999' />
        //     </View>
        // }
        //     onSwipeableWillOpen={() => onReply(messageKey)}
        // >
        <View>
            {timePassed ? 
                <Text style={{textAlign: 'center', fontSize: 13, color: '#999', marginTop: 16, marginBottom: 4}}>
                    {formatMessageTime(message.time)}
                </Text>
            : null}


        <View style={[myMessage ? styles.myMessageRow : styles.theirMessageRow]} 
            onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>            
            {popup ? 
                <MessagePopup onClose={() => setPopup(false)} onReply={onReply} messageKey={messageKey} />
            : null}
            {myMessage ? null :
                (samePrevAuthor ? 
                    <View style={{width: 40, marginLeft: 8}} />
                :
                    <View style={{marginLeft: 4, alignSelf: 'flex-start', marginTop: 8}}>
                        <MemberPhotoIcon photoKey={fromMember.photo} user={message.from} name={fromMember.name} size={40} style={{marginRight: 4}}/>            
                    </View>
                )
            }
            <View style={{flexShrink: 1}}>
            {/* <View style={{flex: 1, flexGrow: 0, maxWidth: 550}}> */}
                <FixedTouchable dummy={Platform.OS == 'web'} onPress={() => {vibrate(); setPopup(true)}} onLongPress={() => {vibrate(); setPopup(true)}} style={{flex: 1, maxWidth: 550}}>
                    <View style={[myMessage ? styles.myMessage : styles.theirMessage, 
                            samePrevAuthor ? {marginTop: 1, borderTopLeftRadius: 4} : {}, 
                            sameNextAuthor ? {marginBottom: 1, borderBottomLeftRadius: 4} : {},
                            prevAlsoMe ? {marginTop: 1, borderTopRightRadius: 4} : {},
                            nextAlsoMe ? {marginBottom: 1, borderBottomRightRadius: 4} : {},
                            hueStyle
                         ]} >
                        {myMessage || samePrevAuthor ? null :
                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                                {/* <MemberPhotoIcon photoKey={fromMember.photo} user={message.from} name={fromMember.name} size={14} style={{marginRight: 2}}/> */}
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
                            <View style={{width: 16, height: 16, backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, alignItems: 'center', justifyContent: 'center', 
                                    position: 'absolute', right: -4, bottom: -4}}>
                                <FontAwesome name='clock-o' size={14} /> 
                            </View>
                        : null}
                    </View>
                </FixedTouchable>
            </View>

            <View style={{width: 48, flexShrink: 0}}>
                {hover ? 
                <View style={{alignSelf: myMessage ? 'flex-end' : 'flex-start'}}>
                    <FixedTouchable onPress={() => onReply(messageKey)}>
                        <Entypo name='reply' size={24} color='#999' />
                    </FixedTouchable>
                </View>
                : null}
            </View>
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
        maxWidth: 550,
        flexShrink: 1,
        flexGrow: 0,
        flexBasis: 'auto'
    },
    theirMessage: {
        backgroundColor: '#eee',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        marginVertical: 4,
        // marginHorizontal: 8,
        maxWidth: 550,
        flexShrink: 1,
        flexGrow: 0,
        flexBasis: 'auto'
        // flexGrow: 0
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
        lineHeight: Platform.OS == 'web' ? 20 : 21
    },
    theirMessageText: {
        color: '#111',
        fontSize: Platform.OS == 'web' ? 15 : 16,
        lineHeight: Platform.OS == 'web' ? 20 : 21
    },
    myMessageLink: {
        color: 'white',
        textDecorationLine: 'underline'
    },
    theirMessageLink: {
        textDecorationLine: 'underline'
    }
})


