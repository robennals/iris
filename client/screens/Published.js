import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCurrentUser, isMasterUser, setDataAsync, useDatabase } from '../data/fbutil';
import _ from 'lodash';
import { Action, andFormatStrings, FixedTouchable, memberKeysToHues, MyViewpointPreview, name_label, ScreenContentScroll, ViewpointActions } from '../components/basics';
import { MemberPhotoIcon } from '../components/photo';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { LinkText } from '../components/linktext';
import { formatMessageTime, formatSummaryTime } from '../components/time';
import { baseColor } from '../data/config';
import { Catcher } from '../components/catcher';
import { Loading } from '../components/loading';
import { useCustomNavigation } from '../components/shim';
import { Help, HelpText } from '../components/help';

export function PublishedHeader({navigation, route}) {
    const {community, topic} = route.params;
    const topicInfo = useDatabase([topic], ['topic', community, topic]);
    const communityInfo = useDatabase([community], ['community', community]);


    if (!topicInfo || !communityInfo) return null;

    return (
        <View style={{padding: 8, flexDirection: 'row', alignItems: 'center'}}>
            <Entypo name='star' color='#FABC05' size={32} style={{marginRight: 4}} />
            <View>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text>Public Viewpoints</Text>
                </View>
                <Text style={{fontSize: 12}} numberOfLines={1}>about <Text style={{fontWeight: 'bold'}}>{topicInfo.name}</Text> in <Text style={{fontWeight: 'bold'}}>{communityInfo.name}</Text></Text>
            </View>
        </View>
    )
}

function SortOption({selected, children, onPress}) {
    return (
        <FixedTouchable onPress={onPress} style={{marginHorizontal: 16, marginTop: 8}}>
            <View style={{borderBottomColor: baseColor, paddingVertical: 4, borderBottomWidth: selected ? 3 : null}}>
                <Text style={{fontWeight: 'bold', color: selected ? baseColor : '#666'}}>{children}</Text>
            </View>
        </FixedTouchable>
    )
}

function SortSelector({mode, onModeChanged}) {
    return (
        <View style={{flexDirection: 'row', paddingHorizontal: 16, borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth}}>
            <SortOption selected={mode != 'ranked'} onPress={() => onModeChanged('new')}>
                Recent
            </SortOption>
            <SortOption selected={mode == 'ranked'} onPress={() => onModeChanged('ranked')}>
                Popular
            </SortOption>
        </View>
    )
}

function rankScore(message) {
    const upCount = _.filter(_.keys(message.vote), k => message.vote[k] == 'up').length;
    const downCount = _.filter(_.keys(message.vote), k => message.vote[k] == 'down').length;
    return (upCount + 4) / (downCount + 4)
}

function HighlightsHelp() {
    return (
        <Help id='viewpoints' title='About Viewpoints'>
            <HelpText>
                Each person can write a public viewpoint, giving their personal view of the topic.
            </HelpText>
            <HelpText>
                If you think someone's viewpoint is interesting (including disagreeing with it) 
                you can say "want to discuss" and we'll match you into a private conversation
                with other people who wish to discuss the same viewpoints.
            </HelpText>
            <HelpText>
                People can change their viewpoints as a result of these private conversations.
            </HelpText>                
        </Help>
    )
}

export function PublishedScreen({navigation, route}) {
    const {community, topic} = route.params;
    const published = useDatabase([community, topic], ['published', community, topic]);
    const [sortMode, setSortMode] = useState('new');
    const myViewpoint = useDatabase([community], ['memberViewpoint', community, getCurrentUser(), topic], null);

    var sortedMessageKeys = [];
    if (sortMode == 'new') {
        sortedMessageKeys = _.sortBy(_.keys(published), k => published[k].publishTime).reverse();
    } else {
        sortedMessageKeys = _.sortBy(_.keys(published), k => rankScore(published[k])).reverse();
    }

    const authorKeys = _.uniq(_.map(sortedMessageKeys, k => published[k].from));
    const memberHues = memberKeysToHues(authorKeys);

    if (!published) return <Loading/>

    return (
        <View style={{backgroundColor: 'white', flex: 1}}>
            <SortSelector mode={sortMode} onModeChanged={setSortMode} />
            <ScrollView style={{flex: 1, padding: 16}}>
                <View style={{maxWidth: 400, marginBottom: 16, marginLeft: 48}}>
                    <HighlightsHelp />
                </View>

                {!myViewpoint ? 
                    <View style={{marginVertical: 16, marginLeft: 24, maxWidth: 450-24}}>
                        <MyViewpointPreview community={community} topicKey={topic} myViewpoint={myViewpoint} />
                    </View>
                : null}

                {sortedMessageKeys.map((k,idx) => 
                    <Catcher key={k}>
                        <PublishedMessage messageKey={k} community={community} topic={topic} message={published[k]} memberHues={memberHues} />
                    </Catcher>
                )}
                {/* <ExplainHighlights /> */}
            </ScrollView>
        </View>
    )
}


