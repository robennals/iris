import { Entypo } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { FixedTouchable, HeaderSpaceView, OneLineText, ScreenContentScroll, SmallMinorButton, WideButton } from '../components/basics';
import { GroupContext } from '../components/context';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { LinkText } from '../components/linktext';
import { CommunityPhotoIcon, MemberPhotoIcon } from '../components/photo';
import { setTitle, track, useCustomNavigation } from '../components/shim';
import { formatLongTimeDate, formatTime } from '../components/time';
import { baseColor } from '../data/config';
import { getCurrentUser, internalReleaseWatchers, isMasterUser, setDataAsync, useDatabase, watchData } from '../data/fbutil';
import { IntakeScreen } from './IntakeScreen';
import _ from 'lodash';
import { BottomFlatScroller } from '../components/bottomscroller';
import { ConnectedBanner } from '../components/connectedbanner';
import { PhotoPromo } from '../components/profilephoto';
import { Loading } from '../components/loading';
import { StatusBar } from 'expo-status-bar';
import { Catcher } from '../components/catcher';

export function CommunityScreenHeader({navigation, route, children}) {
    const {community} = route.params;
    const [name, setName] = useState('');
    const [photoKey, setPhotoKey] = useState(null);
    const [photoUser, setPhotoUser] = useState(null);

    useEffect(() => {
        var x = {}
        watchData(x, ['community', community, 'name'], setName, '');
        watchData(x, ['community', community, 'photoKey'], setPhotoKey);
        watchData(x, ['community', community, 'photoUser'], setPhotoUser);

        return () => internalReleaseWatchers(x);
    }, [community])

    if (name) {
        setTitle(name);
    }

    return (
        <FixedTouchable onPress={() => navigation.navigate(isMasterUser() ? 'editCommunity' : 'communityProfile', {community})}>
            <View style={{flexDirection: 'row', alignItems: 'center', padding: 8}}>
                <CommunityPhotoIcon photoKey={photoKey} photoUser={photoUser} name={name} size={28} style={{opacity: (name && photoKey) ? 1 : 0}}/>
                <View style={{marginLeft: 8}}>
                    <Text style>{name}</Text>
                </View>
            </View>
        </FixedTouchable>
    )
}


function CommunityAdminActions({community}) {
    const navigation = useCustomNavigation();
    return (
        <View style={{backgroundColor: 'white', flexDirection: 'row', justifyContent: 'center', padding: 8, borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth}}>
            <SmallMinorButton alwaysActive onPress={() => navigation.navigate('communitySignups', {community})}>Signups</SmallMinorButton>
            <SmallMinorButton alwaysActive onPress={() => navigation.navigate('communityGroups', {community})}>Groups</SmallMinorButton>
            <SmallMinorButton alwaysActive onPress={() => navigation.navigate('join', {community})}>Intake Form</SmallMinorButton>
            <SmallMinorButton alwaysActive innerStyle={{color:'white'}} style={{borderColor: baseColor, backgroundColor:baseColor}} onPress={() => navigation.navigate('newTopic', {community})}>New Topic</SmallMinorButton>
        </View>
    )
}

export function CommunityScreen({navigation, route}) {
    const {community, openTime} = route.params;
    const topics = useDatabase([community], ['topic', community]);
    const communityInfo = useDatabase([community], ['community', community]);
    const topicStates = useDatabase([community], ['commMember', community, getCurrentUser(), 'topic']);
    const localComm = useDatabase([community], ['userPrivate', getCurrentUser(), 'comm', community], false);
    const [sortedTopicKeys, setSortedTopicKeys] = useState(null);
    const [renderTime, setRenderTime] = useState(null);

    useEffect(() => {
        if (sortedTopicKeys) return;
        if (topics && topicStates && openTime !== renderTime) {
            const newSortedKeys = _.sortBy(_.keys(topics), topicKey => topicLastTime({topicKey, topics, topicStates})).reverse(); 
            setSortedTopicKeys(newSortedKeys);
            setRenderTime(openTime);
        }
    }, [topics, topicStates, openTime])

    const isMaster = isMasterUser();

    // const sortedTopicKeys = _.sortBy(_.keys(topics), topicKey => topicLastTime({topicKey, topics, topicStates}); 

    // const sortedTopicKeys = useMemo(() => _.sortBy(_.keys(topics), topicKey => topicLastTime({topicKey, topics, topicStates})), 
    // [community, topics, openTime]);    

    if (getCurrentUser() == null || (!isMaster && !localComm?.name)) {
        return (
            <IntakeScreen community={community} />
        )
    }

    if (!topicStates || !topics || !sortedTopicKeys) return <Loading />;


    return (
        <KeyboardSafeView style={{flex: 1}}>
            <StatusBar style='dark' />
            <HeaderSpaceView style={{flex:1 }}>
                <ConnectedBanner />
                <PhotoPromo />
                <View style={{backgroundColor: 'white', flex: 1}}>
                    {isMasterUser(getCurrentUser) ? 
                        <CommunityAdminActions community={community} />
                    : null}     
                    {/* {isMasterUser() ?
                        <View style={{borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd', backgroundColor: 'white'}}>
                            <WideButton alwaysActive
                                onPress={() => navigation.navigate('newTopic', {community})} 
                                style={{alignSelf: 'center', margin: 8}}>{isMaster ? 'New Topic' : 'Suggest Topic'}</WideButton>
                        </View>
                    :null} */}
                    <TopicList topics={topics} sortedTopicKeys={sortedTopicKeys} community={community} communityInfo={communityInfo} topicStates={topicStates} />
                </View>
            </HeaderSpaceView>
        </KeyboardSafeView>
      )
}

