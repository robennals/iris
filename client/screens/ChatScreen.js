import React, { useContext, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { FixedTouchable, HeaderSpaceView, memberKeysToHues, OneLineText, WideButton } from '../components/basics';
import { ChatEntryBox } from '../components/chatentry';
import { GroupContext } from '../components/context';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { LinkText } from '../components/linktext';
import { MessageEntryBox } from '../components/messageentrybox';
import { EnableNotifsBanner } from '../components/notifpermission';
import { CommunityPhotoIcon, GroupMultiIcon, GroupPhotoIcon, GroupSideBySideIcon, MemberPhotoIcon } from '../components/photo';
import { setTitle, addFocusListener, removeFocusListener, TitleBlinker, vibrate } from '../components/shim';
import { getCurrentUser, internalReleaseWatchers, isMasterUser, setDataAsync, useDatabase, watchData } from '../data/fbutil';
import _ from 'lodash';
import { PhotoPromo } from '../components/profilephoto';
import { Entypo, FontAwesome } from '@expo/vector-icons';
import { formatMessageTime, formatTime, minuteMillis } from '../components/time';
import { adminJoinGroupAsync } from '../data/servercall';
import { BottomFlatScroller, ModalMenu } from '../components/shimui';
import { Catcher } from '../components/catcher';
import { ConnectedBanner } from '../components/connectedbanner';
import { Feedback } from '../components/feedback';
import { Loading } from '../components/loading';
import { StatusBar } from 'expo-status-bar';

export function ChatScreenHeader({navigation, route}) {
    const {group} = route.params;

    const name = useDatabase([group], ['group', group, 'name'], '');
    const members = useDatabase([group], ['group', group, 'member']);
    const community = useDatabase([group], ['group', group, 'community'], null);
    const communityInfo = useDatabase([community], ['community', community]);

    useEffect(() => {
        function markThisChatRead() {
            setDataAsync(['userPrivate', getCurrentUser(), 'group', group, 'readTime'], Date.now());
            setDataAsync(['userPrivate', getCurrentUser(), 'lastAction'], Date.now())
        }
    
        addFocusListener(markThisChatRead);
        return () => {
            removeFocusListener(markThisChatRead);
        }
    }, [group])

    return (
        <FixedTouchable onPress={() => navigation.navigate('groupProfile', {group})}>
            <View style={{flexDirection: 'row', alignItems: 'center', padding: 8}}>
                <GroupSideBySideIcon members={members || {}} size={36} />
                <View style={{marginLeft: 8}}>
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
            <Text style={{fontWeight: 'bold'}}>This Conversation has Completed</Text>
            <Text style={{color: '#666'}}>You cannot post new messages, but can continue to read messages for a limited time.</Text>
        </View>
    )
}

// const standardHues = [0, 90, 180, 270, , ]


export function ChatScreen({navigation, route}) {
    const {group} = route.params;

    const messages = useDatabase([group], ['group', group, 'message']);
    const localMessages = useDatabase([group], ['userPrivate', getCurrentUser(), 'localMessage', group]);
    const members = useDatabase([group], ['group', group, 'member']);
    const archived = useDatabase([group], ['group', group, 'archived'], false);
    const groupName = useDatabase([group], ['group', group, 'name']);
    const community = useDatabase([group], ['group', group, 'community'], null);

    const [replyTo, setReplyTo] = useState(null);
    const chatInputRef = React.createRef();

    if (!messages || !members) {
        return <Loading />
    }


    function onReply(messageKey) {
        setReplyTo(messageKey);
        chatInputRef?.current?.focus();
    }

    const memberHues = memberKeysToHues(_.keys(members || {}));

    const iAmNotInGroup = members && !members[getCurrentUser()];

    const allMessages = messages ? {...(localMessages || {}), ...messages} : {};
    const messageKeys = Object.keys(allMessages || {});
    const sortedMessageKeys = _.sortBy(messageKeys, k => allMessages[k].time);
    const byMeCount = howManyMessagesByMe({messages: allMessages, sortedMessageKeys});

    
    return (
      <GroupContext.Provider value={{group}} >
      <KeyboardSafeView style={{flex: 1}}>
          <StatusBar style='dark' />
        <HeaderSpaceView style={{flex:1 }}>
          <Catcher>
            <ConnectedBanner />
            <EnableNotifsBanner />
            <PhotoPromo />
            {archived ? 
                <ArchivedBanner />
            :null}
            <NewMessageTracker group={group} />
          </Catcher>
          <View style={{backgroundColor: 'white', flex: 1}}>
            {/* <PhotoPopup />             */}
            <MessageList group={group} archived={archived} memberHues={memberHues} messages={allMessages} sortedMessageKeys={sortedMessageKeys} members={members} onReply={onReply} />            
            {iAmNotInGroup ?
                <WideButton progressText='Joining...' onPress={() => adminJoinGroupAsync({group})}>
                    Join Group Chat
                </WideButton>
            :
                (archived && !isMasterUser(getCurrentUser()) ? 
                null
                :
                    <ChatEntryBox group={group} messages={allMessages} byMeCount={byMeCount} 
                        members={members} replyTo={replyTo} groupName={groupName}
                        community={community}
                        onClearReply={() => setReplyTo(null)} chatInputRef={chatInputRef} />
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

function MessageList({group, archived, messages, sortedMessageKeys, members, memberHues, onReply}) {
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
                    <Message key={k} messages={messages} members={members} group={group}
                        messageKey={k} prevMessageKey={shownMessageKeys[idx-1]} nextMessageKey={shownMessageKeys[idx+1]}
                        memberHues={memberHues}
                        onReply={onReply}/>})),
                {key: 'archived', item: <Feedback archived={archived} group={group} />},
                {key: 'pad', item: <View style={{height: 8}} />}
            ]} />
        </View>
    )
}


