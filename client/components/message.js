import React, { useContext, useState } from 'react';
import { Text, View, StyleSheet, Platform} from 'react-native';
import { commaSepStrings, firstLine, firstName, FixedTouchable, MemberIcon, OneLineText } from './basics';
import { GroupContext, MemberSectionContext, ThreadContext } from './context';
import { MessageEntryBox } from './messageentrybox';
import { dayMillis, formatLongTimeDate, formatTime } from './time';
import _ from 'lodash';
import { getCurrentUser, setDataAsync } from '../data/fbutil';
import { useNavigation } from '@react-navigation/core';
import { Entypo, FontAwesome } from '@expo/vector-icons';
import { highlightColor } from '../data/config';
import { LinkText } from './linktext';
import { highlightMessageAsync, likeMessageAsync, validateReplyAsync } from '../data/servercall';
import { MemberPhotoIcon, MessagePhoto } from './photo';
import { Catcher } from './catcher';
import { useCustomNavigation } from './shim';


export function getMessageReplies(messages) {
    var replies = {};
    Object.keys(messages).forEach(m => {
        const message = messages[m];
        if (message.replyTo) {
            if (!replies[message.replyTo]) {
                replies[message.replyTo] = [];
            }
            replies[message.replyTo].push(m);
        }
    })
    return replies
}

export function flattenMessages({messages, parentKey, replies, messageKey, isLast, indent = 0, obsolete}) {
    var flatMessages = [];
    const replyKeys= replies[messageKey] || [];
    const message = messages[messageKey];
    const sortedReplyKeys = _.sortBy(replyKeys, k => messages[k].time);
    flatMessages.push({messageKey, parentKey, indent: 0, last: isLast, indent});
    _.forEach(sortedReplyKeys, (k, idx) => {
        const subMessages = flattenMessages({messages, parentKey: messageKey, replies, 
            indent: indent + 1,
            messageKey: k, isLast: idx == (sortedReplyKeys.length - 1)});
        _.forEach(subMessages, sub => {
            flatMessages.push(sub);
        })
    })
    return flatMessages;
}

export function IndentedMessage({messages, flat}) {    
    const {parentKey, messageKey, indent, last} = flat;
    const innerFlat = {...flat, indent: indent - 1};
    if (indent <= 1) {
        return <Message parentKey={parentKey} messageKey={messageKey} />
    } else {        
        return (
            <View style={{paddingLeft: 8, marginLeft: 8, marginVertical: 0, borderLeftColor: '#ddd', borderLeftWidth: StyleSheet.hairlineWidth}}>
                <IndentedMessage messages={messages} flat={innerFlat} />
            </View>
        )
    }
}

function LikeList({members, message}) {
    if (message.from != getCurrentUser() || !message.like) {
        return null;
    } else {
        const likerNames = _.map(_.keys(message.like), m => _.get(members,[m,'name']));
        console.log('likerNames', likerNames);
        const likerString = commaSepStrings(likerNames);
        console.log('likerString', likerString);

        // return <Text>Liked</Text>
        return <Text style={{fontSize: 12, color: '#666', marginTop: 8, marginLeft: 10}}>
            <FontAwesome name='heart' /> Liked by {likerString}
            </Text>

    }
}