function topicLastTime({topicKey, topics, topicStates}) {
    const state = topicStates[topicKey];
    const topic = topics[topicKey];
    if (state == 'yes' || state == 'maybe') {
        return Math.max(topic?.time, topic?.lastMessage?.publishTime || 0); 
    } else {
        return topic?.time || 0;
    }
}

function TopicList({community, topics, sortedTopicKeys, communityInfo, topicStates}) {

    function renderItem(item) {
        const topicKey = item.item;
        if (topicKey == 'space' || topicKey == 'pad') {
            return <View style={{height: 16}} />;
        } else {
            return <Catcher style={{alignSelf: 'stretch'}}><Topic community={community} topicKey={topicKey} topic={topics[topicKey]} state={topicStates[topicKey]} communityInfo={communityInfo} /></Catcher>
        }
    }

    return (
        <FlatList
            style={{flex: 1, flexShrink: 1, backgroundColor: '#FCF8F4'}}
            data={['space', ...sortedTopicKeys, 'pad']}
            renderItem={renderItem} keyExtractor={k => k}
        />
    )
}


const shadowStyle = {
    shadowRadius: 2, shadowColor: '#555', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.5, elevation: 4}


function PillButton({selected, children, color = 'white', onPress}){
    return (
        <FixedTouchable onPress={onPress}>
            <View style={{borderRadius: 16, 
                borderWidth: selected ? 2 : StyleSheet.hairlineWidth, 
                borderColor: selected ? 'black' : '#ddd', 
                paddingVertical: 4, paddingHorizontal: 8, marginHorizontal: 4, backgroundColor: color}}>
                <Text>{children}</Text>
            </View>
        </FixedTouchable>
    )
}

const red = 'hsl(0, 50%, 90%)';
const green = 'hsl(120, 50%, 90%)';
const yellow = 'hsl(60, 50%, 90%)';

