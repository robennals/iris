import React, { useState } from 'react';
import { FlatList, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCurrentUser, isMasterUser, setDataAsync, useDatabase } from '../data/fbutil';
import _ from 'lodash';
import { Action, andFormatStrings, FixedTouchable, HeaderSpaceView, memberKeysToHues, MyViewpointPreview, name_label, OneLineText, ScreenContentScroll, searchMatches, SmallMinorButton, ViewpointActions, WideButton } from '../components/basics';
import { CommunityPhotoIcon, MemberPhotoIcon } from '../components/photo';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { LinkText } from '../components/linktext';
import { dayMillis, formatMessageTime, formatSummaryTime, formatTime } from '../components/time';
import { baseColor } from '../data/config';
import { Catcher } from '../components/catcher';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { Loading } from '../components/loading';
import { useCustomNavigation } from '../components/shim';
import { Help, HelpText } from '../components/help';
import { askToJoinAsync, editTopicAsync } from '../data/servercall';
import { PhotoPromo } from '../components/profilephoto';
import { SearchBox } from '../components/searchbox';
import { IntakeScreen } from './IntakeScreen';

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

export function PostScreenHeader({navigation, route}) {
    const {community, post} = route.params;
    const communityName = useDatabase([community], ['community', community, 'name'], '');
    const postName = useDatabase([community, post], ['post', community, post, 'title'], '');
    return (
        <View style={{marginHorizontal: 8, flex: 1}}>
            <Text numberOfLines={1} style={{flexShrink: 1, fontSize: 16, fontWeight: 'bold'}}>{postName}</Text>
            <OneLineText style={{fontSize: 12, flexShrink: 1}}>
                in {communityName}
            </OneLineText>
        </View>
    )
}


function PostGroupMembers({community, post, postInfo}) {
    const navigation = useCustomNavigation();
    const members = postInfo.member;
    if (!members || _.keys(members).length < 2 || members[getCurrentUser()]) {
        return null;
    }
    const memberKeys = _.keys(members);
    const names = andFormatStrings(_.map(memberKeys, k => members[k].name));
    return (
        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            {_.map(_.keys(members), m => 
                <FixedTouchable key={m} onPress={() => navigation.navigate('profile', {community, member: m})}>
                    <MemberPhotoIcon user={m} photoKey={members[m].photo} name={members[m].name} size={24} />
                </FixedTouchable>
            )}
            <Text style={{marginLeft: 8, fontSize: 12, flexShrink: 1, color: '#666'}}>{names} are talking</Text>
        </View>
    )
}

function GroupJoinWidget({youAsked, postInfo, post, community}) {
    const navigation = useCustomNavigation();
    if (postInfo?.member?.[getCurrentUser()]) {
        return (
            <FixedTouchable onPress={() => navigation.navigate('group', {group: post})} 
                style={{borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 8}}>
                <Text style={{color: '#666', textDecorationLine: 'underline'}}>Go to conversation</Text>
            </FixedTouchable>
        )
    } else if (youAsked) {
        return <Text style={{fontWeight: 'bold', borderTopColor: '#ddd', 
            borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 8}}>
                You asked to join
        </Text>

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
    
    async function onSubmit(){
        setInProgress(true);
        await askToJoinAsync({community, post, text}); 
    }
    
    if (expanded) {
        return (
            <View style={{marginTop: 8, paddingTop: 12, borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth}}>
                <PostGroupMembers community={community} post={post} postInfo={postInfo} />
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
                                <Text style={{color: 'white', paddingHorizontal: 8, paddingVertical: 4}}>Send Join Request</Text>
                            </View>
                        </FixedTouchable>
                    </View>
                }
            </View>

        )
    } else if (postInfo.member) {
        return (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 8, borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth}}>
                <PostGroupMembers community={community} post={post} postInfo={postInfo} />
                <FixedTouchable onPress={() => setExpanded(true)}>            
                    <View style={{backgroundColor: baseColor, borderRadius: 16}}>
                        <Text style={{color: 'white', paddingHorizontal: 8, paddingVertical: 4}}>Ask to Join</Text>
                    </View>
                </FixedTouchable>
            </View>
        )
    } else {
        return (
            <View style={{marginTop: 12, paddingTop: 2, borderTopColor: '#ddd', borderTopWidth: StyleSheet.hairlineWidth}}>
                <FixedTouchable onPress={() => setExpanded(true)}>
                    <View style={{flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderColor: '#ddd', 
                            borderWidth: StyleSheet.hairlineWidth, justifyContent: 'space-between', marginTop: 8}}>
                        <Text style={{flex: 1, marginHorizontal: 8, color: '#999'}}>
                            Write a message to the host
                        </Text>
                        <View style={{backgroundColor: baseColor, borderRadius: 16}}>
                            <Text style={{color: 'white', paddingHorizontal: 8, paddingVertical: 4}}>Ask to Join</Text>
                        </View>
                    </View>
                </FixedTouchable>
            </View>
        )
    }
}


