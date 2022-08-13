import React, { useContext, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { firstLine, firstName, FixedTouchable, FormTitle, getFirstMatch, getIsRootMessageVisibleToMe, getRootForMessage, MemberIcon, OneLineText, ScreenContentScroll, stripNewLines, WideButton } from '../components/basics';
import { getCurrentUser, internalReleaseWatchers, setDataAsync, updateData, updateDataAsync, watchData } from '../data/fbutil';
import _ from 'lodash';
import { baseColor, highlightColor, missingPersonName } from '../data/config';
import { Message } from '../components/message';
import { MessageEntryBox } from '../components/messageentrybox';
import { GroupContext, MemberSectionContext } from '../components/context';
import { Entypo, FontAwesome, Ionicons } from '@expo/vector-icons';
import { formatTime } from './time';
import { useNavigation } from '@react-navigation/core';
import { GroupPhotoIcon, MemberPhotoIcon } from './photo';
import { Catcher } from './catcher';
import { NavigationContainer } from '@react-navigation/native';
import { joinGroupAsync, postMessageAsync } from '../data/servercall';
import { useCustomNavigation } from './shim';

function SubgroupMessage({messageKey, group, subgroup, messages, prevReadTime, myGroup}) {
    const message = messages[messageKey];
    const unread = (prevReadTime || 0) < message.time;
    const backgroundColor = unread ? highlightColor : '#f5f5f5';
    const navigation = useCustomNavigation();

    function gotoPost() {
        if (myGroup) {
            navigation.navigate('thread', {group: subgroup, rootKey: messageKey, messageKey});
        } else {
            navigation.navigate('outsiderThread', {group, subgroup, rootKey: messageKey});
        }
    }

    return (
        <View style={{marginHorizontal: 8, marginVertical: 8}}>
            <FixedTouchable onPress={() => gotoPost()}>
                <View style={{backgroundColor, 
                    borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', borderRadius: 16,
                    paddingHorizontal: 12, paddingVertical: 8
                }}>
                    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flex: 1}}>
                        <OneLineText style={{fontSize: 16, fontWeight: 'bold', color: unread ? 'black' : '#444', flex: 1}}>
                            <Text>{message.title}</Text>
                        </OneLineText>
                        <Text style={{color: '#666', paddingLeft: 8, fontSize: 12, flexShrink: 0}}>
                            {formatTime(message.time)}
                        </Text>
                    </View>
                    <Text numberOfLines={unread ? 4 : 1} 
                        style={{color: unread ? '#222' : '#666', fontSize: 16, lineHeight: 20}}>
                        {stripNewLines(message.text)}
                    </Text>
                </View>
            </FixedTouchable>
        </View>
    )
}

function removeCommonSuffix({subgroupName, parentName}) {
    const parts = subgroupName.split('-');
    const parentParts = parentName.split('-');
    if (parts[1] && parts[1].trim() == parentName.trim()) {
        return parts[0];
    } else if ((parts[1] && parts[1].trim()) == (parentParts[1] && parentParts[1].trim())) {
        return parts[0];
    } else {
        return subgroupName;
    }
}

