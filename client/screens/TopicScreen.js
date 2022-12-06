import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCurrentUser, isMasterUser, setDataAsync, useDatabase } from '../data/fbutil';
import _ from 'lodash';
import { Action, andFormatStrings, FixedTouchable, memberKeysToHues, MyViewpointPreview, name_label, ScreenContentScroll, ViewpointActions, WideButton } from '../components/basics';
import { CommunityPhotoIcon, MemberPhotoIcon } from '../components/photo';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { LinkText } from '../components/linktext';
import { formatMessageTime, formatSummaryTime, formatTime } from '../components/time';
import { baseColor } from '../data/config';
import { Catcher } from '../components/catcher';
import { Loading } from '../components/loading';
import { useCustomNavigation } from '../components/shim';
import { Help, HelpText } from '../components/help';
import { editTopicAsync } from '../data/servercall';


const lightShadowStyle = {
    shadowRadius: 2, shadowColor: '#555', shadowOffset: {width: 0, height: 1},
        // borderColor: '#ddd', borderWidth: 2,
    shadowOpacity: 0.5, elevation: 2}
    

export function TopicScreenHeader({navigation, route}) {
    const {community, topic} = route.params;
    const topicInfo = useDatabase([topic], ['topic', community, topic]);
    const communityInfo = useDatabase([community], ['community', community]);

    if (!topicInfo || !communityInfo) return null;

    return (
        <View style={{padding: 8, flexDirection: 'row', alignItems: 'center'}}>
            <View>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} name={communityInfo.name} size={12}/>
                    <Text style={{fontSize: 12, marginLeft: 2}}>{communityInfo.name}</Text>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text>{topicInfo.name}</Text>
                </View>
            </View>
        </View>
    )
}

function TopicGroupPreview({topicGroup, topicGroupKey, community, topicKey}) {
    const canEdit = topicGroupKey == getCurrentUser();
    const navigation = useCustomNavigation();

    return (
        <View style={{borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', marginVertical: 8, ...lightShadowStyle, borderRadius: 4, padding: 8}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'top'}}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>                
                    <FixedTouchable onPress={() => navigation.navigate('profile', {community, member: topicGroupKey})}>
                        <MemberPhotoIcon user={topicGroupKey} photoKey={topicGroup.fromPhoto} name={topicGroup.fromName} size={24} />
                    </FixedTouchable>
                    <Text style={{marginLeft: 6}}>Hosted by <Text style={{fontWeight: 'bold'}}>{topicGroup.fromName}</Text></Text>
                </View>
                {canEdit ? 
                    <FixedTouchable onPress={() => navigation.navigate('myTopicGroup', {community, topic: topicKey})}>
                        <Entypo name='edit' color='#999' size={12}/>
                    </FixedTouchable>
                :null}
            </View>
            <Text style={{marginTop: 8, color: '#666'}} numberOfLines={8}>{topicGroup.text}</Text>
        </View>
    )
    return <Text>Topic Group Preview</Text>
}

function TopicGroups({community, topicGroups, topic, topicKey}) {
    const groupKeys = _.keys(topicGroups || {});
    const sortedGroupKeys = _.sortBy(groupKeys, k => topicGroups[k].time).reverse();
    const navigation = useCustomNavigation();

    return (
        <View style={{borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd', maxWidth: 450, flex: 1}}>
            <Text style={{fontSize: 15, fontWeight: 'bold', marginTop: 16, marginBottom: 4}}>Conversations</Text>
            {sortedGroupKeys.map(k => 
                <TopicGroupPreview key={k} topicGroup={topicGroups[k]} topicGroupKey={k} community={community} topicKey={topicKey} />
            )}
            {!topicGroups[getCurrentUser()] ?
                <WideButton alwaysActive onPress={() => navigation.navigate('myTopicGroup', {community, topic:topicKey})}>Create Conversation</WideButton>
            : null}
        </View>
    )
}

function Topic({community, topicKey, topic}) {

    const questions = JSON.parse(topic.questions)
    const shownQuestions = questions.filter(q => q[0] != '>');
    const canEdit = topic.from == getCurrentUser() || isMasterUser();
    const navigation = useCustomNavigation();

    async function onApprove() {
        await editTopicAsync({community, topic: topicKey, name: topic.name, questions: topic.questions, summary: topic.summary});
    }


    return (
            <View style={{padding: 8}}>
                <FixedTouchable onPress={() => navigation.navigate('profile', {community, member: topic.from})}>
                    <View style={{flexDirection: 'row', marginBottom: 8}}>
                        {/* <MemberPhotoIcon photoKey={topic.fromPhoto} user={topic.from} name={topic.fromName} size={16} /> */}
                        <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
                            <Text style={{fontSize: 12, color: '#666'}}>Topic added by </Text>
                            <Text style={{fontSize: 12, color: '#666', textDecorationLine: 'underline'}}>{topic.fromName}</Text>
                            <Text style={{fontSize: 12, color: '#666'}}> - {formatTime(topic.time)}</Text>
                        </View>
                    </View>
                </FixedTouchable>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={{fontWeight: 'bold', fontSize: 24}}>{topic.name}</Text>
                    {canEdit ? 
                        <FixedTouchable onPress={() => navigation.navigate('editTopic', {community, topic: topicKey})}>
                            <Entypo name='edit' color='#999' size={12}/>
                        </FixedTouchable>
                    :null}
                </View>
                <View style={{flexShrink: 1, marginTop: 8, marginRight: 8}}>
                    {/* <LinkText linkColor={baseColor} style={{color: '#222', marginBottom: 4}} text={topic.summary} /> */}
                    {topic.summary ? 
                        <Text style={{color: '#666', marginBottom: 4}}>{topic.summary}</Text>
                    : null}
                    {shownQuestions.map(question => 
                        <View key={question} style={{flexDirection: 'row', flexShrink: 1}}>
                            <Text style={{color: '#666', marginRight: 4}}>{'\u2022'}</Text>
                            <Text linkColor={baseColor} style={{color: '#666', marginBottom: 4}}>{question}</Text>
                        </View>                        
                    )}
                </View>
                {topic.approved === false && isMasterUser() ? 
                    <View style={{borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth, padding: 8}}>
                        <Text style={{fontSize: 12, color: "#666", alignSelf: 'center', marginBottom: 8}}>Do you want to approve this topic?</Text>
                        <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                            <WideButton onPress={onApprove} style={{margin: 0}}>Approve</WideButton>                              
                        </View>  
                    </View>    
                : null}
            </View>
    )
}

export function TopicScreen({navigation, route}) {
    const {community, topic: topicKey} = route.params;
    const topic = useDatabase([community, topicKey], ['topic', community, topicKey]);
    const topicGroups = useDatabase([topicKey], ['topicGroup', community, topicKey]);

    if (!topic || !topicGroups) return <Loading/>

    console.log('topic', community, topic, topic);

    return (
        <ScreenContentScroll>
            <View style={{flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch'}}>
                <View style={{maxWidth: 450, flex: 1}}>
                    <Topic topicKey={topicKey} topic={topic} community={community} />
                    <TopicGroups topicGroups={topicGroups} topicKey={topicKey} topic={topic} community={community} />
                </View>
            </View>
        </ScreenContentScroll>
    )
}