function PublishedMessage({messageKey, community, topic, message, memberHues}){
    const hue = memberHues[message.from];
    const backgroundColor = message.from == getCurrentUser() ? '#eee' : 'hsl(' + hue + ',40%, 90%)';
    const myVote = message?.vote?.[getCurrentUser()];
    const meChat = message?.chat?.[getCurrentUser()];
    const navigation = useCustomNavigation();

    async function onVote(vote) {
        const newVote = (vote == myVote) ? null : vote;
        setDataAsync(['published', community, topic, messageKey, 'vote', getCurrentUser()], newVote)
    }

    async function onChat() {
        setDataAsync(['published', community, topic, messageKey, 'chat', getCurrentUser()], meChat ? null : true)
    }

    const sortedEndorserKeys = _.sortBy(_.keys(message.endorsers || {}), k => message.endorsers[k]?.time);
    const endorserSummary = andFormatStrings(sortedEndorserKeys.map(k => message.endorsers[k].name));

    const upCount = _.filter(_.keys(message.vote), k => message.vote[k] == 'up').length;
    const upCountStr = upCount == 0 ? '' : ' (' + upCount + ')'
    return (
        <View style={{marginBottom: 16, maxWidth: 450}}>
            <View style={{flexDirection: 'row', alignItems: 'flex-start', flexShrink: 1}}>
                <FixedTouchable onPress={() => navigation.navigate('profile', {community, member: message.from})}>
                    <MemberPhotoIcon style={{marginTop: 2}} hue={hue} user={message.from} photoKey={message.authorPhoto} name={message.authorName} />
                </FixedTouchable>
                <View style={{flexShrink: 1}}>
                    <View style={{backgroundColor, marginLeft: 8, flexShrink: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8}}>
                        <View style={{flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'}}>
                            <Text style={{fontSize: 12}}>
                                <Text style={{fontWeight: 'bold', fontSize: 12}}>{message.authorName}</Text>
                                {message.endorsers ?
                                    <Text>
                                        <Text> with </Text>
                                        <Text style={{fontWeight: 'bold'}}>{endorserSummary}</Text>
                                    </Text>
                                : null}
                            </Text>
                            <Text style={{color: '#666', fontSize: 10, marginLeft: 16, flexShrink: 0}}>{formatSummaryTime(message.publishTime)}</Text>
                        </View>
                        <Text numberOfLines={10}>
                            {message.text}
                        </Text>
                        <FixedTouchable onPress={() => navigation.navigate(message.from == getCurrentUser() ? 'myViewpoint' : 'viewpoint', {community, topic, user: message.from})}>
                            <Text style={{marginTop: 4, color: baseColor}}>
                                {message.from == getCurrentUser() ? 'Edit' : 'Read more...'}</Text>
                        </FixedTouchable>    
                    </View>
                    {message.from != getCurrentUser() ?
                        <ViewpointActions community={community} topic={topic} messageKey={messageKey} published={message} viewpoint={message} />
                    : null}
                    {isMasterUser() ? 
                        <Catcher>
                            <PeopleToChat viewpoint={message} community={community} />
                        </Catcher>
                    : null}
                </View>
            </View>
        </View>    
    )
}

function PeopleToChat({viewpoint, community}) {    
    const members = useDatabase([community], ['commMember', community]);
    if (!members) return null;
    const chatterNames = _.map(_.keys(viewpoint.chat || {}), m => members[m]?.answer?.[name_label]);
    const chatStr = andFormatStrings(chatterNames);
    console.log('members', members);
    if (!viewpoint.chat) {
        return null;
    }
    return (
        <View style={{marginVertical: 4, marginLeft: 16, borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,  borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2}}>                
            <Text style={{fontSize: 12}}>{chatStr} {chatterNames.length == 1 ? 'wants' : 'want'} to discuss</Text>
        </View>
    )
}