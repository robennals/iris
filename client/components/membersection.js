import React, { useContext, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { firstLine, firstName, FixedTouchable, getFirstMatch, getIsPostVisibleToMe, getIsRootMessageVisibleToMe, getRootForMessage, MemberIcon, OneLineText, ScreenContentScroll, stripNewLines, WideButton } from '../components/basics';
import { getCurrentUser, internalReleaseWatchers, setDataAsync, updateData, updateDataAsync, watchData } from '../data/fbutil';
import _ from 'lodash';
import { baseColor, highlightColor, missingPersonName } from '../data/config';
import { Message } from '../components/message';
import { MessageEntryBox } from '../components/messageentrybox';
import { GroupContext, MemberSectionContext } from '../components/context';
import { Entypo, FontAwesome, Ionicons } from '@expo/vector-icons';
import { formatTime } from './time';
import { useNavigation } from '@react-navigation/core';
import { MemberPhotoIcon } from './photo';
import { Catcher } from './catcher';
import { useCustomNavigation } from './shim';


// function getRootsForMessages({messages, sortedMyMessageKeys}) {
//     var rootMessageCount = {};
//     var deDupedMyMessageKeys = [];
//     var messageRoots = {};
//     sortedMyMessageKeys.forEach(k => {
//         const rootKey = getRootForMessage({messages, messageKey: k});
//         if (!rootMessageCount[rootKey]) {
//             rootMessageCount[rootKey] = 0;
//             deDupedMyMessageKeys.push(k);
//         }
//         rootMessageCount[rootKey] += 1;
//         messageRoots[k] = rootKey;
//     })
//     return {rootMessageCount, deDupedMyMessageKeys, messageRoots};
// }


function TopicPreview({messageKey, message, rootKey, lastTime, subReply, readTime, topUnread, showUnread}) {
    const navigation = useCustomNavigation();
    const {isMe, prevReadTime} = useContext(MemberSectionContext);
    const {group, messages, members} = useContext(GroupContext);
    const {member} = useContext(MemberSectionContext);
    const isReply = rootKey != messageKey;

    // const message = messages[messageKey];
    // const root = messages[rootKey];
    const unread = !isMe && (message.time > readTime) && (message.time > prevReadTime); 

    const authorName = _.get(members[member],'name', missingPersonName);

    const backgroundColor = subReply ? (showUnread ? highlightColor : 'white') : null;
    
    return (
        <FixedTouchable onPress={()=>navigation.navigate('thread', {group, messageKey, rootKey})}>
            <View style={{
                backgroundColor,
                paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8}}>
                <View style={{flexDirection: 'row', marginBottom: 0, justifyContent: 'space-between'}}>
                    {subReply ?
                        <Text style={{color: '#666', fontSize: 13, flex: 1}}>
                            {firstName(authorName) + ' replied'}
                        </Text>                
                    :
                        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4, flex: 1}}>
                            <OneLineText numberOfLines={1}
                                style={{color: topUnread ? 'black' : '#444', fontSize: 16}}>
                                {isReply ? <Text style={{color: '#666', fontSize: 15, flexShrink: 0}} numberOfLines={1}>reply to </Text> : null}
                                {message.membersOnly ? 
                                    <FontAwesome name='lock' size={16} style={{marginRight: 3}}/>
                                : null}
                                <Text style={{fontWeight: 'bold', color: topUnread ? 'black' : '#444'}}>
                                    {message.title || 'No Subject'}
                                </Text>
                            </OneLineText>
                        </View>
                    }
                    <Text style={{color: '#666', paddingLeft: 8, fontSize: 12, flexShrink: 0}}>
                        {formatTime(lastTime)}
                    </Text>
                </View>
                <Text numberOfLines={unread ? 4 : 1} 
                    style={{color: topUnread ? '#222' : '#666', fontSize: 16, lineHeight: 20}}>
                    {stripNewLines(message.text)}
                </Text>
            </View>
        </FixedTouchable>
    )
}


function ReplyCount({rootKey, count, style}) {
    const navigation = useCustomNavigation();
    const {group} = useContext(GroupContext);

    if (count > 0) {
        return (
            <FixedTouchable onPress={()=>navigation.navigate('thread', {group, rootKey})}>
                <View style={{backgroundColor: 'white',
                        alignSelf: 'flex-start', 
                        marginTop: 4, marginBottom: 4, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8,
                        ...style}}>
                    <Text style={{fontSize: 12, color: '#666'}}>{count} {count == 1 ? 'reply' : 'replies'}</Text>
                </View>
            </FixedTouchable>
        )
    } else {
        return null;
    }
}


