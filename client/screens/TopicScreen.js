import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCurrentUser, isMasterUser, setDataAsync, useDatabase } from '../data/fbutil';
import _ from 'lodash';
import { Action, andFormatStrings, FixedTouchable, memberKeysToHues, MyViewpointPreview, name_label, ScreenContentScroll, ViewpointActions, WideButton } from '../components/basics';
import { CommunityPhotoIcon, MemberPhotoIcon } from '../components/photo';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { LinkText } from '../components/linktext';
import { formatMessageTime, formatSummaryTime, formatTime } from '../components/time';
import { baseColor } from '../data/config';
import { Catcher } from '../components/catcher';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { Loading } from '../components/loading';
import { useCustomNavigation } from '../components/shim';
import { Help, HelpText } from '../components/help';
import { askToJoinAsync, editTopicAsync } from '../data/servercall';


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

function AskToJoin({community, topicKey, topicGroupKey}) {
    const [expanded, setExpanded] = useState(false);
    const [text, setText] = useState('');
    const [inProgress, setInProgress] = useState(false);
    
    async function onSubmit(){
        setInProgress(true);
        await askToJoinAsync({community, topic: topicKey, host: topicGroupKey, text}); 
    }
    
    if (expanded) {
        return (
            <View>
                <View style={{borderRadius: 16, borderColor: '#ddd', marginBottom: 4,  
                borderWidth: StyleSheet.hairlineWidth, justifyContent: 'space-between', marginTop: 16}}>
                    <TextInput autoFocus style={{padding: 8, height: 100, borderRadius: 16}}
                        placeholder='Write a message to the host'
                        placeholderTextColor='#999'
                        value={text}
                        multiline                    
                        onChangeText={setText}
                    />
                </View>
                {inProgress ? 
                    <Text style={{color: '#666', alignSelf: 'flex-end', marginRight: 16}}>Submitting...</Text>
                : 
                    <View style={{flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center'}}>
                        <FixedTouchable onPress={() => setExpanded(false)}>
                            <Text style={{color: '#666', marginRight: 16}}>Cancel</Text>
                        </FixedTouchable>
                        <FixedTouchable onPress={onSubmit}>
                            <View style={{backgroundColor: baseColor, borderRadius: 16, alignSelf: 'flex-end'}}>
                                <Text style={{color: 'white', paddingHorizontal: 8, paddingVertical: 4}}>Ask to Join</Text>
                            </View>
                        </FixedTouchable>
                    </View>
                }
            </View>

        )
    } else {
        return (
            <FixedTouchable onPress={() => setExpanded(true)}>
                <View style={{flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderColor: '#ddd', 
                        borderWidth: StyleSheet.hairlineWidth, justifyContent: 'space-between', marginTop: 16}}>
                    <Text style={{flex: 1, marginHorizontal: 8, color: '#999'}}>
                        Write a message to the host
                    </Text>
                    <View style={{backgroundColor: baseColor, borderRadius: 16}}>
                        <Text style={{color: 'white', paddingHorizontal: 8, paddingVertical: 4}}>Ask to Join</Text>
                    </View>
                </View>
            </FixedTouchable>
        )
    }
}


function GroupJoinWidget({youAsked, topicGroup, topicGroupKey, community, topicKey}) {
    const navigation = useCustomNavigation();
    if (topicGroup?.members?.[getCurrentUser()]) {
        return (
            <FixedTouchable onPress={() => navigation.navigate('group', {group: topicGroup.group})}>
                <Text style={{color: '#666', textDecorationLine: 'underline'}}>Go to conversation</Text>
            </FixedTouchable>
        )
    } else if (youAsked) {
        return <Text style={{fontWeight: 'bold'}}>You asked to join</Text>
    } else if (topicGroupKey == getCurrentUser()) {
        return <Text style={{color: '#666', borderTopColor: '#ddd', 
                    borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 8}}>
                    Waiting for join requests
                </Text>
    } else {
        return <AskToJoin community={community} topicKey={topicKey} topicGroupKey={topicGroupKey}/>
    }
}

function TopicGroupMembers({topicGroup, topicGroupKey}) {
    const members = topicGroup.member;
    if (!members || _.keys(members).length < 2) {
        return null;
    }
    const memberKeys = _.keys(members);
    const names = andFormatStrings(_.map(memberKeys, k => members[k].name));
    return (
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4, 
            borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 16}}>
            {_.map(_.keys(members), m => 
                <MemberPhotoIcon user={m} photoKey={members[m].photo} name={members[m].name} size={24} />
            )}
            <Text style={{marginLeft: 8, fontSize: 13, flexShrink: 1, color: '#666'}}>{names} are talking</Text>
        </View>
    )

}

function TopicGroupPreview({topicGroup, topicGroupKey, community, topicKey, youAsked}) {
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
            {/* <View style={{borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 8}}> */}
                <TopicGroupMembers topicGroup={topicGroup} topicGroupKey={topicGroupKey} />
                <GroupJoinWidget youAsked={youAsked} topicGroup={topicGroup} topicGroupKey={topicGroupKey} 
                    community={community} topicKey={topicKey} />
            {/* </View> */}
            {/* {youAsked ? 
                <Text style={{fontWeight: 'bold', marginTop: 8}}>You asked to join</Text>
            :
                <AskToJoin community={community} topicKey={topicKey} topicGroupKey={topicGroupKey}/>
            } */}
        </View>
    )
}

function TopicGroups({community, topicGroups, topic, topicKey, youAsked}) {
    const groupKeys = _.keys(topicGroups || {});
    const sortedGroupKeys = _.sortBy(groupKeys, k => topicGroups[k].time).reverse();
    const navigation = useCustomNavigation();

    return (
        <View style={{borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd', maxWidth: 450, flex: 1}}>
            <Text style={{fontSize: 15, fontWeight: 'bold', marginTop: 16, marginBottom: 4}}>Conversations</Text>
            {sortedGroupKeys.map(k => 
                <TopicGroupPreview key={k} topicGroup={topicGroups[k]} topicGroupKey={k} 
                    community={community} topicKey={topicKey} 
                    youAsked={youAsked[k]} />
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
    const youAsked = useDatabase([community, topicKey], ['userPrivate', getCurrentUser(), 'youAsked', community, topicKey]);

    if (!topic || !topicGroups || !youAsked) return <Loading/>

    // console.log('topic', community, topic, topic);
    console.log('youAsked', youAsked);

    return (
        <KeyboardSafeView>
            <ScreenContentScroll>
                <View style={{flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch'}}>
                    <View style={{maxWidth: 450, flex: 1}}>
                        <Topic topicKey={topicKey} topic={topic} community={community} />
                        <TopicGroups topicGroups={topicGroups} topicKey={topicKey} topic={topic} community={community} youAsked={youAsked}/>
                    </View>
                </View>
            </ScreenContentScroll>
        </KeyboardSafeView>
    )
}