export function SubgroupSection({subgroup, lastReadTime}) {
    const {group, members, meName, groupName, subgroups} = useContext(GroupContext);
    const subinfo = subgroups[subgroup];
    const name = subinfo.name;
    const [expanded, setExpanded] = useState(false);
    const [messages, setMessages] = useState(null);
    const [myGroup, setMyGroup] = useState(null);
    const [threadReadTime, setThreadReadTime] = useState(null);
    const [prevReadTime, setPrevReadTime] = useState(0);
    const [shownCount, setShownCount] = useState(4);
    const navigation = useCustomNavigation();

    useEffect(() => {
        var x = {};
        watchData(x, ['group', group, 'submsg', subgroup], setMessages);
        watchData(x, ['userPrivate', getCurrentUser(), 'threadReadTime', subgroup], setThreadReadTime);
        watchData(x, ['userPrivate', getCurrentUser(), 'group', subgroup], setMyGroup, null);
        return () => internalReleaseWatchers(x);
    },[subgroup]);

    const sortedMessageKeys = _.sortBy(_.keys(messages || null), k => messages[k].time).reverse();
    const shownMessageKeys = sortedMessageKeys.slice(0, shownCount);
    // const lastMessage = messages && messages[sortedMessageKeys[0]];
    const summaryLine = subinfo.lastMessage ? firstLine(subinfo.lastMessage.title + ': ' + subinfo.lastMessage.text) : '';

    const unread = Math.max(lastReadTime || 0, _.get(myGroup, 'readTime', 0)) < subinfo.time;

    async function visitGroup() {
        await joinGroupAsync({group: subgroup, memberName: meName, photoKey: members[getCurrentUser()].photo});
        await postMessageAsync({group: subgroup, type: 'join', title: meName + ' arrived', text: 'Use this thread to say hello'})
        navigation.replace('group', {group: subgroup});
    }

    const strippedName = removeCommonSuffix({subgroupName: subinfo.name, parentName: groupName});

    return (
        <View style={styles.subgroupSection}>
            <FixedTouchable onPress={() => {
                setExpanded(!expanded)
                setShownCount(4);
                setPrevReadTime(lastReadTime);
                setDataAsync(['userPrivate', getCurrentUser(), 'readTime', group, subgroup], Date.now());
                setDataAsync(['userPrivate', getCurrentUser(), 'lastAction'], Date.now());
            }}>
                <View style={{flexDirection: 'row', justifyContent: 'flex-start'}}>
                    <GroupPhotoIcon name={name} size={40} photo={subgroups[subgroup].photo} />
                    <View style={{flex: 1, marginLeft: 2, justifyContent: 'flex-start'}}>
                        <View style={styles.subgroupPreviewRight}>
                            <Text style={[styles.subgroupSectionTitle, {fontWeight: unread ? 'bold' : null}]}>
                                {strippedName}
                            </Text>
                            {!expanded ?                                  
                                <Text style={{fontSize: 12, color: '#666', flexShrink: 0}}>
                                    {formatTime(subgroups[subgroup].time)}
                                </Text>
                            : null}
                            {expanded ? 
                                <Entypo size={16} color='#666' name='chevron-up'/>
                            : null}
                        </View>
                        {!expanded ?
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 4}}>
                                <OneLineText ellipsizeMode='tail' 
                                    style={{color: '#666', marginLeft: 8, flexShrink: 1, fontWeight: unread ? 'bold' : null}}>{summaryLine}
                                </OneLineText>
                            </View>
                        :null}
                    </View>
                </View>
            </FixedTouchable>
            {expanded ?
                shownMessageKeys.map(k => 
                    <Catcher key={k}>
                        <SubgroupMessage messageKey={k} messages={messages} group={group} subgroup={subgroup} threadTime={threadReadTime[k]} prevReadTime={prevReadTime} myGroup={myGroup} />
                    </Catcher>
                )
            : null}
            {expanded ? 
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 16}}>
                    {sortedMessageKeys.length > shownCount ? 
                        <FixedTouchable onPress={() => setShownCount(shownCount + 10)}>
                            <View style={{alignSelf: 'flex-start', borderWidth: StyleSheet.hairlineWidth, borderColor: baseColor, paddingVertical: 3, paddingHorizontal: 6}}>
                                <Text style={{color: baseColor}}>Show more</Text>
                            </View>
                        </FixedTouchable>                     
                    : <View/>}
                    {myGroup ? 
                        <WideButton style={{margin: 0}} onPress={() => navigation.replace('group', {group:subgroup})} progressText='Processing...'>Go to Group</WideButton>
                    :
                        <WideButton style={{margin: 0}} onPress={visitGroup} progressText='Processing...'>Visit Group</WideButton>
                    }
                </View>
            : null}
        </View>
    )
}

const styles = StyleSheet.create({
    subgroupSection: {
        maxWidth: 600, marginHorizontal: 8, padding: 8, marginVertical: 4, backgroundColor: 'white',
        // flexDirection: 'row',    
        borderColor: '#ddd', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
        shadowRadius: 1, shadowOpacity: 0.5, shadowColor: '#555', shadowOffset: {width: 0, height: 1},
    },
    subgroupSectionTitle: {
        fontSize: 16,       
    },
    subgroupPreviewRight: {
        marginLeft: 8,
        marginBottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignSelf: 'stretch',
        alignItems: 'flex-start',
    },

  });
  