export function PostScreen({navigation, route}) {
    const {community, post} = route.params;
    const postInfo = useDatabase([community], ['post', community, post]);
    const readTime = useDatabase([community],['userPrivate', getCurrentUser(), 'postRead', community, post]);
    const youAsked = useDatabase([community], ['userPrivate', getCurrentUser(), 'youAskedPost', community, post], null);


    if (!postInfo) return <Loading />

    console.log('youAsked', youAsked);


    return (
        <KeyboardSafeView size={{flex: 1}}>
            <StatusBar style='dark' />
            <HeaderSpaceView style={{flex: 1}}>
                <PhotoPromo />
                <ScrollView style={{flex: 1, flexShrink: 1, backgroundColor: '#fcf8f4'}}>
                    <MemoPost expanded community={community} post={post} postInfo={postInfo} readTime={readTime} youAsked={youAsked} />
                </ScrollView>
            </HeaderSpaceView>
        </KeyboardSafeView>
    )
}


function clusterPostsByHost({posts, sortedPostKeys}) {
    var hostClusters = {};
    _.forEach(sortedPostKeys, k => {
        const post = posts[k];
        var cluster = hostClusters[post.from];
        if (!cluster) {
            cluster = {
                time: post.createTime,
                fromName: post.fromName,
                leadPost: k,
                otherPosts: []
            }
            hostClusters[post.from] = cluster;
        } else {
            cluster.otherPosts.push(k);
        }
    })
    return hostClusters;
}


function getPostBoost({postInfo, followAvoid}) {
    // console.log('getBoostedTime', postInfo, followAvoid);
    if (postInfo.member && postInfo?.member?.[getCurrentUser()]) {
        // console.log('already in group', postInfo);
        return null;
    }
    if ((postInfo.lastJoinTime || postInfo.createTime) < Date.now() - (5 * dayMillis)) {
        // console.log('too old', postInfo);
        return null;
    }
    const memberKeys = _.keys(postInfo.member || {});
    if (memberKeys.length > 5) {
        // console.log('too many members', postInfo);
        return null;
    }
    if (followAvoid[postInfo.from] == 'follow') {
        return {reasonHost: true, time: postInfo.createTime};
    }
    if (!postInfo.member) {
        // console.log('no members', postInfo);
        return null;
    }

    const followedMemberKeys = _.filter(memberKeys, m => followAvoid[m] == 'follow');
    // console.log('followedMemberKeys', {followedMemberKeys, postInfo});
    if (followedMemberKeys.length > 0) {
        const sortedFollowedMembers = _.sortBy(followedMemberKeys, m => postInfo.member[m].time || 0).reverse();
        const lastFollowedJoinTime = postInfo.member[sortedFollowedMembers[0]]?.time || null;
        // console.log('last', {lastFollowedJoinTime, sortedFollowedMembers});
        return {reasonMember: sortedFollowedMembers[0], time: lastFollowedJoinTime};
    } else {
        return null;
    }
}


