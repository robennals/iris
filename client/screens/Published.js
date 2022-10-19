import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCurrentUser, setDataAsync, useDatabase } from '../data/fbutil';
import _ from 'lodash';
import { andFormatStrings, FixedTouchable, memberKeysToHues, ScreenContentScroll } from '../components/basics';
import { BottomFlatScroller } from '../components/shimui';
import { MemberPhotoIcon } from '../components/photo';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { LinkText } from '../components/linktext';
import { formatMessageTime, formatSummaryTime } from '../components/time';
import { baseColor } from '../data/config';
import { Catcher } from '../components/catcher';
import { Loading } from '../components/loading';

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
                    <Text>Public Summaries</Text>
                </View>
                <Text style={{fontSize: 12}}>about <Text style={{fontWeight: 'bold'}}>{topicInfo.name}</Text> in <Text style={{fontWeight: 'bold'}}>{communityInfo.name}</Text></Text>
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

export function PublishedScreen({navigation, route}) {
    const {community, topic} = route.params;
    const published = useDatabase([community, topic], ['published', community, topic]);
    const [sortMode, setSortMode] = useState('new');

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
                {sortedMessageKeys.map((k,idx) => 
                    <Catcher key={k}>
                        <PublishedMessage messageKey={k} community={community} topic={topic} message={published[k]} memberHues={memberHues} />
                    </Catcher>
                )}
                <ExplainHighlights />
            </ScrollView>
        </View>
    )
}

function Action({icon, name, pad=1, onPress}) {
    return (
        <FixedTouchable onPress={onPress} style={{marginLeft: 12}}>
            <View style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 2, paddingHorizontal: 4}}>
                <Ionicons name={icon} color='#666' />
                <Text style={{fontSize: 12, color: '#666', marginLeft: pad}}>{name}</Text>
            </View>
        </FixedTouchable>
    )
}

function ExplainHighlights() {
    return (
        <View style={{margin: 16, paddingHorizontal: 16, maxWidth: 450, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', borderRadius: 16}}>
            <Text style={{color: '#666', marginBottom: 4}}>
                A public summary is one person's attempt to summarize 
                the most important conclusions of a private group chat.
            </Text>
            {/* <Text style={{color: '#666'}}>
                At least one other person must support a summary
                in order for it to be published to the wider community.
            </Text> */}
        </View>
    )
}

function PublishedMessage({messageKey, community, topic, message, memberHues}){
    const hue = memberHues[message.from];
    const backgroundColor = message.from == getCurrentUser() ? '#eee' : 'hsl(' + hue + ',40%, 90%)';
    const myVote = message?.vote?.[getCurrentUser()];
    const meChat = message?.chat?.[getCurrentUser()];

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
                <MemberPhotoIcon style={{marginTop: 2}} hue={hue} user={message.from} photoKey={message.authorPhoto} name={message.authorName} />
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
                        {/* {message.replyToAuthorName ?
                            <View style={{paddingLeft: 8, marginVertical: 4, borderLeftColor: '#999', borderLeftWidth: StyleSheet.hairlineWidth}}>
                                <Text style={{color: '#666', fontSize: 12}}>Replying to a private message</Text>
                            </View>
                        :null} */}
                        <LinkText color='#222' text={message.text} />
                    </View>
                    {message.from != getCurrentUser() ?
                        <View style={{flexDirection: 'row'}}>
                            <Action icon={myVote == 'up' ? 'arrow-up-circle' : 'arrow-up'} 
                                name={(myVote == 'up' ? 'Upvoted' : 'Upvote') + upCountStr} 
                                onPress={() => onVote('up')}/>                
                            <Action icon={myVote == 'down' ? 'arrow-down-circle' : 'arrow-down'} 
                                name={myVote == 'down' ? 'Downvoted' : 'Downvote'} onPress={() => onVote('down')}/>                
                            <Action icon={meChat ? 'chatbox' : 'chatbox-outline'} pad={2}
                                name={meChat ? 'Want to chat' : 'Chat'} onPress={onChat} />
                        </View>
                    : null}
                </View>
            </View>
        </View>
    
    )
}
