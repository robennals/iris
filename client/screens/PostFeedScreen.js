import React, { useState } from 'react';
import { FlatList, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCurrentUser, isMasterUser, setDataAsync, useDatabase } from '../data/fbutil';
import _ from 'lodash';
import { Action, andFormatStrings, firstName, FixedTouchable, Header, HeaderSpaceView, memberKeysToHues, MyViewpointPreview, name_label, OneLineText, ScreenContentScroll, searchMatches, SmallMinorButton, toBool, ViewpointActions, WideButton } from '../components/basics';
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

export function PostFeedScreenHeader({navigation, route}) {
    const {community} = route.params;
    const communityInfo = useDatabase([community], ['community', community]);

    if (!communityInfo) return null;

    return (
        <FixedTouchable onPress={() => navigation.navigate(isMasterUser() ? 'editCommunity' : 'communityProfile', {community})}>
            <View style={{flexDirection: 'row', alignItems: 'center', padding: 8}}>
                <CommunityPhotoIcon photoKey={communityInfo?.photoKey} photoUser={communityInfo.photoUser} name={communityInfo.name} size={28} />
                <View style={{marginLeft: 8}}>
                    <Text>{communityInfo.name}</Text>
                    <Text style={{color: '#666', fontSize: 11}}>Conversation Feed</Text>
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

function NewUpdate({community, post, newUpdate}) {
    const [expanded, setExpanded] = useState(newUpdate);
    const [text, setText] = useState('');
    const [inProgress, setInProgress] = useState(false);
 
    async function onSubmit(){
        setInProgress(true);
        await editUpdateAsync({community, post, text});
        setInProgress(false);
        setExpanded(false);
    }

    if (expanded) {
        return (
            <View style={{marginBottom: 16}}>
                <View style={{borderRadius: 16, borderColor: '#ddd', marginBottom: 4, backgroundColor: 'white', 
                    borderWidth: StyleSheet.hairlineWidth, justifyContent: 'space-between'}}>
                    <TextInput autoFocus style={{padding: 8, height: 100, borderRadius: 8}}
                        placeholder='Write a new public update'
                        placeholderTextColor='#666'
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
                                <Text style={{color: 'white', paddingHorizontal: 8, paddingVertical: 4}}>Publish Update</Text>
                            </View>
                        </FixedTouchable>
                    </View>
                }
            </View>

        )
    } else {
        return (
            <FixedTouchable onPress={() => setExpanded(true)}>
                <View style={{borderColor: '#ddd', backgroundColor: 'white', 
                        borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 8, marginBottom: 16}}>
                    <Text style={{color: '#666'}}>Write a new public update</Text>
                </View>
            </FixedTouchable>
        )
    }

}

function ConversationFeedHelp({communityName}) {
    return (
        <Help id='conversationfeed' title='About the Conversation Feed' style={{marginTop: 16}}>
            <HelpText>
                The conversation feed contains private conversations that you can ask to join.
            </HelpText>
            <HelpText>
                Each conversation is run by a host. The host writes a post describing what they
                want to talk about, decides who to let into their conversation, and moderates the conversation.
            </HelpText>
            <HelpText>
                You can use conversations for lots of things. To get feedback on an idea, to make a decision,
                to organize a group of people to perform some task, to get help with something, 
                to get to know other community members better, 
                or just to chat about something that's on your mind.
            </HelpText>

        </Help>
    )
}


function PostGroupMembers({community, post, postInfo}) {
    const navigation = useCustomNavigation();
    const members = postInfo.member;
    const realMemberKeys = _.filter(_.keys(members), m => m != 'zzz_irisbot')
    if (!members || realMemberKeys.length < 2 || members[getCurrentUser()]) {
        return null;
    }
    const memberKeys = realMemberKeys;
    const names = andFormatStrings(_.map(memberKeys, k => members[k].name));
    return (
        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            {_.map(realMemberKeys, m => 
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
    } else if (_.keys(postInfo?.member).length >= 5) {
        return <Text style={{borderTopColor: '#ddd', 
            borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 8}}>
            Conversation is full
        </Text>
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
                    <TextInput autoFocus style={{padding: 8, height: 100, borderRadius: 16, textAlignVertical: 'top'}}
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
    const {community, post, newUpdate} = route.params;
    const postInfo = useDatabase([community, post], ['post', community, post]);
    const readTime = useDatabase([community, post],['userPrivate', getCurrentUser(), 'postRead', community, post]);
    const youAsked = useDatabase([community, post], ['userPrivate', getCurrentUser(), 'youAskedPost', community, post], null);    
    const updates = useDatabase([community, post], ['update', community, post]);
    const topicInfo = useDatabase([community, post, postInfo?.topic], ['postTopic', community, postInfo?.topic]);

    if (!postInfo || !updates || postInfo.topic && !topicInfo) return <Loading />

    console.log('youAsked', youAsked);

    const sortedUpdateKeys = _.sortBy(_.keys(updates), u => updates[u].time).reverse();;

    return (
        <KeyboardSafeView size={{flex: 1}}>
            <StatusBar style='dark' />
            <HeaderSpaceView style={{flex: 1}}>
                <PhotoPromo />
                <ScrollView style={{flex: 1, flexShrink: 1, backgroundColor: '#fcf8f4'}}>
                    <MemoPost expanded community={community} post={post} topicInfo={topicInfo} postInfo={postInfo} readTime={readTime} youAsked={youAsked} />
                    <View style={{flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch'}}>
                        <View style={{marginVertical: 8, marginHorizontal: 16, flex: 1, maxWidth: 450}}>
                            {sortedUpdateKeys.length > 0 || postInfo.from == getCurrentUser() ? 
                                <Text style={{fontSize: 18, marginTop: 8, marginBottom: 8, fontWeight: 'bold', marginLeft: 8}}>Public Updates</Text>
                            : null}
                            {postInfo.from == getCurrentUser() ?
                                <NewUpdate community={community} post={post} newUpdate={newUpdate} />
                            : null}
                            <View>
                                {sortedUpdateKeys.map(u => 
                                    <PostUpdate key={u} updateInfo={updates[u]} canEdit={postInfo.from == getCurrentUser()} community={community} post={post} update={u} />
                                )}
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </HeaderSpaceView>
        </KeyboardSafeView>
    )
}

function PostUpdate({updateInfo, community, post, update, canEdit}) {
    const [edit, setEdit] = useState(false);
    const [text, setText] = useState(updateInfo.text);
    const [inProgress, setInProgress] = useState(false);
 
    async function onSubmit(){
        setInProgress(true);
        await editUpdateAsync({community, post, update, text});
        setInProgress(false);
        setEdit(false);
    }

    if (edit) {
        return (
            <View style={{marginBottom: 16}}>
                <View style={{borderRadius: 16, borderColor: '#ddd', marginBottom: 4, backgroundColor: 'white', 
                    borderWidth: StyleSheet.hairlineWidth, justifyContent: 'space-between'}}>

                    <TextInput autoFocus style={{padding: 8, height: 100, borderRadius: 8}}
                        placeholder='Write a new public update'
                        placeholderTextColor='#666'
                        value={text}
                        multiline                    
                        onChangeText={setText}
                    />
                </View>
                {inProgress ? 
                    <Text style={{color: '#666', alignSelf: 'flex-end', marginRight: 16}}>Submitting...</Text>
                : 
                    <View style={{flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center'}}>
                        <FixedTouchable onPress={() => setEdit(false)}>
                            <Text style={{color: '#666', marginRight: 16}}>Cancel</Text>
                        </FixedTouchable>
                        <FixedTouchable onPress={onSubmit}>
                            <View style={{backgroundColor: baseColor, borderRadius: 16, alignSelf: 'flex-end'}}>
                                <Text style={{color: 'white', paddingHorizontal: 8, paddingVertical: 4}}>Submit Edit</Text>
                            </View>
                        </FixedTouchable>
                    </View>
                }
            </View>
        )
    } else {
        return (
            <View style={{backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, 
                    padding: 8, borderRadius: 8, marginVertical: 4}}>           
                <LinkText text={updateInfo.text} />
                {canEdit ? 
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 8}}>
                        <FixedTouchable onPress={() => setEdit(true)}>
                            <Text style={{color: '#666', fontSize: 13}}>Edit</Text>
                        </FixedTouchable>
                        <Text style={{color: '#666', fontSize: 13}}> - {formatTime(updateInfo.time)}</Text>
                    </View>
                : 
                    <Text style={{color: '#666', fontSize: 13, alignSelf: 'flex-end'}}> - {formatTime(updateInfo.time)}</Text>
                }
            </View>
        )
    }
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
    // console.log('PostFeedScreen', route.params);
    const {community, post: boostedPostKey} = route.params;
    const posts = useDatabase([community], ['post', community]);
    const topics = useDatabase([community], ['postTopic', community]);
    const postRead = useDatabase([community],['userPrivate', getCurrentUser(), 'postRead', community]);
    const localComm = useDatabase([community], ['userPrivate', getCurrentUser(), 'comm', community], false);
    const youAskedPost = useDatabase([community], ['userPrivate', getCurrentUser(), 'youAskedPost', community]);
    const followAvoid = useDatabase([], ['perUser', 'followAvoid', getCurrentUser()]);

    if (getCurrentUser() == null || (!isMasterUser() && localComm != null && !localComm?.name)) {
        return (
            <IntakeScreen community={community} />
        )
    }

    const isMember = toBool(localComm?.name);

    if (!posts || !topics || !postRead || !localComm || !youAskedPost || !followAvoid) return <Loading />

    const sortedPostKeys = _.sortBy(_.keys(posts), p => posts[p].createTime).reverse();

    // console.log('localComm', localComm, localComm?.name);

    const postBoosts = _.mapValues(posts, postInfo => getPostBoost({postInfo, followAvoid}));
    const [boostedPostKeys, nonBoostedPostKeys] = _.partition(sortedPostKeys, p => postBoosts[p]);
    // console.log('postkeys', {boostedPostKeys, nonBoostedPostKeys, postBoostTimes: postBoosts});

    const hostClusters = clusterPostsByHost({posts, sortedPostKeys:nonBoostedPostKeys});
    const hostAndTopicKeys = [... _.keys(hostClusters), ... _.keys(topics)];
    const sortedHostAndTopicKeys = _.sortBy(hostAndTopicKeys, h => hostClusters[h]?.time || topics[h]?.time || 0).reverse();

    return (
        <KeyboardSafeView size={{flex: 1}}>
            <StatusBar style='dark' />
            <HeaderSpaceView style={{flex: 1}}>
                <PhotoPromo />
                {isMasterUser() && !isMember ? 
                    <NonMemberWarning />
                : null}
                <View style={{backgroundColor: 'white', flex: 1}}>
                    {isMasterUser() ? 
                        <CommunityAdminActions community={community} />
                    : null
                    } 
                    <PostList postBoosts={postBoosts} posts={posts} sortedHostAndTopicKeys={sortedHostAndTopicKeys} hostClusters={hostClusters} topics={topics} boostedPostKeys={boostedPostKeys} sortedPostKeys={sortedPostKeys} community={community} postRead={postRead} youAskedPost={youAskedPost} />
                </View>
            </HeaderSpaceView>
        </KeyboardSafeView>
    )
}

function NonMemberWarning() {
    return (
        <View style={{ backgroundColor: '#F3F7C0', 
                borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, 
                padding: 8, margin: 0}}>
            <Text style={{fontWeight: 'bold'}}>
                You are not a member of this community.
            </Text>
            <Text>
                As a master user, you can look at this community, but you cannot create or join 
                conversations unless you become a member.
            </Text> 
        </View>
    )
}


function PostList({posts, topics, postBoosts, sortedHostAndTopicKeys, boostedPostKeys, hostClusters, sortedPostKeys, community, postRead, youAskedPost}) {
    const [search, setSearch] = useState('');
    var filteredPostKeys = boostedPostKeys;
    if (search) [
        filteredPostKeys = _.filter(sortedPostKeys, p => searchMatches(posts[p].title, search))
    ]

    // console.log('hostClusters', hostClusters, sortedHostKeys);


    return (
        <ScrollView style={{flex: 1, flexShrink: 1, backgroundColor: '#fcf8f4'}}>
            <ConversationFeedHelp />

            <SearchNewHeader community={community} search={search} setSearch={setSearch} />
            {filteredPostKeys.length > 0 ?
                <Header style={{marginTop: 16}}>Highighted Conversations</Header>
            : null}
            {filteredPostKeys.map(post => 
                <Catcher key={post} style={{alignSelf: 'stretch'}}>
                    <MemoPost boost={postBoosts[post]} community={community} post={post} topicInfo={topics[posts[post]?.topic]} postInfo={posts[post]} readTime={postRead[post]} youAsked={youAskedPost[post]} />
                </Catcher>
            )}
            {filteredPostKeys.length > 0 ?
                <Header style={{marginTop: 16}}>Other Conversations</Header>
            
            : null}
            {search ? null : 
                sortedHostAndTopicKeys.map(hostOrTopic => 
                    <Catcher key={hostOrTopic} style={{alignSelf: 'stretch'}}>
                        {hostClusters[hostOrTopic] ? 
                            <MemoHostCluster community={community} topics={topics} posts={posts} host={hostOrTopic} hostCluster={hostClusters[hostOrTopic]} youAskedPost={youAskedPost} />
                        :
                            <PostTopic community={community} topic={hostOrTopic} topicInfo={topics[hostOrTopic]} />
                        }
                    </Catcher>
                )
            }
            <View style={{height: 100}} />

        </ScrollView>
    )
}


function PostTopic({expanded, community, topic, topicInfo}) {
    const navigation = useCustomNavigation();
    return (
        <View style={{flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch'}}>
            <View style={{marginVertical: 8, marginHorizontal: 16, flex: 1, maxWidth: 450}}>
                <View style={{
                            backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                            borderRadius: 8, padding: 8,
                            ...lightShadowStyle
                    }}>
                    <FixedTouchable onPress={() => navigation.navigate('topic', {community, topic})}>
                        <View style={{flexDirection: 'row', marginBottom: 2}}>
                            <View style={{borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingHorizontal: 4}}>
                                <Text style={{color: '#666', fontSize: 11}}>Topic</Text>
                            </View>
                            <Text style={{color: '#999', fontSize: 12}}> - {formatTime(topicInfo.time)}</Text>
                        </View>

                        {/* <Text style={{color: '#999', fontSize: 12}}>New Topic<Text style={{color: '#999'}}> - {formatTime(topicInfo.time)}</Text></Text> */}
                        <Text style={{fontSize: 18, marginBottom: 8}}><Text style={{fontWeight: 'bold'}}>{topicInfo.name}</Text></Text>
                        <Text numberOfLines={expanded ? null : 2} style={{fontSize: 16, color: '#666', marginBottom: 12}}>{topicInfo.summary}</Text>
                    </FixedTouchable>
                    <FixedTouchable onPress={() => navigation.navigate('newTopicPost', {community, topic})}>
                        <View style={{backgroundColor: baseColor, borderRadius: 16, alignSelf: 'flex-start'}}>
                            <Text style={{color: 'white', paddingHorizontal: 8, paddingVertical: 4}}>New Conversation</Text>
                        </View>
                    </FixedTouchable>
                </View>
            </View>
        </View>
    )
}


const lightShadowStyle = {
    shadowRadius: 2, shadowColor: '#555', shadowOffset: {width: 0, height: 1},
        // borderColor: '#ddd', borderWidth: 2,
    shadowOpacity: 0.5, elevation: 2}


const MemoHostCluster = React.memo(HostCluster);

function HostCluster({community, host, topics, posts, hostCluster, youAskedPost}) {
    const navigation = useCustomNavigation();
    return (
        <View>
            <MemoPost community={community} post={hostCluster.leadPost} 
                    topicInfo={topics[posts[hostCluster.leadPost]?.topic]} postInfo={posts[hostCluster.leadPost]} youAsked={youAskedPost[hostCluster.leadPost]} />            
            {hostCluster.otherPosts.length > 0 ? 
                <View style={{flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch'}}>
                    <View style={{marginBottom: 8, marginHorizontal: 16, flex: 1, maxWidth: 450}}>
                        <View style={{
                            backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                            borderRadius: 4, padding: 8,
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


export const MemoPost = React.memo(Post);



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


function Post({community, boost, post, topicInfo, postInfo, readTime, youAsked, expanded, hideTopic}) {
    const navigation = useCustomNavigation();
    const questions = _.filter(_.map((postInfo.questions || '').split('\n'), q => q.trim()), s => s);
    const shownQuestions = expanded ? questions : (postInfo.lastUpdate ? [] : questions.slice(0,3));
    const topic = postInfo.topic;
    return (
        <View style={{flexDirection: 'row', justifyContent: 'center', alignSelf: 'stretch'}}>
            <View style={{marginVertical: 8, marginHorizontal: 16, flex: 1, maxWidth: 450}}>
                {expanded && topic && !hideTopic ?
                    <TopicPromo community={community} topic={topic} topicInfo={topicInfo} /> 
                : null}
                {boost ? 
                    <BoostInfo boost={boost} postInfo={postInfo} />
                : null}
                <View style={{
                        backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                        borderRadius: 8, padding: 8,
                        ...lightShadowStyle
                }}> 
                    <PostHostLine expanded={expanded} hideTopic={hideTopic || expanded} topic={postInfo.topic} topicInfo={topicInfo} community={community} topic={postInfo.topic} topicInfo={topicInfo} post={post} postInfo={postInfo} />
                    <FixedTouchable dummy={expanded} onPress={() => navigation.navigate('post', {community, post})}>
                        <Text numberOfLines={expanded ? null : 1} style={{fontWeight: 'bold', fontSize: 18, marginVertical: 8}}>{postInfo.title}</Text>
                        {expanded ? 
                            <LinkText style={{color: '#666', fontSize: 16}} text={postInfo.text} />
                        : 
                            <Text style={{color: '#666', fontSize: 16}} numberOfLines={2}>{postInfo.text}</Text>
                        }
                        {!expanded && postInfo.lastUpdate ? 
                            <View style={{marginTop: 8}}>
                                <Text style={{fontSize: 12}}><Text style={{fontWeight: 'bold'}}>Update</Text> - {formatTime(postInfo.lastUpdate.time)}</Text>
                                <Text style={{color: '#666', fontSize: 16}} numberOfLines={3}>{postInfo.lastUpdate.text}</Text>
                            </View>
                           : null 
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
                {expanded ? 
                    <FixedTouchable onPress={() => navigation.navigate('reportAbuse', {community, thing:post, thingType: 'post'})}>
                        <Text style={{color: '#999', fontSize: 12, marginTop: 4, marginLeft: 4}}>                        
                            <FontAwesome name='flag' /> Report Abuse</Text>
                    </FixedTouchable>
                : null}
            </View>
        </View>
    )
}

function TopicPromo({community, topic, topicInfo}) {
    const navigation = useCustomNavigation();
    return (
        <FixedTouchable onPress={() => navigation.navigate('topic', {community, topic})}>
            <View style={{backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                    borderRadius: 8, padding: 8, marginBottom: 8,
                    ...lightShadowStyle}}>
                <Text><Text style={{color: '#666'}}>about</Text> <Text style={{fontWeight: 'bold'}}>{topicInfo.name}</Text></Text>
            </View>
        </FixedTouchable>
    )
}


function PostHostLine({community, post, hideTopic, topic, topicInfo, postInfo, expanded}) {
    const navigation = useCustomNavigation();
    const canEdit = postInfo.from == getCurrentUser() || isMasterUser();

    return (
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>                
                    <FixedTouchable onPress={() => navigation.navigate('profile', {community, member: postInfo.from})}>
                        <MemberPhotoIcon user={postInfo.from} photoKey={postInfo.fromPhoto} name={postInfo.fromName} size={32} />
                    </FixedTouchable>
                    <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
                        <View style={{marginLeft: 8, marginRight: 8}}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <FixedTouchable onPress={() => navigation.navigate('profile', {community, member: postInfo.from})}>            
                                    <Text numberOfLines={1} style={{fontWeight: 'bold', fontSize: 14, flexShrink: 1}}>{postInfo.fromName}</Text>
                                </FixedTouchable>
                                {topic && !expanded && !hideTopic ?
                                    <FixedTouchable onPress={() => navigation.navigate('topic', {community, topic})}>
                                        <Text numberOfLines={1} style={{fontWeight: 'bold', fontSize: 14, marginLeft: 0, flexShrink: 2}}>
                                            <Entypo name='chevron-right' />
                                            {/* <Text style={{fontWeight: 'normal', color: '#666'}}> about </Text> */}
                                            {topicInfo?.name}
                                        </Text>
                                    </FixedTouchable> 
                                : null}               
                            </View>
                            <Text style={{color: '#999', fontSize: 12}}>{formatTime(postInfo.createTime)}</Text>
                        </View>
                        {expanded && postInfo.from != getCurrentUser() ? 
                            <FollowButton mini style={{marginLeft: 8}} user={postInfo.from} firstName={' ' + firstName(postInfo.fromName)} />
                        : null}
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
    )
}

function SearchNewHeader({community, search, setSearch}) {
    const navigation = useCustomNavigation();
    return (
        <View style={{flexDirection: 'row', justifyContent: 'center'}}>
            <View style={{flexDirection: 'row', maxWidth: 450, marginHorizontal: 16, marginTop: 0, flex: 1, alignItems: 'center'}}>
                <SearchBox value={search} onChangeText={setSearch} placeholder='Search Conversations'
                    style={{backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
                    marginHorizontal: 0}} />              
                {/* {search ? null : 
                    <WideButton alwaysActive
                        onPress={() => navigation.navigate('newPost', {community})} 
                        // onPress={() => console.log('community', community)}
                        innerStyle={{fontSize: 14, marginHorizontal: 6}}
                        style={{alignSelf: 'center', margin: 0, marginLeft: 8, paddingVertical: 6, paddingHorizontal: 6}}>New Conversation
                    </WideButton>
                } */}
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
            <SmallMinorButton alwaysActive onPress={() => navigation.navigate('newTopic', {community})}>New Topic</SmallMinorButton>
        </View>
    )
}