export function PostFeedScreen({navigation, route}) {
    const {community, post: boostedPostKey} = route.params;
    const posts = useDatabase([community], ['post', community]);
    const postRead = useDatabase([community],['userPrivate', getCurrentUser(), 'postRead', community]);
    const localComm = useDatabase([community], ['userPrivate', getCurrentUser(), 'comm', community], false);
    const youAskedPost = useDatabase([community], ['userPrivate', getCurrentUser(), 'youAskedPost', community]);
    const followAvoid = useDatabase([], ['perUser', 'followAvoid', getCurrentUser()]);

    if (!posts || !postRead || !localComm || !youAskedPost || !followAvoid) return <Loading />

    const sortedPostKeys = _.sortBy(_.keys(posts), p => posts[p].createTime).reverse();

    if (getCurrentUser() == null || (!isMasterUser() && !localComm?.name)) {
        return (
            <IntakeScreen community={community} />
        )
    }

    const postBoosts = _.mapValues(posts, postInfo => getPostBoost({postInfo, followAvoid}));
    const [boostedPostKeys, nonBoostedPostKeys] = _.partition(sortedPostKeys, p => postBoosts[p]);
    // console.log('postkeys', {boostedPostKeys, nonBoostedPostKeys, postBoostTimes: postBoosts});

    const hostClusters = clusterPostsByHost({posts, sortedPostKeys:nonBoostedPostKeys});
    const sortedHostKeys = _.sortBy(_.keys(hostClusters), h => hostClusters[h].time).reverse();

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
                    <PostList postBoosts={postBoosts} posts={posts} sortedHostKeys={sortedHostKeys} hostClusters={hostClusters} boostedPostKeys={boostedPostKeys} sortedPostKeys={sortedPostKeys} community={community} postRead={postRead} youAskedPost={youAskedPost} />
                </View>
            </HeaderSpaceView>
        </KeyboardSafeView>
    )
}


function PostList({posts, postBoosts, sortedHostKeys, boostedPostKeys, hostClusters, sortedPostKeys, community, postRead, youAskedPost}) {
    const [search, setSearch] = useState('');
    var filteredPostKeys = boostedPostKeys;
    if (search) [
        filteredPostKeys = _.filter(sortedPostKeys, p => searchMatches(posts[p].title, search))
    ]

    // console.log('hostClusters', hostClusters, sortedHostKeys);


    return (
        <ScrollView style={{flex: 1, flexShrink: 1, backgroundColor: '#fcf8f4'}}>
            <SearchNewHeader community={community} search={search} setSearch={setSearch} />
            {filteredPostKeys.map(post => 
                <Catcher key={post} style={{alignSelf: 'stretch'}}>
                    <MemoPost boost={postBoosts[post]} community={community} post={post} postInfo={posts[post]} readTime={postRead[post]} youAsked={youAskedPost[post]} />
                </Catcher>
            )}
            {search ? null : 
                sortedHostKeys.map(host => 
                    <Catcher key={host} style={{alignSelf: 'stretch'}}>
                        <MemoHostCluster community={community} posts={posts} host={host} hostCluster={hostClusters[host]} youAskedPost={youAskedPost} />
                    </Catcher>
                )
            }

        </ScrollView>
    )
}


const lightShadowStyle = {
    shadowRadius: 2, shadowColor: '#555', shadowOffset: {width: 0, height: 1},
        // borderColor: '#ddd', borderWidth: 2,
    shadowOpacity: 0.5, elevation: 2}


const MemoHostCluster = React.memo(HostCluster);

