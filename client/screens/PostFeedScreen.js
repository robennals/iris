import React, { useState } from 'react';
import { FlatList, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCurrentUser, isMasterUser, setDataAsync, useDatabase } from '../data/fbutil';
import _ from 'lodash';
import { Action, andFormatStrings, FixedTouchable, HeaderSpaceView, memberKeysToHues, MyViewpointPreview, name_label, ScreenContentScroll, searchMatches, SmallMinorButton, ViewpointActions, WideButton } from '../components/basics';
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
import { PhotoPromo } from '../components/profilephoto';
import { SearchBox } from '../components/searchbox';

export function PostFeedScreenHeader({navigation, route}) {
    const {community} = route.params;
    const communityInfo = useDatabase([community], ['community', community]);

    if (!communityInfo) return null;

    return (
        <FixedTouchable onPress={() => navigation.navigate(isMasterUser() ? 'editCommunity' : 'communityProfile', {community})}>
            <View style={{flexDirection: 'row', alignItems: 'center', padding: 8}}>
                <CommunityPhotoIcon photoKey={communityInfo?.photoKey} photoUser={communityInfo.photoUser} name={communityInfo.name} size={28} />
                <View style={{marginLeft: 8}}>
                    <Text style>{communityInfo.name}</Text>
                </View>
            </View>
        </FixedTouchable>
    )
}

