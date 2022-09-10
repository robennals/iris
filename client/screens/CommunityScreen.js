import { Entypo } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FixedTouchable, HeaderSpaceView, OneLineText, ScreenContentScroll, SmallMinorButton, WideButton } from '../components/basics';
import { GroupContext } from '../components/context';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { LinkText } from '../components/linktext';
import { CommunityPhotoIcon } from '../components/photo';
import { BottomFlatScroller, setTitle, useCustomNavigation } from '../components/shim';
import { formatLongTimeDate, formatTime } from '../components/time';
import { baseColor } from '../data/config';
import { getCurrentUser, internalReleaseWatchers, isMasterUser, setDataAsync, watchData } from '../data/fbutil';
import { IntakeScreen } from './IntakeScreen';

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
        <View style={{flexDirection: 'row', justifyContent: 'center', padding: 8, borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth}}>
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

    useEffect(() => {
        var x = {};
        watchData(x, ['userPrivate', getCurrentUser(), 'community', community, 'role'], setRole, false)
        watchData(x, ['community', community], setCommunityInfo);
        watchData(x, ['topic', community], setTopics);
        watchData(x, ['commMember', community, getCurrentUser(), 'topic'], setTopicStates);
    }, [community])

    if (getCurrentUser() == null) {
        return (
            <IntakeScreen community={community} />
        )
    }

    // if (role == false && !isMasterUser()) {
    //     return (
    //         <IntakeScreen community={community} />
    //     )
    // }

    return (
        <KeyboardSafeView style={{flex: 1}}>
            <HeaderSpaceView style={{flex:1 }}>
                {isMasterUser(getCurrentUser) ? 
                    <CommunityAdminActions community={community} />
                : null}     
                <TopicList topics={topics} community={community} communityInfo={communityInfo} topicStates={topicStates} />
            </HeaderSpaceView>
        </KeyboardSafeView>
      )
}

function TopicList({community, topics, communityInfo, topicStates}) {
    return (
        <BottomFlatScroller
            style={{flex: 1, flexShrink: 1}}
            data={[
                {key: 'space', item: 
                    <View style={{height: 16}} />
                },
                ... _.keys(topics).map(k => ({key: k, item: 
                    <Topic community={community} topics={topics} topicKey={k} communityInfo={communityInfo} topicStates={topicStates} />
                })),
                {key: 'pad', item: <View style={{height: 8}} />}
            ]}
        />
    )
}


const shadowStyle = {
    shadowRadius: 2, shadowColor: '#555', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.5, elevation: 2}


function PillButton({children, color = 'white', onPress}){
    return (
        <FixedTouchable onPress={onPress}>
            <View style={{borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', 
                paddingVertical: 4, paddingHorizontal: 8, marginHorizontal: 4, backgroundColor: color}}>
                <Text>{children}</Text>
            </View>
        </FixedTouchable>
    )
}

function Topic({community, communityInfo, topics, topicKey, topicStates}) {
    const topic = topics[topicKey]
    const questions = JSON.parse(topic.questions)
    const shownQuestions = questions.filter(q => q[0] != '>');
    const [expanded, setExpanded] = useState(false)

    const state = _.get(topicStates, topicKey);

    async function setTopicState(state) {
        console.log('setTopicState', community, topicKey, state);
        setExpanded(false);
        await setDataAsync(['commMember', community, getCurrentUser(), 'topic', topicKey], state);
    }

    const red = 'hsl(0, 50%, 90%)';
    const green = 'hsl(120, 50%, 90%)';
    const yellow = 'hsl(60, 50%, 90%)';

    if (expanded || !state) {
        return (
            <View style={{marginVertical: 8, marginHorizontal: 16}}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 12, marginVertical: 2}}>               
                    <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} size={16} /> 
                    <Text style={{fontSize: 12, color: '#666', marginLeft: 4}}>Topic posted in {communityInfo.name} {formatTime(topic.time)}</Text>
                </View>
                <View style={{flexDirection: 'row'}}>
                    {/* <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} size={40} /> */}
                    <View style={{backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                            borderRadius: 8, maxWidth: 550, 
                            // marginHorizontal: 8,
                            ...shadowStyle }}>
                        <View style={{padding: 8}}>
                            <Text style={{fontWeight: 'bold'}}>{topic.name}</Text>
                            <View style={{flexShrink: 1}}>
                                {shownQuestions.map(question =>
                                    <View key={question} style={{flexDirection: 'row', flexShrink: 1}}>
                                        <Text style={{color: '#666', marginRight: 4}}>{'\u2022'}</Text>
                                        <LinkText color={baseColor} key={question} style={{color: '#666', marginBottom: 2}} text={question} />
                                    </View>
                                )}                        
                            </View>
                        </View>
                        <View style={{borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth, padding: 8}}>
                            <Text style={{fontSize: 12, color: "#999"}}>Want to talk about this?</Text>
                            <View style={{flexDirection: 'row', marginTop: 4}}>
                                <PillButton color={green} onPress={() => setTopicState('yes')}>Yes</PillButton>
                                <PillButton color={yellow} onPress={() => setTopicState('maybe')}>Maybe</PillButton>
                                <PillButton color={red} onPress={() => setTopicState('no')}>No</PillButton>
                            </View>
                        
                        </View>
                    </View>
                </View>
            </View>
        )
    } else {
        return (
            <FixedTouchable onPress={() => setExpanded(true)}>
                <View style={{backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                                flexDirection: 'row', alignItems: 'center',
                                borderRadius: 8, maxWidth: 550, 
                                paddingRight: 4,
                                marginVertical: 8, marginHorizontal: 16,
                                flexShrink: 1, alignSelf: 'flex-start',
                                ...shadowStyle }}>

                    <View style={{width: 20, height: 20, borderRadius: 10, margin: 4,
                            alignItems: 'center', justifyContent: 'center', flexShrink: 1,
                            backgroundColor: state == 'maybe' ? yellow : (state == 'yes' ? green : red)}}>
                        {state == 'maybe' ?
                            <Text>?</Text>
                        :
                            <Entypo name={state == 'yes' ? 'check' : 'cross'}/>
                        }
                    </View>
                    <View style={{paddingRight: 8}}>
                        <Text style={{color: '#222'}}>{topic.name}</Text>
                    </View>
                    <View>
                        <Entypo color='#999' name='chevron-down' />
                    </View>
                </View>
            </FixedTouchable>
        )
    }
}