function Message({group, messages, members, messageKey, prevMessageKey, nextMessageKey, memberHues, onReply}) {
    const message = messages[messageKey];
    const prevMessage = messages[prevMessageKey] ?? {};
    const nextMessage = messages[nextMessageKey] ?? {};
    const myMessage = message.from == getCurrentUser();
    const fromMember = members[message.from] || {name: 'User left the group'};
    const [hover, setHover] = useState(false);
    const [popup, setPopup] = useState(false);
    const hue = memberHues[message.from] || 45;
    const hueStyle = (myMessage || message.from == 'zzz_irisbot') ? null : {backgroundColor: 'hsl(' + hue + ',40%, 90%)'};

    const samePrevAuthor = !myMessage && message.from == prevMessage.from;
    const sameNextAuthor = !myMessage && message.from == nextMessage.from;
    const prevAlsoMe = myMessage && prevMessage.from == getCurrentUser();
    const nextAlsoMe = myMessage && nextMessage.from == getCurrentUser();

    const timePassed = (message.time - (prevMessage.time || 0)) > (5 * minuteMillis);

    function onPress() {
        if (!message.pending) {
            vibrate(); 
            setPopup(true);
        }
    }

    const failed = message.failed || (message.pending && message.time < Date.now() - minuteMillis);


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
                        <MemberPhotoIcon hue={hue} photoKey={fromMember.photo} user={message.from} name={fromMember.name} size={40} style={{marginRight: 4}}/>            
                    </View>
                )
            }
            <View style={{flexShrink: 1}}>
            {/* <View style={{flex: 1, flexGrow: 0, maxWidth: 550}}> */}
                <FixedTouchable dummy={Platform.OS == 'web'} onPress={onPress} onLongPress={onPress} style={{flex: 1, maxWidth: 550}}>
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
                            <Catcher label='RepliedMessage' context={{group, messageKey}}>
                                <RepliedMessage message={message} messages={messages} members={members} />
                            </Catcher> 
                        : null}
                        <LinkText linkColor={myMessage ? 'white' : 'black'} colorLinks={!myMessage} style={myMessage ? styles.myMessageText : styles.theirMessageText} text={message.text?.trim()}/>
                        {message.pending && !failed ?
                            <View style={{width: 16, height: 16, backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, alignItems: 'center', justifyContent: 'center', 
                                    position: 'absolute', right: -4, bottom: -4}}>
                                <FontAwesome name='clock-o' size={14} /> 
                            </View>
                        : null}
                        {failed ?
                            <View style={{width: 16, height: 16, backgroundColor: 'white', borderColor: 'red', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, alignItems: 'center', justifyContent: 'center', 
                                position: 'absolute', right: -4, bottom: -4}}>
                                <Text style={{color: 'red', fontSize: 14}}>!</Text> 
                            </View>
                        : null }
                    </View>
                    {failed ? 
                        <Text style={{color: 'red', marginRight: 8, marginBottom: 8}}>Failed to send message</Text>
                    :null}
                </FixedTouchable>
            </View>

            <View style={{width: 48, flexShrink: 0}}>
                {hover && !message.pending ? 
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

function RepliedMessage({message, messages, members}) {
    const myMessage = message.from == getCurrentUser();
    const repliedMessage = messages[message.replyTo];
    if (repliedMessage) {
        return (
            <View style={{paddingLeft: 8, marginVertical: 4, borderLeftColor: myMessage ? 'white' : '#666', borderLeftWidth: StyleSheet.hairlineWidth}}>
                <Text style={{fontSize: 12, color: myMessage ? 'white' : '#666', fontWeight: 'bold', marginBottom: 4}}>{members[repliedMessage.from]?.name}</Text>
                <Text style={{fontSize: 12, color: myMessage ? 'white' : '#666'}}>{repliedMessage.text}</Text>
            </View>
        )
    } else {
        return (
            <View style={{paddingLeft: 8, marginVertical: 4, borderLeftColor: myMessage ? 'white' : '#666', borderLeftWidth: StyleSheet.hairlineWidth}}>
                <Text style={{fontSize: 12, color: myMessage ? 'white' : '#666'}}>Missing message</Text>
            </View>
        )
        
    }

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