function HostCluster({community, host, posts, hostCluster, youAskedPost}) {
    const navigation = useCustomNavigation();
    return (
        <View>
            <MemoPost community={community} post={hostCluster.leadPost} postInfo={posts[hostCluster.leadPost]} />            
            {hostCluster.otherPosts.length > 0 ? 
                <View style={{flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch'}}>
                    <View style={{marginBottom: 8, marginHorizontal: 16, flex: 1, maxWidth: 450}}>
                        <View style={{
                            backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                            borderRadius: 4, flexShrink: 1, flex: 1, padding: 8,
                            ...lightShadowStyle
                        }}> 

                            <Text style={{fontSize: 12, marginBottom: 4}}>More by <Text style={{fontWeight: 'bold'}}>{hostCluster.fromName}</Text></Text>
                            {hostCluster.otherPosts.slice(0,5).map(p => 
                                <FixedTouchable key={p} onPress={() => navigation.navigate('post', {community, post: p})} style={{paddingVertical: 4}}>
                                    <OneLineText style={{fontWeight: 'bold', color: '#666'}}>{posts[p].title}</OneLineText>
                                </FixedTouchable>
                            )}
                        </View>
                    </View>
                </View>
            : null}
        </View>
    )
}


const MemoPost = React.memo(Post);



function BoostInfo({boost, postInfo}) {
    if (boost.reasonHost) {
        return <Text style={{marginHorizontal: 8, fontSize: 12, color: '#666', marginBottom: 1}}>You follow {postInfo.fromName}</Text>
    } else if (boost.reasonMember) {
        const memberName = postInfo.member[boost.reasonMember].name;
        return <Text style={{marginHorizontal: 8, fontSize: 12, color: '#666', marginBottom: 1}}>{memberName} joined {formatTime(boost.time)}</Text>
    } else {
        return null;
    }
}


function Post({community, boost, post, postInfo, readTime, youAsked, expanded}) {
    const navigation = useCustomNavigation();
    const questions = _.filter(_.map((postInfo.questions || '').split('\n'), q => q.trim()), s => s);
    const shownQuestions = expanded ? questions : questions.slice(0,3);
    return (
        <View style={{flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch'}}>
            <View style={{marginVertical: 8, marginHorizontal: 16, flex: 1, maxWidth: 450}}>
                {boost ? 
                    <BoostInfo boost={boost} postInfo={postInfo} />
                : null}
                <View style={{
                        backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                        borderRadius: 8, flexShrink: 1, flex: 1, padding: 8,
                        ...lightShadowStyle
                }}> 
                    <PostHostLine community={community} post={post} postInfo={postInfo} />
                    <FixedTouchable dummy={expanded} onPress={() => navigation.navigate('post', {community, post})}>
                        <OneLineText style={{fontWeight: 'bold', fontSize: 16, marginVertical: 8}}>{postInfo.title}</OneLineText>
                        {expanded ? 
                            <LinkText style={{color: '#666'}} text={postInfo.text} />
                        : 
                            <Text style={{color: '#666'}} numberOfLines={2}>{postInfo.text}</Text>
                        }
                        {expanded && shownQuestions.length > 0 ? 
                            <Text style={{fontWeight: 'bold', marginTop: 24, fontSize: 13}}>Questions</Text>
                        :null}
                        {shownQuestions.map(q => 
                            <View key={q} style={{flexDirection: 'row', flexShrink: 1, marginTop: 8}}>
                                <Text style={{color: '#666', marginRight: 4}}>{'\u2022'}</Text>
                                <Text numberOfLines={expanded ? null : 2} style={{color: '#666', marginBottom: 2}}>{q}</Text>
                            </View>                    
                        )}
                    </FixedTouchable>
                    {/* <PostGroupMembers community={community} post={post} postInfo={postInfo} /> */}
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
                    <MemberPhotoIcon user={postInfo.from} photoKey={postInfo.fromPhoto} name={postInfo.fromName} size={28} />
                    <View style={{marginLeft: 8}}>
                        <Text style={{fontWeight: 'bold', fontSize: 12}}>{postInfo.fromName}</Text>
                        <Text style={{color: '#999', fontSize: 10}}>{formatTime(postInfo.createTime)}</Text>
                    </View>
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
                <SearchBox value={search} onChangeText={setSearch} placeholder='Search'
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


