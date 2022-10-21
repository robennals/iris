import { Entypo } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
            <SmallMinorButton alwaysActive style={{alignSelf: 'flex-start'}} onPress={() => navigation.navigate('communitySignups', {community})}>Signups</SmallMinorButton>
            <SmallMinorButton alwaysActive style={{alignSelf: 'flex-start'}} onPress={() => navigation.navigate('communityGroups', {community})}>Groups</SmallMinorButton>
            <SmallMinorButton alwaysActive style={{alignSelf: 'flex-start'}} onPress={() => navigation.navigate('join', {community})}>Intake Form</SmallMinorButton>
        </View>
    )
}

export function CommunityScreen({navigation, route}) {
    const {community} = route.params;
    const [role, setRole] = useState(null);
    const [topics, setTopics] = useState(null);
    const [communityInfo, setCommunityInfo] = useState(null);
    const [topicStates, setTopicStates] = useState(null);
    const localComm = useDatabase([community], ['userPrivate', getCurrentUser(), 'comm', community], false);

    useEffect(() => {
        var x = {};
        watchData(x, ['userPrivate', getCurrentUser(), 'community', community, 'role'], setRole, false)
        watchData(x, ['community', community], setCommunityInfo);
        watchData(x, ['topic', community], setTopics);
        watchData(x, ['commMember', community, getCurrentUser(), 'topic'], setTopicStates);
    }, [community])

    const isMaster = isMasterUser();

    if (getCurrentUser() == null || (!isMaster && !localComm?.name)) {
        return (
            <IntakeScreen community={community} />
        )
    }

    if (!topicStates || !topics) return <Loading />;

    // if (role == false && !isMasterUser()) {
    //     return (
    //         <IntakeScreen community={community} />
    //     )
    // }

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
                    <TopicList topics={topics} community={community} communityInfo={communityInfo} topicStates={topicStates} />
                    {isMasterUser() ?
                        <View style={{borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd', backgroundColor: 'white'}}>
                            <WideButton alwaysActive
                                onPress={() => navigation.navigate('newTopic', {community})} 
                                style={{alignSelf: 'center', margin: 8}}>{isMaster ? 'New Topic' : 'Suggest Topic'}</WideButton>
                        </View>
                    :null}
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

function TopicList({community, topics, communityInfo, topicStates}) {
    const sortedTopicKeys = _.sortBy(_.keys(topics), topicKey => topicLastTime({topicKey, topics, topicStates}));
    return (
        <BottomFlatScroller
            style={{flex: 1, flexShrink: 1}}
            data={[
                {key: 'space', item: 
                    <View style={{height: 16}} />
                },
                ... sortedTopicKeys.map(k => ({key: k, item: 
                    <Topic community={community} topics={topics} topicKey={k} communityInfo={communityInfo} topicStates={topicStates} />
                })),
                {key: 'pad', item: <View style={{height: 8}} />}
            ]}
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

function Topic({community, communityInfo, topics, topicKey, topicStates}) {
    const navgation = useCustomNavigation();
    const topic = topics[topicKey]
    const questions = JSON.parse(topic.questions)
    const shownQuestions = questions.filter(q => q[0] != '>');
    const [expanded, setExpanded] = useState(false)

    const state = _.get(topicStates, topicKey);

    async function setTopicState(state) {
        track('Set Topic State', {topic: topicKey, topicName: topic.name, state});
        console.log('setTopicState', community, topicKey, state);
        setExpanded(false);
        await setDataAsync(['commMember', community, getCurrentUser(), 'topic', topicKey], state);
    }

    const canEdit = topic.from == getCurrentUser() || isMasterUser();

    const red = 'hsl(0, 50%, 90%)';
    const green = 'hsl(120, 50%, 90%)';
    const yellow = 'hsl(60, 50%, 90%)';

    if (expanded || !state) {
        return (
            <View style={{marginVertical: 8, marginHorizontal: 16}}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 4, marginVertical: 2}}>               
                    {/* <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} size={16} />  */}
                    {topic.lastMessage ? 
                        <Text style={{fontSize: 12, color: '#666', marginLeft: 4}}>New highlight published {formatTime(topic.lastMessage.publishTime)}</Text>
                    : 
                        <Text style={{fontSize: 12, color: '#666', marginLeft: 4}}>Topic posted in {communityInfo.name} {formatTime(topic.time)}</Text>
                    }
                </View>
                <View style={{flexDirection: 'row', alignSelf: 'stretch'}}>
                    {/* <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} size={40} /> */}
                    <View style={{backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                            borderRadius: 8, maxWidth: 450, flexShrink: 1, flexGrow: 1,
                            // marginHorizontal: 8,
                            ...shadowStyle }}>
                        <View style={{padding: 8}}>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                <Text style={{fontWeight: 'bold', fontSize: 16}}>{topic.name}</Text>
                                {canEdit ? 
                                    <FixedTouchable onPress={() => navgation.navigate('editTopic', {community, topic: topicKey})}>
                                        <Entypo name='edit' color='#999' size={12}/>
                                    </FixedTouchable>
                                :null}
                            </View>
                            <View style={{flexShrink: 1, marginTop: 4}}>
                                <LinkText linkColor={baseColor} style={{color: '#222', marginBottom: 4}} text={topic.summary} />
                                {shownQuestions.map(question =>
                                    <View key={question} style={{flexDirection: 'row', flexShrink: 1}}>
                                        <Text style={{color: '#666', marginRight: 4}}>{'\u2022'}</Text>
                                        <LinkText linkColor={baseColor} key={question} style={{color: '#222', marginBottom: 2}} text={question} />
                                    </View>
                                )}                        
                            </View>
                        </View>
                        <View style={{borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth, padding: 8}}>
                            <Text style={{fontSize: 12, color: "#666"}}>Do you want to talk about this?</Text>
                            <View style={{flexDirection: 'row', marginTop: 4}}>
                                <PillButton selected={state=='yes'} color={green} onPress={() => setTopicState('yes')}>Yes</PillButton>
                                <PillButton selected={state=='maybe'} color={yellow} onPress={() => setTopicState('maybe')}>Maybe</PillButton>
                                <PillButton selected={state=='no'} color={red} onPress={() => setTopicState('no')}>No</PillButton>
                            </View>                        
                        </View>
                        <PublishedPreview topic={topic} community={community} topicKey={topicKey} />
                    </View>
                </View>
            </View>
        )
    } else {
        return (
            <View style={{marginVertical: 8, marginHorizontal: 16}}>
                {topic.lastMessage && (state=='yes' || state=='maybe') ? 
                    <Text style={{marginHorizontal: 16, fontSize: 12, color: '#666', marginLeft: 4, marginBottom: 1}}>New highlight published {formatTime(topic.lastMessage.publishTime)}</Text>
                : null}
                <View style={{backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                                // flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                borderRadius: 8, maxWidth: 450, 
                                // marginVertical: 8, marginHorizontal: 16,
                                // flexShrink: 1, alignSelf: 'flex-start',
                                ...shadowStyle }}>
                    <FixedTouchable onPress={() => setExpanded(true)} style={{flex: 1}}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                            <View style={{flexDirection: 'row', alignItems: 'center', flexShrink: 1}}>
                                <View style={{borderRadius: 10, margin: 4, paddingHorizontal: 6, paddingVertical: 2,
                                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        backgroundColor: state == 'maybe' ? yellow : (state == 'yes' ? green : red)}}>
                                    <Text style={{fontSize: 12}}>{state == 'yes' ? 'Yes' : (state == 'no' ? 'No' : 'Maybe')}</Text>
                                </View>
                                <View style={{paddingRight: 8, flexShrink: 1}}>
                                    <OneLineText style={{color: '#222', flexShrink: 1}}>{topic.name}</OneLineText>
                                </View>
                            </View>
                            <View style={{marginRight: 4}}>
                                <Entypo color='#999' name='chevron-down' />
                            </View>
                        </View>
                    </FixedTouchable>
                    {state != 'no' ?
                        <PublishedPreview topic={topic} community={community} topicKey={topicKey} />
                    : null}
                </View>
            </View>
        )
    }
}

function PublishedPreview({community, topicKey, topic, members}) {
    const navigation = useCustomNavigation();
    if (topic.publishCount && topic.lastMessage) {
        return (
            <FixedTouchable onPress={() => navigation.navigate('highlights', {community, topic: topicKey})}>
                <View style={{borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth, padding: 8}}>
                    {topic.publishCount > 1 ?
                    <Text style={{marginBottom: 4, color: '#666', fontSize: 12}}>View {topic.publishCount} highlights</Text>
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