function Topic({community, communityInfo, topic, topicKey, state}) {
    const navgation = useCustomNavigation();
    // const topic = topics[topicKey]
    const questions = JSON.parse(topic.questions)
    const shownQuestions = questions.filter(q => q[0] != '>');
    const [expanded, setExpanded] = useState(false)

    // const state = _.get(topicStates, topicKey);

    async function setTopicState(state) {
        track('Set Topic State', {topic: topicKey, topicName: topic.name, state});
        console.log('setTopicState', community, topicKey, state);
        setExpanded(false);
        await setDataAsync(['commMember', community, getCurrentUser(), 'topic', topicKey], state);
    }

    const canEdit = topic.from == getCurrentUser() || isMasterUser();


    const condendedSummary = (topic.summary ?? '') + _.join(shownQuestions, ' ');

    return (
        <View style={{flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch'}}>
            <View style={{marginVertical: 8, marginHorizontal: 16, flex: 1, maxWidth: 450}}>
                <View style={{marginLeft: 4, marginVertical: 2}}>               
                    {topic.lastMessage ? 
                        <Text style={{fontSize: 12, color: '#666', marginLeft: 4}}>New highlight published {formatTime(topic.lastMessage.publishTime)}</Text>
                    : 
                        <Text style={{fontSize: 12, color: '#666', marginLeft: 4}}>Topic posted in {communityInfo.name} {formatTime(topic.time)}</Text>
                    }
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch'}}>
                    {/* <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} size={40} /> */}
                    <View style={{backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                            borderRadius: 8, maxWidth: 450, flexShrink: 1, flexGrow: 1, flex: 1,
                            // marginHorizontal: 8,
                            ...shadowStyle }}>
                        <View style={{padding: 8}}>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                <Text style={{fontWeight: 'bold', fontSize: 15}}>{topic.name}</Text>
                                {canEdit ? 
                                    <FixedTouchable onPress={() => navgation.navigate('editTopic', {community, topic: topicKey})}>
                                        <Entypo name='edit' color='#999' size={12}/>
                                    </FixedTouchable>
                                :null}
                            </View>
                            {expanded || !state ? 
                                <View style={{flexShrink: 1, marginTop: 4}}>
                                    <LinkText linkColor={baseColor} style={{color: '#222', marginBottom: 4}} text={topic.summary} />
                                    {shownQuestions.map(question =>
                                        <View key={question} style={{flexDirection: 'row', flexShrink: 1}}>
                                            <Text style={{color: '#666', marginRight: 4}}>{'\u2022'}</Text>
                                            <LinkText linkColor={baseColor} key={question} style={{color: '#222', marginBottom: 2}} text={question} />
                                        </View>
                                    )}                        
                                </View>
                            : 
                                <FixedTouchable onPress={() => setExpanded(true)}>
                                    <OneLineText style={{color: '#666', marginTop: 4}}>{condendedSummary}</OneLineText>
                                </FixedTouchable>
                            }
                            {state ? 
                                <FixedTouchable onPress={() => setTopicState(null)}>
                                <View style={{marginTop: 4, flexDirection: 'row', alignItems: 'center'}}>                                    
                                    <View style={{backgroundColor: colorForState(state), width: 12, height: 12, borderRadius: 6}} />
                                    <Text style={{marginLeft: 4, color: '#666', fontSize: 12}}>{stateToPhrase(state)}</Text>
                                </View>
                                </FixedTouchable>
                            : null}
                        </View>
                        {!state ? 
                            <View style={{borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth, padding: 8}}>
                                <Text style={{fontSize: 12, color: "#666"}}>Do you want to talk about this?</Text>
                                <View style={{flexDirection: 'row', marginTop: 4}}>
                                    <PillButton selected={state=='yes'} color={green} onPress={() => setTopicState('yes')}>Yes</PillButton>
                                    <PillButton selected={state=='maybe'} color={yellow} onPress={() => setTopicState('maybe')}>Maybe</PillButton>
                                    <PillButton selected={state=='no'} color={red} onPress={() => setTopicState('no')}>No</PillButton>
                                </View>                        
                            </View>
                        : null}
                        
                        <PublishedPreview topic={topic} community={community} topicKey={topicKey} />
                    </View>
                </View>
            </View>
        </View>
    )
}

function stateToPhrase(state) {
    switch(state) {
        case 'yes': return 'You want to talk about this';
        case 'no': return 'You do not want to talk about this';
        case 'maybe': return 'You could talk about this, but prefer other topics';
    }
}

function colorForState(state) {
    switch(state) {
        case 'yes': return green;
        case 'maybe': return yellow;
        case 'no': return red;
    }
}


function PublishedPreview({community, topicKey, topic, members}) {
    const navigation = useCustomNavigation();
    const extraCount = topic.publishCount -1;
    if (topic.publishCount && topic.lastMessage) {
        return (
            <FixedTouchable onPress={() => navigation.navigate('highlights', {community, topic: topicKey})}>
                <View style={{borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth, padding: 8}}>
                    {topic.publishCount > 1 ?
                    <Text style={{marginBottom: 4, color: '#666', fontSize: 14, fontWeight: 'bold'}}>View {extraCount} more {extraCount == 1 ? 'highlight' : 'highlight'}</Text>
                    : null}
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <MemberPhotoIcon size={24} user={topic.lastMessage.from} photoKey={topic.lastMessage.authorPhoto} name={topic.lastMessage.authorName} />
                        <View style={{marginLeft: 4, flexShrink: 1, backgroundColor: '#eee', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16}}>
                            <Text style={{fontWeight: 'bold', fontSize: 12}}>{topic.lastMessage.authorName}</Text>
                            <Text numberOfLines={3}>{topic.lastMessage.text}</Text>
                        </View>
                    </View>
                </View>
            </FixedTouchable>
        )    
    } else {
        return null;
    }
}
