import React, { useState } from 'react';
import { FlatList, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCurrentUser, isMasterUser, setDataAsync, useDatabase } from '../data/fbutil';
import _ from 'lodash';
import { Action, andFormatStrings, firstName, FixedTouchable, Header, HeaderSpaceView, lightShadowStyle, memberKeysToHues, MyViewpointPreview, name_label, OneLineText, ScreenContentScroll, searchMatches, SmallMinorButton, ViewpointActions, WideButton } from '../components/basics';
import { CommunityPhotoIcon, MemberPhotoIcon } from '../components/photo';
import { Entypo, FontAwesome, Ionicons } from '@expo/vector-icons';
import { LinkText } from '../components/linktext';
import { dayMillis, formatMessageTime, formatSummaryTime, formatTime } from '../components/time';
import { baseColor } from '../data/config';
import { Catcher } from '../components/catcher';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { Loading } from '../components/loading';
import { useCustomNavigation } from '../components/shim';
import { Help, HelpText } from '../components/help';
import { askToJoinAsync, editTopicAsync, editUpdateAsync } from '../data/servercall';
import { PhotoPromo } from '../components/profilephoto';
import { SearchBox } from '../components/searchbox';
import { IntakeScreen } from './IntakeScreen';
import { FollowButton } from '../components/followavoid';
import { MemoPost } from './PostFeedScreen';

export function PostTopicScreenHeader({navigation, route}) {
    const {community, topic} = route.params;
    const communityName = useDatabase([community], ['community', community, 'name']);
    const topicInfo = useDatabase([community, topic], ['postTopic', community, topic]);

    return (
        <View style={{marginHorizontal: 8}}>
            <Text style={{fontSize: 16, fontWeight: 'bold'}}>{topicInfo?.name}</Text>
            <OneLineText style={{fontSize: 12}}>
                in {communityName}
            </OneLineText>
        </View>
    )
}

export function PostTopicScreen({navigation, route}) {
    const {community, topic} = route.params;
    const topicInfo = useDatabase([community, topic], ['postTopic', community, topic]);
    const posts = useDatabase([community], ['post', community]);
    const youAskedPost = useDatabase([community], ['userPrivate', getCurrentUser(), 'youAskedPost', community]);

    const postKeysAboutTopic = _.filter(_.keys(posts), p => posts[p].topic == topic);
    const sortedPostKeys = _.sortBy(postKeysAboutTopic, p => posts[p].time).reverse();

    if (!topicInfo || !youAskedPost) return <Loading/>

    return (
        <KeyboardSafeView size={{flex: 1}}>
            <StatusBar style='dark' />
            <HeaderSpaceView style={{flex: 1}}>
                <PhotoPromo />
                <ScrollView style={{flex: 1, flexShrink: 1, backgroundColor: '#fcf8f4'}}>
                    <PostTopic community={community} topic={topic} topicInfo={topicInfo} />
                    <Header style={{marginTop: 16}}>Conversations about this Topic</Header>
                    <View style={{flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch'}}>
                        <View style={{marginTop: 8, flex: 1, maxWidth: 450, marginHorizontal: 16}}>
                           <FixedTouchable onPress={() => navigation.navigate('newTopicPost', {community, topic})}>
                                <View style={{backgroundColor: baseColor, borderRadius: 16, alignSelf: 'flex-end'}}>
                                    <Text style={{color: 'white', paddingHorizontal: 8, paddingVertical: 4}}>New Conversation</Text>
                                </View>
                            </FixedTouchable>
                        </View>
                    </View>
                    {sortedPostKeys.map(p => 
                        <MemoPost key={p} community={community} post={p} postInfo={posts[p]} topicInfo={topicInfo} 
                            youAsked={youAskedPost[p]} hideTopic />
                    )}
                </ScrollView>
            </HeaderSpaceView>
        </KeyboardSafeView>

        
    )
    return <Text>Topic</Text>
}

function PostTopic({expanded, community, topic, topicInfo}) {
    const navigation = useCustomNavigation();
    const canEdit = topicInfo.from == getCurrentUser();
    return (
        <View style={{flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch'}}>
            <View style={{marginVertical: 8, marginHorizontal: 16, flex: 1, maxWidth: 450}}>
                <View style={{
                            backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                            borderRadius: 8, padding: 8,
                            ...lightShadowStyle
                    }}> 
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <View style={{flexDirection: 'row', marginBottom: 2}}>
                            <View style={{borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingHorizontal: 4}}>
                                <Text style={{color: '#666', fontSize: 11}}>Topic</Text>
                            </View>
                            <Text style={{color: '#999', fontSize: 12}}> - {formatTime(topicInfo.time)}</Text>
                        </View>
                        <FixedTouchable onPress={() => navigation.navigate('editTopic', {community, topic})}>
                            <Entypo name='edit' color='#999' size={12}/>
                        </FixedTouchable>
                    </View>

                    {/* <Text style={{color: '#999', fontSize: 12}}>New Topic<Text style={{color: '#999'}}> - {formatTime(topicInfo.time)}</Text></Text> */}
                    <Text style={{fontSize: 18, marginBottom: 8}}><Text style={{fontWeight: 'bold'}}>{topicInfo.name}</Text></Text>
                    <LinkText text={topicInfo.summary} style={{fontSize: 16, color: '#666', marginBottom: 12}} />
                </View>
            </View>
        </View>
    )
}