function OtherMessages({rootKey, count}){
    const navigation = useCustomNavigation();
    const {group, members} = useContext(GroupContext);
    const {member} = useContext(MemberSectionContext);
    const authorName = _.get(members[member],'name', missingPersonName);

    if (count > 1) {
        return (
            <FixedTouchable onPress={()=>navigation.navigate('thread', {group, rootKey, member})}>
                <View style={{backgroundColor: 'white',
                        alignSelf: 'flex-start', 
                        marginTop: 4, marginBottom: 4, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8}}>
                    <Text style={{fontSize: 12, color: '#666'}}>{count - 1} more by {firstName(authorName)}</Text>
                </View>
            </FixedTouchable>
        )
    } else {
        return null;
    }
}



export function MessageTreePreview({memberPosts, postKey}) {
    const {messages, members, threadReadTime} = useContext(GroupContext);
    const {member, isMe, prevReadTime} = useContext(MemberSectionContext);

    const postGroup = memberPosts[postKey];
    const lastTime = postGroup.time;
    const rootKey = postKey;

    // const message = messages[messageKey];
    // const root = messages[rootKey];

    const readTime = threadReadTime[postKey] || 0;
    const rootTime = _.get(postGroup, ['post', 'time'],0);
    const replyTime = _.get(postGroup, ['reply', 'time'],0);
    const rootUnread = !isMe && (rootTime > readTime) && (rootTime > prevReadTime); 
    const replyUnread = !isMe && (replyTime > readTime) && (replyTime > prevReadTime); 
    const mainUnread = postGroup.post ? rootUnread : replyUnread;
    // const backgroundColor = mainUnread ? highlightColor : '#f5f5f5';
    const style = {marginVertical: 8, marginHorizontal: 8, borderRadius: 16, padding: 4, 
            borderColor: '#eee'}

    if (!getIsPostVisibleToMe({members, post: postGroup.post || postGroup.reply})) {
        return ( 
            <View style={{marginHorizontal: 8, marginVertical: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16}}>
                <Text>                                    
                    <FontAwesome name='lock' size={15}/> Members Only Conversation Not Shown
                </Text>
            </View>
        )
    }

    if (postGroup.post && !postGroup.reply) {
        const backgroundColor = rootUnread ? highlightColor : '#f5f5f5';
        const borderWidth = rootUnread ? StyleSheet.hairlineWidth : null;

        return (
            <View style={{backgroundColor, borderWidth, ...style}}>
                <TopicPreview topUnread={rootUnread} message={postGroup.post} messageKey={postKey} rootKey={postKey} readTime={readTime} lastTime={lastTime} /> 
                <ReplyCount rootKey={rootKey} style={{marginLeft: 8, marginBottom: 4}} count={postGroup.replyCount} />
            </View>
        )
    } else if (!postGroup.post && postGroup.reply) {
        const backgroundColor = replyUnread ? highlightColor : '#f5f5f5';
        const borderWidth = replyUnread ? StyleSheet.hairlineWidth : null;

        return (
            <View style={{backgroundColor, borderWidth, ...style}}>
                <TopicPreview topUnread={replyUnread} message={postGroup.reply} messageKey={postGroup.reply.key} rootKey={postKey} readTime={readTime} lastTime={lastTime} /> 
                <View style={{marginLeft: 8, marginBottom: 4}}>
                    <OtherMessages rootKey={rootKey} count={postGroup.moreCount} />
                </View>
            </View>
        )
    } else {
        const backgroundColor = rootUnread ? highlightColor : '#f5f5f5';
        const borderWidth = rootUnread ? StyleSheet.hairlineWidth : null;

        return (
            <View style={{backgroundColor, borderWidth, ...style}}>
                <TopicPreview topUnread={rootUnread} message={postGroup.post} messageKey={postKey} rootKey={postKey} readTime={readTime} lastTime={lastTime} />
                <View style={{margin: 4, paddingLeft: 8}}>
                    <TopicPreview subReply message={postGroup.reply} showUnread={replyUnread && !rootUnread} topUnread={rootUnread} messageKey={postGroup.reply.key} rootKey={rootKey} readTime={readTime} lastTime={lastTime} />                    
                    <OtherMessages rootKey={rootKey} count={postGroup.moreCount} />
                </View>
            </View>
        )
    }
}

function PersonBadge({children}) {
    return (
        <View style={{borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4, paddingTop: 1, paddingBottom: Platform.OS == 'web' ? 2 : 1, alignSelf: 'center', 
                marginLeft: 4, borderRadius: 4}}>
            <Text style={{fontSize: 11, color: '#666'}}>{children}</Text>
        </View>
    )
}

