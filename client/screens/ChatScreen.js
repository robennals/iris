import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { andFormatStrings, firstName, FixedTouchable, HeaderSpaceView, memberKeysToHues, OneLineText, shallowEqual, WideButton } from '../components/basics';
import { ChatEntryBox } from '../components/chatentry';
import { GroupContext } from '../components/context';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { LinkText } from '../components/linktext';
import { MessageEntryBox } from '../components/messageentrybox';
import { EnableNotifsBanner } from '../components/notifpermission';
import { CommunityPhotoIcon, GroupMultiIcon, GroupPhotoIcon, GroupSideBySideIcon, MemberPhotoIcon } from '../components/photo';
import { setTitle, addFocusListener, removeFocusListener, TitleBlinker, vibrate, useCustomNavigation } from '../components/shim';
import { getCurrentUser, getFirebaseServerTimestamp, internalReleaseWatchers, isMasterUser, setDataAsync, useDatabase, useListDatabase, watchData } from '../data/fbutil';
import _ from 'lodash';
import { PhotoPromo } from '../components/profilephoto';
import { Entypo, FontAwesome } from '@expo/vector-icons';
import { formatMessageTime, formatShortDate, formatTime, minuteMillis } from '../components/time';
import { adminJoinGroupAsync, endorseMessageAsync, likeMessageAsync, publishMessageAsync, sendMessageAsync } from '../data/servercall';
import { ModalMenu } from '../components/shimui';
import { Catcher } from '../components/catcher';
import { ConnectedBanner } from '../components/connectedbanner';
import { Feedback } from '../components/feedback';
import { Loading } from '../components/loading';
import { StatusBar } from 'expo-status-bar';
import { BottomFlatScroller } from '../components/bottomscroller';
import { baseColor } from '../data/config';