function PostGroupMembers({post, postInfo}) {
    const members = postInfo.member;
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

function GroupJoinWidget({youAsked, postInfo, post, community}) {
    const navigation = useCustomNavigation();
    if (postInfo?.member?.[getCurrentUser()]) {
        return (
            <FixedTouchable onPress={() => navigation.navigate('group', {group: postInfo.group})}>
                <Text style={{color: '#666', textDecorationLine: 'underline'}}>Go to conversation</Text>
            </FixedTouchable>
        )
    } else if (youAsked) {
        return <Text style={{fontWeight: 'bold'}}>You asked to join</Text>
    } else if (postInfo.from == getCurrentUser()) {
        return <Text style={{color: '#666', borderTopColor: '#ddd', 
                    borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 8}}>
                    Waiting for join requests
                </Text>
    } else {
        return <AskToJoin community={community} post={post} postInfo={postInfo}/>
    }
}


function AskToJoin({community, post, postInfo}) {
    const [expanded, setExpanded] = useState(false);
    const [text, setText] = useState('');
    const [inProgress, setInProgress] = useState(false);
    const host = postInfo.from
    
    async function onSubmit(){
        setInProgress(true);
        await askToJoinAsync({community, post, host: topicGroupKey, text}); 
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




export function PostFeedScreen({navigation, route}) {
    const {community, post: boostedPostKey} = route.params;
    const posts = useDatabase([community], ['post', community]);
    const postRead = useDatabase([community],['userPrivate', getCurrentUser(), 'postRead', community]);
    const localComm = useDatabase([community], ['userPrivate', getCurrentUser(), 'comm', community], false);
    const youAskedPost = useDatabase([community], ['userPrivate', getCurrentUser(), 'youAskedPost', community]);

    if (!posts || !postRead || !localComm || !youAskedPost) return <Loading />

    const sortedPostKeys = _.sortBy(_.keys(posts), p => posts[p].createTime);

    if (getCurrentUser() == null || (!isMasterUser() && !localComm?.name)) {
        return (
            <IntakeScreen community={community} />
        )
    }

    return (
        <KeyboardSafeView size={{flex: 1}}>
            <StatusBar style='dark' />
            <HeaderSpaceView style={{flex: 1}}>
                <PhotoPromo />
                <View style={{backgroundColor: 'white', flex: 1}}>
                    {isMasterUser() ? 
                        <CommunityAdminActions community={community} />
                    : null
                    } 
                    <PostList posts={posts} sortedPostKeys={sortedPostKeys} community={community} postRead={postRead} youAskedPost={youAskedPost} />
                </View>
            </HeaderSpaceView>
        </KeyboardSafeView>
    )
}


function PostList({posts, sortedPostKeys, community, postRead, youAskedPost}) {
    const [search, setSearch] = useState('');
    var filteredPostKeys = sortedPostKeys;
    if (search) [
        filteredPostKeys = _.filter(sortedPostKeys, p => searchMatches(posts[p].title, search))
    ]

    return (
        <ScrollView style={{flex: 1, flexShrink: 1, backgroundColor: '#fcf8f4'}}>
            <SearchNewHeader community={community} search={search} setSearch={setSearch} />
            {filteredPostKeys.map(post => 
                <Catcher key={post} style={{alignSelf: 'stretch'}}>
                    <MemoPost community={community} post={post} postInfo={posts[post]} readTime={postRead[post]} youAsked={youAskedPost[post]} />
                </Catcher>
            )}
        </ScrollView>
    )
}

const MemoPost = React.memo(Post);

const lightShadowStyle = {
    shadowRadius: 2, shadowColor: '#555', shadowOffset: {width: 0, height: 1},
        // borderColor: '#ddd', borderWidth: 2,
    shadowOpacity: 0.5, elevation: 2}


function Post({community, post, postInfo, readTime, youAsked}) {
    return (
        <View style={{flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch'}}>
            <View style={{marginVertical: 8, marginHorizontal: 16, flex: 1, maxWidth: 450}}>
                <View style={{
                        backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                        borderRadius: 8, flexShrink: 1, flex: 1, padding: 8,
                        ...lightShadowStyle
                }}> 
                    <PostHostLine community={community} post={post} postInfo={postInfo} />
                    <Text style={{marginTop: 8, color: '#666'}} numberOfLines={8}>{postInfo.text}</Text>
                    <PostGroupMembers post={post} postInfo={postInfo} />
                    <GroupJoinWidget youAsked={youAsked} post={post} postInfo={postInfo} community={community} />
                </View>
            </View>
        </View>
    )
}

function PostHostLine({community, post, postInfo}) {
    const navigation = useCustomNavigation();
    const canEdit = postInfo.from == getCurrentUser() || isMasterUser();

    return (
        <FixedTouchable onPress={() => navigation.navigate('profile', {community, member: postInfo.from})}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'top'}}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>                
                    <MemberPhotoIcon user={postInfo.from} photoKey={postInfo.fromPhoto} name={postInfo.fromName} size={24} />
                    <Text style={{marginLeft: 6}}><Text style={{fontWeight: 'bold'}}>{postInfo.fromName}</Text></Text>
                    <Text style={{color: '#999', fontSize: 13}}> - {formatTime(postInfo.createTime)}</Text>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {canEdit ? 
                        <FixedTouchable onPress={() => navigation.navigate('editPost', {community, post})}>
                            <Entypo name='edit' color='#999' size={12}/>
                        </FixedTouchable>
                    :null}
                </View>
            </View>
        </FixedTouchable>
    )
}

function SearchNewHeader({community, search, setSearch}) {
    const navigation = useCustomNavigation();
    return (
        <View style={{flexDirection: 'row', justifyContent: 'center'}}>
            <View style={{flexDirection: 'row', maxWidth: 450, marginHorizontal: 16, marginTop: 16, flex: 1, alignItems: 'center'}}>
                <SearchBox value={search} onChangeText={setSearch} placeholder='Search Conversations'
                    style={{backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                    marginHorizontal: 0}} />              
                {search ? null : 
                    <WideButton alwaysActive
                        onPress={() => navigation.navigate('newPost', {community})} 
                        // onPress={() => console.log('community', community)}
                        style={{alignSelf: 'center', margin: 0, marginLeft: 8}}>New Conversation
                    </WideButton>
                }
            </View>
        </View>
    )

}


function CommunityAdminActions({community}) {
    const navigation = useCustomNavigation();
    return (
        <View style={{backgroundColor: 'white', flexDirection: 'row', justifyContent: 'center', padding: 8, borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth}}>
            <SmallMinorButton alwaysActive onPress={() => navigation.navigate('communitySignups', {community})}>Signups</SmallMinorButton>
            <SmallMinorButton alwaysActive onPress={() => navigation.navigate('communityGroups', {community})}>Groups</SmallMinorButton>
            <SmallMinorButton alwaysActive onPress={() => navigation.navigate('join', {community})}>Intake Form</SmallMinorButton>
        </View>
    )
}