function getIsMessageVisibleToMe({messages, members, messageKey, messageRoots}) {
    const rootKey = messageRoots[messageKey];
    return getIsRootMessageVisibleToMe({messages, members, rootKey});
}

function MemberMessages({member, memberPosts, shownCount}) {
    const sortedPostKeys = _.sortBy(_.keys(memberPosts), p => memberPosts[p].time).reverse();
    const shownPostKeys = _.slice(sortedPostKeys, 0, shownCount);

    return (
        <View style={{marginVertical: 8}}>
            {shownPostKeys.map(p =>
                <Catcher key={p}>
                    <MessageTreePreview memberPosts={memberPosts} postKey={p} />
                </Catcher>
            )}
        </View>
    )
}

export function MemberSection({member, lastReadTime}) {
    const {group, members, threadReadTime, blocks} = useContext(GroupContext);
    const [expanded, setExpanded] = useState(false);
    const [expandTime, setExpandTime] = useState(0);
    const [shownCount, setShownCount] = useState(4);
    const [memberPosts, setMemberPosts] = useState({});
    const [prevReadTime, setPrevReadTime] = useState(0);
    const navigation = useCustomNavigation();
    const isMe = member == getCurrentUser();

    const iBlocked = _.get(blocks, [getCurrentUser(), member], false);
    const theyBlocked = _.get(blocks, [member, getCurrentUser()], false);

    useEffect(() => {
        var x = {};
        watchData(x, ['group', group, 'memberMsg', member], setMemberPosts);
        return () => internalReleaseWatchers(x);        
    }, [group, member])

    // const allMyMessageKeys = byAuthor[member] || [];
    // const notObsoleteKeys = _.filter(allMyMessageKeys, k => isMe || !messages[k].obsolete);
    // const sortedMyMessageKeys = _.sortBy(notObsoleteKeys, k => messages[k].time).reverse();
    // const {rootMessageCount, deDupedMyMessageKeys, messageRoots} = getRootsForMessages({messages, sortedMyMessageKeys});
    // const messageKeys = _.slice(deDupedMyMessageKeys, 0, shownCount);

    // const lastMyMessageKey = getFirstMatch(sortedMyMessageKeys, messageKey => getIsMessageVisibleToMe({messages, members, messageKey, messageRoots}));
    // const lastMyMessage = messages[lastMyMessageKey];

    // const maxCount = allMyMessageKeys.length;
    const memberName = (member == 'highlight') ? 'Highlights' : _.get(members,[member,'name'], 'No Longer in Group');
    // const unreadKeys = _.filter(deDupedMyMessageKeys, k => _.get(threadReadTime,messageRoots[k],0) < messages[k].time);
    // const sortedUnreadKeys = _.sortBy(unreadKeys, k => messages[k].time).reverse();
    // const lastVisibleMessageKey = getFirstMatch(sortedUnreadKeys, messageKey => getIsMessageVisibleToMe({messages, members, messageKey, messageRoots}));
    // const lastUnreadMessage = messages[lastVisibleMessageKey];
    // const lastUnreadMessageTime = _.get(lastUnreadMessage, 'time', 0);
    // const lastRoot = lastMyMessageKey ? getRootForMessage({messages, messageKey: lastMyMessageKey}) : null;
    // const lastRootTitle = _.get(messages, [lastRoot, 'title'], '');
    // const rePrefix = (lastRoot != lastMyMessageKey) ? <Entypo name='reply' /> : null;

    // const summaryLine = firstLine(lastRootTitle + ': ' + _.get(lastMyMessage, 'text', ''));
    // const lastMessageTime = _.get(lastMyMessage, 'time', 0);
    const unreadPostKeys = _.filter(_.keys(memberPosts || {}), p => memberPosts[p].time > (Math.max(threadReadTime[p] || 0, lastReadTime || 0)));
    const unread = !isMe && unreadPostKeys.length > 0;
    // console.log(memberName, {unread, unreadPostKeys, memberPosts});
    const lastMessage = _.get(members, [member, 'lastMessage'], {});
    const rePrefix = lastMessage.isReply ? <Entypo name='reply' /> : null;
    var summaryLine = lastMessage.title ? firstLine(lastMessage.title + ': ' + lastMessage.text) : '';
    if (!getIsPostVisibleToMe({members, post:lastMessage})) {
        summaryLine = 'Members only conversation'
    }
    if (iBlocked) {
        summaryLine = 'You blocked this user'
    } else if (theyBlocked) {
        summaryLine = 'This user has blocked you'
    }

    const rootMessageCount = memberPosts ? _.keys(memberPosts).length : 0;
    const lastMessageTime = lastMessage.time;
    // const unread = !isMe && (lastUnreadMessageTime > (lastReadTime || 0));

    return (
        <MemberSectionContext.Provider value={{member, isMe, expandTime, prevReadTime, rootMessageCount}} >
            <View style={styles.memberSection}>
                <FixedTouchable     
                        onPress={()=>{
                            setExpanded(!expanded); 
                            setShownCount(4);
                            setExpandTime(Date.now());
                            setPrevReadTime(lastReadTime);
                            setDataAsync(['userPrivate', getCurrentUser(), 'group', group, 'readTime'], Date.now());
                            setDataAsync(['userPrivate', getCurrentUser(), 'readTime', group, member], Date.now());
                            setDataAsync(['userPrivate', getCurrentUser(), 'lastAction'], Date.now())
                        }}>
                    <View style={{flexDirection: 'row', justifyContent: 'flex-start'}}>
                        <MemberPhotoIcon name={memberName} user={member} photoKey={_.get(members,[member,'photo'])} />
                        <View style={{flex: 1, marginLeft: 2, justifyContent: 'flex-start'}}>
                            <View style={styles.memberPreviewRight}>
                                <View style={{flexDirection: 'row'}}>                            
                                    <Text style={[styles.memberSectionTitle, {marginRight: 4, fontWeight: unread ? 'bold' : null}]}>{memberName}</Text>
                                    {_.get(members,[member,'role']) == 'admin' ? <PersonBadge>Admin</PersonBadge> : null}
                                    {isMe ? <PersonBadge color='#999'>You</PersonBadge> : null}
                                </View>
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>  
                                    {!expanded ?                                  
                                        <Text style={{fontSize: 12, color: '#666', flexShrink: 0}}>
                                            {formatTime(lastMessageTime)}
                                        </Text>
                                    : null}
                                    {expanded ? 
                                    <Entypo size={16} color='#666' name={expanded ? 'chevron-up' : 'chevron-down'} />
                                    : null}
                                </View>
                            </View>
                            {!expanded || iBlocked || theyBlocked ? 
                                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 4}}>
                                    <OneLineText ellipsizeMode='tail' 
                                        style={{color: '#666', marginLeft: 8, flexShrink: 1, fontWeight: unread ? 'bold' : null}}>{rePrefix}{summaryLine}</OneLineText>
                                </View>
                            : null
                            }
                        </View>
                    </View>
                </FixedTouchable>
                {expanded && isMe ? 
                    <View style={{alignSelf: 'flex-end'}}>
                        <FixedTouchable onPress={()=>navigation.navigate('messagebox', {group})}>
                            <View style={{flexDirection: 'row', alignItems: 'center', 
                                    backgroundColor: baseColor, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginRight: 8}}>
                                <Entypo name='new-message' size={16} style={{color: 'white', marginRight: 5, marginTop: Platform.OS == 'web' ? 2 : 0}}/> 
                                <Text style={{fontSize: 15, color: 'white', fontWeight: 'bold'}}>New Post</Text>
                            </View>                        
                        </FixedTouchable>                
                    </View>
                : null}
                {expanded && !iBlocked && !theyBlocked ? 
                    <MemberMessages member={member} memberPosts={memberPosts} shownCount={shownCount} />
                : null}
                {expanded ? 
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 8, marginVertical: 4}}>
                        {rootMessageCount > shownCount && !iBlocked && !theyBlocked ? 
                            <FixedTouchable onPress={() => setShownCount(shownCount + 4)}>
                                <View style={{alignSelf: 'flex-start', borderWidth: StyleSheet.hairlineWidth, borderColor: baseColor, paddingVertical: 3, paddingHorizontal: 6}}>
                                    <Text style={{color: baseColor}}>Show more</Text>
                                </View>
                            </FixedTouchable>                     
                        : <View></View>}
                        {member == 'highlight' ? null :
                            <FixedTouchable onPress={() => navigation.navigate('profile', {group, member})}>
                                <Entypo size={16} name='info-with-circle' color='#666'/>
                            </FixedTouchable>
                        }
                    </View>
                :null}
            </View>
        </MemberSectionContext.Provider>
    )
}
const styles = StyleSheet.create({
    memberSection: {
        maxWidth: 600, marginHorizontal: 8, padding: 8, marginVertical: 4, backgroundColor: 'white',
        // flexDirection: 'row',    
        borderColor: '#ddd', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
        shadowRadius: 1, shadowOpacity: 0.5, shadowColor: '#555', shadowOffset: {width: 0, height: 1},
    },
    memberSectionTitle: {
        fontSize: 16,       
    },
    memberPreviewRight: {
        marginLeft: 8,
        marginBottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignSelf: 'stretch',
        alignItems: 'flex-start',
    },

  });
  