export function ChatScreenHeader({navigation, route}) {
    const {group} = route.params;

    const name = useDatabase([group], ['userPrivate', getCurrentUser(), 'group', group, 'name'], '');
    const members = useDatabase([group], ['group', group, 'member']);
    const community = useDatabase([group], ['group', group, 'community'], null);
    const communityInfo = useDatabase([community], ['community', community]);

    useEffect(() => {
        function markThisChatRead() {
            const time = getFirebaseServerTimestamp();
            setDataAsync(['userPrivate', getCurrentUser(), 'group', group, 'readTime'], time);
            setDataAsync(['userPrivate', getCurrentUser(), 'lastAction'], time)
            setDataAsync(['group', group, 'memberRead', getCurrentUser()], time);
            if (community) {
                setDataAsync(['adminCommunity', community, 'group', group, 'memberRead', getCurrentUser()], time);
            }
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
            && groups[k].name
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


var global_chatInputRef = null;
var global_chatEntryRef = null;

function TimeOut({time}) {
    return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{fontWeight: 'bold'}}>You are in time out until {formatShortDate(time)}.</Text>
            <Text>You cannot take part in chats until your time out is over.</Text>
        </View>
    )
}

export function ChatScreen({navigation, route}) {
    const {group} = route.params;

    const members = useDatabase([group], ['group', group, 'member']);
    const archived = useDatabase([group], ['group', group, 'archived'], false);
    const groupName = useDatabase([group], ['group', group, 'name']);
    const community = useDatabase([group], ['group', group, 'community'], null);
    const timeOut = useDatabase([], ['userPrivate', getCurrentUser(), 'timeOut'], 0);
    const [reply, setReply] = useState(null);
    const chatInputRef = React.createRef();
    const chatEntryRef = useRef();
    global_chatEntryRef = chatEntryRef;
    global_chatInputRef = chatInputRef;

    const onReply = useCallback(reply => {
        setReply(reply);
        global_chatInputRef?.current?.focus();
    }, [])

    const onEdit = useCallback((edit,reply) => {
        if (global_chatEntryRef.current.setEdit(edit)) {
            setReply(reply);
        }
    }, [])

    const onClearReply = useCallback(() => {
        setReply(null);
    }, [])

    if (!members) {
        return <Loading />
    }

    if (timeOut > Date.now()) {
        return <TimeOut time={timeOut} />
    }

    // console.log('render chatscreen');

    const iAmNotInGroup = members && !members[getCurrentUser()];

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
            <MemoMessageList group={group} onReply={onReply} onEdit={onEdit} />            
            {iAmNotInGroup ?
                <WideButton progressText='Joining...' onPress={() => adminJoinGroupAsync({group})}>
                    Join Group Chat
                </WideButton>
            :
                (archived && !isMasterUser(getCurrentUser()) ? 
                null
                :
                    <ChatEntryBox key='chat' group={group} reply={reply} groupName={groupName}
                        community={community}
                        onClearReply={onClearReply}
                        chatInputRef={chatInputRef} ref={chatEntryRef} />
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

// function getPublishSuggestions({messages, likes}) {
//     var publishSuggestions = {};
//     _.forEach(_.keys(likes), m => {
//         const message = messages?.[m];
//         if (message.from == getCurrentUser() && !message.published) {
//             const likers = _.keys(likes[m]);
//             const lastTime = _.max(_.map(likers, u => likes[m][u]));
//             publishSuggestions['pub-' + m] = {
//                 messageKey: m,
//                 time: lastTime,
//                 type: 'like'
//             }
//         }
//     })    
//     return publishSuggestions;
// }

// var global_lastMessages = {};

// function compareMessageChanges(messages) {
//     console.log('== comparing messages ==');
//     _.forEach(_.keys(messages), k => {
//         if (global_lastMessages[k] && global_lastMessages[k] !== messages[k]) {
//             console.log('message changed', k, global_lastMessages[k], messages[k]);
//         }
//     })
//     global_lastMessages = {... (messages || {})};
// }

const empty_object = {};

const MemoMessageList = React.memo(MessageList);
// const MemoMessageList = React.memo(MessageList, (prev, next) => thingsAreEqual('messageList', prev, next));

function MessageList({group, onReply, onEdit}) {
    const messages = useListDatabase([group], ['group', group, 'message']);
    const localMessages = useListDatabase([group], ['userPrivate', getCurrentUser(), 'localMessage', group]);
    const members = useDatabase([group], ['group', group, 'member']);
    const community = useDatabase([group], ['group', group, 'community'], null);
    const topic = useDatabase([group], ['group', group, 'topic'], null);
    const archived = useDatabase([group], ['group', group, 'archived'], false);
    const likes = useDatabase([group], ['group', group, 'like']);
    const endorsements = useDatabase([group], ['group', group, 'endorse']);
    const scrollRef = React.createRef();
    const memberHues = useMemo(() => memberKeysToHues(_.keys(members || {})), [members]);

    // compareMessageChanges(messages);

    // console.log('messageList', {messages, localMessages, members, likes});

    if (!messages || !localMessages || !members || !likes || !endorsements) return <Loading style={{flex: 1}} />

    // console.log('render messageList', group);

    const meInGroup = members && members[getCurrentUser()];



    // const publishSuggestions = getPublishSuggestions({messages, likes});

    const allMessages = messages ? {...(localMessages || {}), ...messages} : {};
    const messageKeys = Object.keys(allMessages || {});
    const sortedMessageKeys = _.sortBy(messageKeys, k => allMessages[k].time);


    // const messageKeys = Object.keys(messages || {});
    // const sortedMessageKeys = _.sortBy(messageKeys, k => messages[k].time);
    // // const shownMessageKeys = sortedMessageKeys.slice(-showCount);
    const shownMessageKeys = sortedMessageKeys;

    function renderMessage({item}) {
        // console.log('renderMessageFunc', item);
        const {key, idx} = item;
        if (key == 'space') {
            return <View style={{height: 16}} />
        } else if (key == 'archived') {
            return <Feedback archived={archived} group={group} />
        } else if (key == 'pad') {
            return <View style={{height: 8}} />
        } else {
            const message = allMessages[key];
            const prevMessage = allMessages[shownMessageKeys[idx-1]] ?? empty_object;
            const nextMessage = allMessages[shownMessageKeys[idx+1]] ?? empty_object;
            const replyMessage = message.replyTo ? allMessages[message.replyTo] : null;
            return (
                <Catcher key={key}>
                    <MemoMessage
                        message={message} prevMessage={prevMessage} nextMessage={nextMessage}
                        replyMessage={replyMessage} 
                        members={members} group={group}
                        messageKey={key} prevMessageKey={shownMessageKeys[idx-1]} nextMessageKey={shownMessageKeys[idx+1]}
                        memberHues={memberHues} 
                        messageLikes={likes?.[key]} messageEndorsements={endorsements?.[key]} 
                        community={community} topic={topic}
                        meInGroup={meInGroup}
                        onReply={onReply} onEdit={onEdit} />
                </Catcher>
            )
        }
    }

    // return <Text>Message List</Text>

    return (
        <View style={{flex: 1}}>
            <BottomFlatScroller style={{flex: 1, flexShrink: 1}} ref={scrollRef} 
            renderItem={renderMessage}
            extraData={group}
            data={[
                {key: 'space'},
                ...shownMessageKeys.map((k,idx) => ({key: k, idx, message: allMessages[k]})),
                {key: 'archived'},
                {key: 'pad'}
            ]}
            />
        </View>
    )
}



// function PublishSuggestion({messages, members, publishSuggestion, memberHues}) {
//     return <Text>Publish Suggestion</Text>
// }


async function retrySendingMessageAsync({messageKey, message, group}) {
    await sendMessageAsync({messageKey, group, text: message.text, replyTo: message.replyTo});
}

function messagesAreEqual(prev, next) {
    const keys = _.keys(prev);
    var equal = true;
    _.forEach(keys, k => {
        if (prev[k] !== next[k]) {
            console.log('Message changed ' + k + ' - ' + next.message.text);
            console.log('prev['+k+'] = ', prev[k]);
            console.log('next['+k+'] = ', next[k]);
            equal = false;
        }
    })   
    return equal;
}

function thingsAreEqual(thing, prev, next) {
    const keys = _.keys(prev);
    var equal = true;
    _.forEach(keys, k => {
        if (prev[k] !== next[k]) {
            console.log(thing + ' changed ' + k, {prev: prev[k], next: next[k]});
            equal = false;
        }
    })   
    return equal;
}



// const MemoMessage = React.memo(Message, (prev, next) => thingsAreEqual('message', prev, next));
const MemoMessage = React.memo(Message); 


function Message({group, meInGroup, community, topic, message, prevMessage, nextMessage, replyMessage, messageLikes=null, messageEndorsements=null, members, messageKey, memberHues, onReply, onEdit}) {
    const navigation = useCustomNavigation();
    const [hover, setHover] = useState(false);
    const [popup, setPopup] = useState(false);

    const myMessage = message.from == getCurrentUser();
    const fromMember = members[message.from] || {name: 'User left the group'};
    const hue = memberHues[message.from] || 45;
    const hueStyle = (myMessage || message.from == 'zzz_irisbot') ? null : {backgroundColor: 'hsl(' + hue + ',40%, 90%)'};

    const timePassed = (message.time - (prevMessage.time || 0)) > (5 * minuteMillis);
    const timePassedToNext = ((nextMessage.time || 0) - message.time) > (5 * minuteMillis);

    // console.log('renderMessage', message.text);

    const samePrevAuthor = !myMessage && !timePassed && message.from == prevMessage.from;
    const sameNextAuthor = !myMessage && !timePassedToNext && message.from == nextMessage.from;
    const prevAlsoMe = myMessage && !timePassed && prevMessage.from == getCurrentUser();
    const nextAlsoMe = myMessage && !timePassedToNext && nextMessage.from == getCurrentUser();

    const likedByMe = message.proposePublic ? messageEndorsements?.[getCurrentUser()] : messageLikes?.[getCurrentUser()];
    const hasLikes = message.proposePublic ? messageEndorsements : messageLikes;

    function onPress() {
        if (!message.pending) {
            vibrate(); 
            setPopup(true);
        }
    }

    function onReplyClicked() {
        onReply({key: messageKey, text: message.text, name: fromMember.name});
    }

    function onEditClicked() {
        var reply = null;        
        if (message.replyTo) {
            reply = {key: message.replyTo, text: replyMessage?.text, name: members[replyMessage.from]?.name};
        }        
        onEdit({key: messageKey, proposePublic: message.proposePublic, text: message.text, time: message.time}, reply);
    }
    function onLikeClicked() {
        if (message.proposePublic) {
            setDataAsync(['group', group, 'endorse', messageKey, getCurrentUser()], likedByMe ? null : getFirebaseServerTimestamp());
            console.log('endorse', {group, messageKey, likedByMe, messageLikes, messageEndorsements});
            endorseMessageAsync({group, messageKey, endorse: !likedByMe});
        } else {
            setDataAsync(['group', group, 'like', messageKey, getCurrentUser()], likedByMe ? null : getFirebaseServerTimestamp());
            if (!likedByMe) {
                console.log('like', group, messageKey);
                likeMessageAsync({group, messageKey});
            }
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
        <View style={{marginBottom: hasLikes ? 24 : null}}>
        {/* <View> */}
            {timePassed ? 
                <Text style={{textAlign: 'center', fontSize: 13, color: '#999', marginTop: 16, marginBottom: 4}}>
                    {formatMessageTime(message.time)}
                </Text>
            : null}


        <View style={[myMessage ? styles.myMessageRow : styles.theirMessageRow]} 
            onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>            
            {popup && meInGroup ? 
                <MessagePopup myMessage={myMessage} likedByMe={likedByMe} isPublic={message.proposePublic} onClose={() => setPopup(false)} onReply={onReplyClicked} onEdit={onEditClicked} messageKey={messageKey} onLike={onLikeClicked} />
            : null}
            {myMessage ? null :
                (samePrevAuthor ? 
                    <View style={{width: 40, marginLeft: 8}} />
                :
                    <View style={{marginLeft: 4, alignSelf: 'flex-start', marginTop: message.published ? 26 : 8}}>
                        <FixedTouchable onPress={() => navigation.navigate('profile', {community, member: message.from})}>
                            <MemberPhotoIcon hue={hue} photoKey={fromMember.photo} user={message.from} name={fromMember.name} size={40} style={{marginRight: 4}}/>            
                        </FixedTouchable>
                    </View>
                )
            }
            {/* <View style={message.published ? styles.publishedMessageBox : {flexShrink: 1}}> */}
            <View style={{flexShrink: 1}}>
                {message.published ? 
                    <FixedTouchable onPress={() => navigation.navigate('highlights', {community, topic})}>
                        <View style={{marginHorizontal: 8, marginTop: 4, flexDirection: 'row', alignItems: 'center'}}>
                            <Entypo name='star' color='#FABC05' size={16} />
                            <Text style={{color: '#666', marginLeft: 4, fontSize: 12}}>Public Highlight - <Text style={{textDecorationLine: 'underline'}}>see all</Text></Text>
                        </View>
                    </FixedTouchable>
                : null}
                {!message.published && message.proposePublic ? 
                    <View style={{marginHorizontal: 8, marginTop: 4, flexDirection: 'row', alignItems: 'center'}}>
                        <Entypo name='star' color='#FABC05' size={16} />
                        <Text style={{color: '#666', marginLeft: 4, fontSize: 12}}>Proposed Public Highlight</Text>
                    </View>
                : null}
                {!message.published && !message.proposePublic && message.prevPublic ? 
                    <View style={{marginHorizontal: 8, marginTop: 4, flexDirection: 'row', alignItems: 'center'}}>
                        {/* <Entypo name='star' color='#FABC05' size={16} /> */}
                        <Text style={{color: '#666', marginLeft: 4, fontSize: 12}}>Previous highlight</Text>
                    </View>            
                : null}
                {message.viewpoint && !message.firstViewpoint? 
                    <View style={{marginHorizontal: 8, marginTop: 4, flexDirection: 'row', alignItems: 'center'}}>
                        {/* <Entypo name='star' color='#FABC05' size={16} /> */}
                        <Text style={{color: '#666', marginLeft: 4, fontSize: 12}}>Updated their viewpoint</Text>
                    </View>            
                : null}
                {message.viewpoint && message.firstViewpoint ? 
                    <View style={{marginHorizontal: 8, marginTop: 4, flexDirection: 'row', alignItems: 'center'}}>
                        {/* <Entypo name='star' color='#FABC05' size={16} /> */}
                        <Text style={{color: '#666', marginLeft: 4, fontSize: 12}}>Wrote a viewpoint</Text>
                    </View>            
                : null}



            {/* <View style={{flex: 1, flexGrow: 0, maxWidth: 550}}> */}
                <FixedTouchable dummy={Platform.OS == 'web'} onPress={onPress} onLongPress={onPress} style={{flex: 1, maxWidth: 550}}>
                    <View style={[myMessage ? styles.myMessage : styles.theirMessage, 
                            samePrevAuthor ? {marginTop: 1, borderTopLeftRadius: 4} : {}, 
                            sameNextAuthor ? {marginBottom: 1, borderBottomLeftRadius: 4} : {},
                            prevAlsoMe ? {marginTop: 1, borderTopRightRadius: 4} : {},
                            nextAlsoMe ? {marginBottom: 1, borderBottomRightRadius: 4} : {},
                            // myMessage && messageLikes ? {alignSelf: 'stretch'} : {},
                            message.published || message.proposePublic || message.viewpoint ? {borderColor: '#222', borderWidth: 4, marginTop: 1, marginBottom: 8, ...shadowStyle} : {},
                            message.prevPublic && (!message.proposePublic) ? {marginTop: 1} : {},
                            // messageLikes ? {marginBottom: 24} : {},
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
                                <RepliedMessage message={message} replyMessage={replyMessage} members={members} />
                            </Catcher> 
                        : null}
                        {message.viewpoint ?
                            <View>
                                <Text numberOfLines={4} style={myMessage ? styles.myMessageText : styles.theirMessageText}>
                                    {message.text}
                                </Text>
                                <FixedTouchable onPress={() => navigation.navigate(message.from == getCurrentUser() ? 'myViewpoint' : 'viewpoint', {community, topic, user: message.from})}>
                                <Text style={{marginTop: 4, color: message.from == getCurrentUser() ? 'white' : baseColor}}>Read more...</Text>
                                </FixedTouchable>
                            </View>
                        : 
                            <LinkText linkColor={myMessage ? 'white' : 'black'} colorLinks={!myMessage} style={myMessage ? styles.myMessageText : styles.theirMessageText} text={message.text?.trim()}/>
                        }
                        {message.editTime ? 
                            <Text style={{fontSize: 12, marginTop: 2, color: myMessage ? 'white' : '#666'}}>edited {formatMessageTime(message.editTime)}</Text>
                        : null}
                        {hasLikes ?
                            <View style={{position: 'relative', marginTop: -12, bottom: message.published ? -20 : -18, right: 8, left: -4, alignSelf: 'stretch'}}>
                                <MessageLikes messageLikes={message.proposePublic ? messageEndorsements : messageLikes} 
                                        isPublic={message.proposePublic} members={members} memberHues={memberHues} />
                            </View>                            
                        : null}
                        {message.proposePublic && !myMessage && !messageEndorsements ?  
                            <View style={{position: 'relative', marginTop: -12, bottom: message.published ? -20 : -18, right: 8, left: -4, alignSelf: 'stretch'}}> 
                                <PublishEndorseButton onPress={onLikeClicked} />
                            </View>
                        : null}
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
                        <View style={{flexDirection: 'row'}}>
                            <Text style={{color: 'red', marginBottom: 8}}>Failed to send message - </Text>
                            <FixedTouchable onPress={() => retrySendingMessageAsync({group, messageKey, message})}>
                                <Text style={{color: 'red', marginRight: 8, marginBottom: 8, textDecorationLine: 'underline'}}>Try again</Text>
                            </FixedTouchable>
                        </View>
                    :null}
                </FixedTouchable>

            </View>

            <View style={{width: 64, flexShrink: 0, flexDirection: 'row', justifyContent: myMessage ? 'flex-end' : 'flex-start', alignItems: 'center', 
                marginTop: (message.published || message.proposePublic || message.prevPublic) ? 24 : null}}>
                {hover && meInGroup && myMessage ? 
                    <View style={{marginHorizontal: 4}}>
                        <FixedTouchable onPress={onEditClicked}>
                            <Entypo name='edit' size={20} color='#999' />
                        </FixedTouchable>
                    </View>
                : null}

                {hover && meInGroup && !message.pending ? 
                    <View style={{marginHorizontal: 4}}>
                        <FixedTouchable onPress={onReplyClicked}>
                            <Entypo name='reply' size={20} color='#999' />
                        </FixedTouchable>
                    </View>
                : null}

                {hover && meInGroup && !myMessage ?
                    <View style={{marginHorizontal: 4}}>
                        <FixedTouchable onPress={onLikeClicked}>
                            {message.proposePublic ? 
                                <FontAwesome name='smile-o' size={20} color='#999' />
                            : 
                                <Entypo name={likedByMe ? 'heart' : 'heart-outlined'} size={20} color='#999' />
                            }
                        </FixedTouchable>
                    </View>            
                : null}
            </View>
        </View>
        </View>
        // </Swipeable>
    )
}

// const shadowStyle = {
//     shadowRadius: 4, shadowColor: '#555', shadowOffset: {width: 0, height: 2},
//     shadowOpacity: 0.5, elevation: 3}

const shadowStyle = {
    shadowRadius: 8, shadowColor: '#222', shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.6, elevation: 3}
    

function PublishEndorseButton({onPress}) {
    return (
        <FixedTouchable onPress={onPress} style={{marginLeft: 4}} >
        <View style={{flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, 
        paddingHorizontal: 4, paddingVertical: 1, ...shadowStyle, flexShrink: 1}}>
            <FontAwesome name='smile-o' color='black' size={20} />
            <Text style={{fontSize: 12, fontWeight: 'bold', marginRight: 4, marginLeft: 4}}>
                Endorse
            </Text>
        </View>
    </FixedTouchable>        
    )
}

function MessageLikes({members, memberHues, messageLikes, isPublic}) {
    const likers = _.keys(messageLikes || {});
    if (likers.length == 0) {
        return null;
    }
    const likerNames = andFormatStrings(_.map(likers, m => 
        m == getCurrentUser() ? 'You' : firstName(members?.[m]?.name || '')));

    return (
        <View style={{alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-start'}}>
            <View style={{flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, 
                    paddingHorizontal: 2, paddingVertical: 1, ...shadowStyle, flexShrink: 1}}>
                {isPublic ? 
                    <FontAwesome name='smile-o' size={20} style={{marginRight: 4, marginLeft: 2}} />
                : 
                    <Entypo name='heart' color='red' size={20} style={{marginRight: 4, marginLeft: 2}} />
                }
                {_.map(likers, m => 
                    <MemberPhotoIcon key={m} user={m} hue={memberHues?.[m]} size={20}
                        photoKey={members?.[m]?.photo} name={members?.[m]?.name}  />
                )}
                <OneLineText style={{marginLeft: 8, color: '#666', fontSize: 12, marginRight: 8}}>
                    {likerNames} {isPublic ? 'endorsed' : 'liked'}
                </OneLineText>
            </View>
        </View>
    )
}

function RepliedMessage({message, replyMessage, members}) {
    const myMessage = message.from == getCurrentUser();
    if (replyMessage) {
        return (
            <View style={{paddingLeft: 8, marginVertical: 4, borderLeftColor: myMessage ? 'white' : '#666', borderLeftWidth: StyleSheet.hairlineWidth}}>
                <Text style={{fontSize: 12, color: myMessage ? 'white' : '#666', fontWeight: 'bold', marginBottom: 4}}>{members[replyMessage.from]?.name}</Text>
                <Text style={{fontSize: 12, color: myMessage ? 'white' : '#666'}}>{replyMessage.text}</Text>
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


function MessagePopup({messageKey, myMessage, isPublic, likedByMe, onLike, onReply, onEdit, onClose}) {
    var actions = [];
    actions.push({id: 'reply', label: 'Reply'});
    if (myMessage) {
        actions.push({id: 'edit', label: 'Edit'});
    } else {
        actions.push({id: 'like', label: isPublic ? (likedByMe ? 'UnEndorse' : 'Endorse') : (likedByMe ? 'Unlike' : 'Like')});
    }

    return <ModalMenu items={actions} onClose={onClose} onSelect={async id => {
        switch (id) {
            case 'reply': 
                onClose();
                return onReply(messageKey)
            case 'edit': 
                onClose();
                return onEdit();
            case 'like': 
                onClose();
                return onLike();
            default:
                onClose();
        }
    }} />
}
      

const styles = StyleSheet.create({
    publishedMessageBox: {
        borderColor: '#ddd',
        borderWidth: StyleSheet.hairlineWidth,
        // padding: 4,
        marginHorizontal: 8,
        borderRadius: 8,
        paddingBottom: 24,
        ...shadowStyle
    },
    myMessage: {
        backgroundColor: '#0084FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        marginVertical: 4,
        // marginHorizontal: 8,
        marginRight: 8,
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