function ObsoleteWarning() {
    return (
        <View style={{borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', paddingVertical: 4, paddingHorizontal: 8, marginVertical: 4, borderRadius: 8, alignSelf: 'flex-start', borerRadius : 8}}>
            <Text style={{fontWeight: 'bold'}}>Out of date</Text>
            <Text style={{color: '#666'}}>Parent was edited since this message was written.</Text>
        </View>
    )
}

export function Message({parentKey, messageKey}) {
    const {group, blocks, title, messages, showTime, meAdmin, readTime, members, replies, rootKey, highlightKey, highlightMember, latestReplies} = useContext(ThreadContext);
    const [showReplyBox, setShowReplyBox] = useState(false);
    const [showEditBox, setShowEditBox] = useState(false);
    const [localLiked, setLocalLiked] = useState(null);
    const [localHighlight, setLocalHighlight] = useState(null);

    const [expanded, setExpanded] = useState(false);
    // const expanded = true;
    const navigation = useCustomNavigation();
    const message = messages[messageKey];
    if (!message) return null;

    const authorName = _.get(members[message.from],'name', 'No Longer in Group');
    const isRoot = messageKey == rootKey;
    const highlight = (messageKey == highlightKey) || (message.from == highlightMember && !message.obsolete);
    const byMe = message.from == getCurrentUser();
    const parentByMe = _.get(messages,[parentKey,'from']) == getCurrentUser();

    const replyKeys = replies[messageKey];
    const sortedReplyKeys = _.sortBy(replyKeys || [], k => latestReplies[k]).reverse();
    const topLevel = !message.replyTo;

    const iBlocked = _.get(blocks, [getCurrentUser(), message.from]);
    const theyBlocked = _.get(blocks, [message.from, getCurrentUser()]);

    function replyPressed() {
        if (Platform.OS != 'web') {
            navigation.navigate('messagebox', {group, rootKey, replyTo: messageKey});
        } else {
            setShowReplyBox(true);
        }
    }

    function editPressed() {
        if (Platform.OS != 'web' || !message.replyTo) {
            navigation.navigate('messagebox', {group, edit: true, replyTo: message.replyTo, editText: message.text, editTitle: message.title, editKey:messageKey, editPhotoKey: message.photoKey, rootKey});
        } else {
            setShowEditBox(true);
        }
    }


    // const seen = seenMessages[messageKey] != null;
    const unread = message.time > showTime;
    const obsolete = message.obsolete || false;

    // const show = unread;

    // const shadow = isRoot ? {
    //     shadowRadius: 1, shadowOpacity: 0.5, shadowColor: '#555', shadowOffset: {width: 0, height: 1},
    // } : null;
    const liked = localLiked == null ? _.get(message, ['like', getCurrentUser()], false) : localLiked;
    const isHighlighted = localHighlight == null ? message.highlight : localHighlight;

    if (iBlocked || theyBlocked) {
        return (
            <View>
                <View style={{
                    backgroundColor: isRoot ? 'white' : '#f0f0f0',
                    maxWidth: isRoot ? null : 500,
                    marginTop: 8,
                    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8}}>
                    <View style={{flexDirection: 'row', marginBottom: 2, justifyContent: 'space-between'}}>
                        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                            <MemberPhotoIcon user={message.from} photoKey={_.get(members,[message.from,'photo'])} name={authorName} size={16} />
                            <Text style={{fontWeight: '500', color: '#444', marginRight: 8, flexShrink: 0, marginLeft: 3, fontSize: 16}}>
                                {authorName}
                            </Text>
                            <OneLineText style={{fontSize: 16, color: '#666', flex: 1}}>
                                {iBlocked ? 'You blocked this user' : 'This user blocked you'}
                            </OneLineText>
                        </View>
                    </View>
                </View>
                {/* <MessageReplies key='replies' topLevel={topLevel} messageKey={messageKey} sortedReplyKeys={sortedReplyKeys} /> */}
            </View>
        )
    } else if ((unread && !obsolete) || expanded || highlight || isRoot) {
        return (
            <View style={{marginTop: 8, marginBottom: 8}}>
                <View style={{
                    backgroundColor: highlight ? highlightColor : 'white',
                    borderColor: '#ddd', borderWidth: highlight ? StyleSheet.hairlineWidth : null,
                    maxWidth: isRoot ? null : 500,
                    marginHorizontal: 2,
                    paddingVertical: highlight ? 8 : 0, paddingHorizontal: 8, 
                    borderRadius: isRoot ? 0 : 6}}>
                    {/* <FixedTouchable onPress={()=>expanded ? collapseMessage() : expandMessage()}> */}

                        <View style={{flexDirection: 'row', marginBottom: 6, justifyContent: 'flex-start', alignItems: 'center'}}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <MemberPhotoIcon user={message.from} photoKey={_.get(members,[message.from, 'photo'])} name={authorName} size={24} />
                                <Text style={{fontWeight: '600', marginLeft: 7, fontSize: 16}}>
                                    {authorName}
                                </Text>
                            </View>
                            <Text style={{color: '#666', paddingLeft: 8, fontSize: 11}}>
                                {formatTime(message.time)}
                            </Text>
                            {!isRoot && !highlight ?
                                <FixedTouchable onPress={() => setExpanded(false)}>
                                    <Entypo name='chevron-up' color='#666' size={16} style={{paddingHorizontal: 8}} />
                                </FixedTouchable>
                            : null}
                        </View>
                    {(!message.replyTo && message.title) ? 
                        <Text style={{fontWeight: 'bold', fontSize: 16, marginTop: 2, marginBottom: 8}}>{message.title}</Text>
                    : null}
                    {obsolete ?
                        <ObsoleteWarning />
                    : null}
                    {showEditBox ?
                        <MessageEntryBox editText={message.text} editKey={messageKey} edit={true} 
                            rootKey={rootKey} replyTo={message.replyTo} editPhotoKey={message.photoKey}
                            onCancel={() => setShowEditBox(false)} style={{marginTop: 8}} />
                    :
                        <LinkText text={message.text} style={{color: obsolete ? '#999' : '#222', fontSize: 16, lineHeight: 20}} />
                    }
                    {/* </FixedTouchable> */}
                    {message.photoKey && !showEditBox ? 
                        <MessagePhoto photoKey={message.photoKey} photoUser={message.from} />
                    : null}
                </View>
                <LikeList members={members} message={message} />
                <View style={{flexDirection: 'row', marginTop: 10, marginLeft: 2, paddingLeft: 8, borderColor: '#ddd'}}>
                    {obsolete ? null :
                        <FixedTouchable onPress={replyPressed}>
                            <View style={{flexDirection: 'row', marginRight: 12, alignItems: 'flex-start'}}>
                                <Entypo name='reply' style={{marginRight: 3}} />
                                <Text style={{fontSize: 12, color: '#666'}}>
                                    Reply
                                </Text>
                            </View>
                        </FixedTouchable>
                    }
                    {parentByMe && obsolete ? 
                        <FixedTouchable onPress={() => validateReplyAsync({group, rootKey, messageKey})}>
                            <View style={{flexDirection: 'row', marginRight: 12, alignItems: 'center'}}>
                                <Entypo name='check' style={{marginRight: 2}} />
                                <Text style={{fontSize: 12, color: '#666'}}>Clear warning</Text>
                            </View>
                        </FixedTouchable>
                    : null}
                    {byMe ? 
                        <FixedTouchable onPress={editPressed}>
                            <View style={{flexDirection: 'row', marginRight: 12, alignItems: 'center'}}>
                                <FontAwesome name='edit' style={{marginRight: 3}} />
                                <Text style={{fontSize: 12, color: '#666'}}>
                                    Edit
                                </Text>
                            </View>
                        </FixedTouchable>
                    : null}
                    {!byMe ? 
                        <FixedTouchable onPress={() => {
                            setLocalLiked(!liked);
                            likeMessageAsync({group, rootKey, title, messageKey, like: !liked})
                        }}>
                        <View style={{flexDirection: 'row', marginRight: 12, alignItems: 'center'}}>
                            <FontAwesome name={liked ? 'heart' : 'heart-o'} style={{marginRight: 3}} />
                            <Text style={{fontSize: 12, color: '#666'}}>
                                {liked ? 'Liked' : 'Like'}
                            </Text>
                        </View>
                    </FixedTouchable>
                    : null}
                    {meAdmin && isRoot ? 
                        <FixedTouchable onPress={() => {
                            setLocalHighlight(!isHighlighted);
                            highlightMessageAsync({group, messageKey, highlight: !message.highlight})
                        }}>
                            <View style={{flexDirection: 'row', marginRight: 12, alignItems: 'center'}}>
                                <FontAwesome name={isHighlighted ? 'star' : 'star-o'} style={{marginRight: 3}} />
                                <Text style={{fontSize: 12, color: '#666'}}>
                                    {isHighlighted ? 'Highlighted' : 'Highlight'}
                                </Text>
                            </View>
                        </FixedTouchable>
                    : null}
                    {/* {!highlight && !isRoot ? 
                        <FixedTouchable onPress={() => setExpanded(false)}>
                            <View style={{flexDirection: 'row', marginRight: 12, alignItems: 'flex-start'}}>
                                <Entypo name='chevron-up' style={{marginRight: 1}} />
                                <Text style={{fontSize: 12, color: '#666'}}>
                                    Collapse
                                </Text>
                            </View>
                        </FixedTouchable>
                    :null} */}
                </View>
                {isRoot ? 
                    <View style={{marginTop: 8, borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth}}></View>
                : null}
                {showReplyBox ? 
                    <View style={{paddingLeft: 8, marginTop: 0, borderLeftWidth: isRoot ? null : StyleSheet.hairlineWidth, borderColor: '#ddd'}}>
                        <MessageEntryBox replyTo={messageKey} rootKey={rootKey} onCancel={() => setShowReplyBox(false)} style={{margin: 8}}/>
                    </View>
                : null}
                {/* <MessageReplies key='replies' topLevel={topLevel} messageKey={messageKey} sortedReplyKeys={sortedReplyKeys} pad /> */}
            </View>
        )
    } else {
        return (
            <View>
                <View style={{
                    backgroundColor: isRoot ? 'white' : '#f0f0f0',
                    maxWidth: isRoot ? null : 500,
                    marginTop: 8,
                    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8}}>
                    <FixedTouchable onPress={()=>setExpanded(true)}>
                        <View style={{flexDirection: 'row', marginBottom: 2, justifyContent: 'space-between'}}>
                            <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                                <MemberPhotoIcon user={message.from} photoKey={_.get(members,[message.from,'photo'])} name={authorName} size={16} />
                                <Text style={{fontWeight: '500', color: '#444', marginRight: 8, flexShrink: 0, marginLeft: 3, fontSize: 16}}>
                                    {authorName}
                                </Text>
                                <OneLineText style={{fontSize: 16, color: '#666', flex: 1}}>{obsolete ? 'out of date' : message.text}</OneLineText>
                                <Entypo name='chevron-down' size={16} color='#666' style={{flexShrink: 0}} />
                            </View>
                        </View>
                    </FixedTouchable>
                </View>
                {/* <MessageReplies key='replies' topLevel={topLevel} messageKey={messageKey} sortedReplyKeys={sortedReplyKeys} /> */}
            </View>
        )
    }
}

