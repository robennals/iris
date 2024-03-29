import React, { useContext, useEffect, useState } from 'react';
import { Platform, SafeAreaView, ScrollView, SectionList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { firstLine, FixedTouchable, GroupIcon, HeaderSpaceView, MemberIcon, OneLineText, ScreenContentScroll, searchMatches, WideButton } from '../components/basics';
import { appName, baseColor, minTwoPanelWidth } from '../data/config';
import { getCurrentUser, getFirebaseServerTimestamp, internalReleaseWatchers, isMasterUser, setDataAsync, watchData } from '../data/fbutil';
import _ from 'lodash';
import { NotifIcon } from '../components/notificon';
import { SearchBox } from '../components/searchbox';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { CommunityPhotoIcon, GroupMultiIcon, GroupPhotoIcon, MemberPhotoIcon } from '../components/photo';
import { Catcher } from '../components/catcher';
import { AppPromo } from '../components/apppromo';
import * as Notifications from 'expo-notifications';
import { reloadIfVersionChanged } from '../data/versioncheck';
import { GroupPreview, isGroupUnread } from '../components/grouppreview';
import { track } from '../components/shim';
import { ConnectedBanner } from '../components/connectedbanner';
import { StatusBar } from 'expo-status-bar';
import { Loading } from '../components/loading';



function CommunityPreview({community, name, communityInfo, highlight}) {
    const unread = isGroupUnread(communityInfo);

    var summaryLine = '';
    if (communityInfo.lastMessage) {
        const prefix = communityInfo?.lastMessage?.fromName ? communityInfo.lastMessage.fromName + ': ' : '';

        summaryLine = prefix + firstLine(_.get(communityInfo,['lastMessage','text'],''))
    }

    const isPreview = communityInfo?.lastMessage?.text == 'Community you can join'

    return (
        <View style={[styles.groupPreview, 
                highlight ? {backgroundColor: '#eee'} : null]}>
            <CommunityPhotoIcon photoKey={communityInfo.photoKey} photoUser={communityInfo.photoUser} size={54} />

            <View style={styles.groupPreviewRight}>
                <View style={{alignSelf: 'flex-start', paddingHorizontal: 6, marginBottom: 1, paddingVertical: 1, 
                    borderRadius: 8, borderColor: unread ? 'black' : '#ddd', borderWidth: StyleSheet.hairlineWidth}}>
                    <Text style={{fontSize: 10, color: unread ? 'black' : '#666'}}>{isPreview ? 'Community you can join' : 'Conversation Feed'}</Text>
                </View>
                <OneLineText style={{fontSize: 16, fontWeight: unread ? 'bold' : null}}>
                    {name}
                </OneLineText>
                <OneLineText numberOfLines={1} style={{
                        color: '#666', marginTop: 0,
                        fontWeight: unread ? 'bold' : null}}>
                    {summaryLine}
                </OneLineText>
            </View>
        </View>
    )
}

function WaitingForMatchesPreview({highlight}) {
    return (
        <View style={[styles.groupPreview, 
            highlight ? {backgroundColor: '#eee'} : null]}>
            <Entypo name='clock' size={54} />
            <View style={styles.groupPreviewRight}>
            <Text style={{fontSize: 16, fontWeight: 'bold'}}>Waiting for Matches</Text>
            </View>
        </View>
    )

}


function mergeObjectSets(a, b) {
    if (!b) return a;

    const keys = [..._.keys(a), ..._.keys(b)];
    const out = {};
    _.forEach(keys, k => {
        const aObj = a[k] || {};
        const bObj = b[k] || {};
        if (!out[k]) {
            out[k] = {...aObj, ...bObj};
        }
    })
    return out;
}

function groupNeedsRating(groupInfo) {
    return !groupInfo.rating && groupInfo.lastMessage;
}


const defaultCommunitySet = {
    '-NAilGYooypt_utC2dJ3': {
        name: 'General Community',
        lastMessage: {text: 'Community you can join', time: 1663714708562},
        photoKey: '-NAilGV6ZJ-eJjeTt4kq',
        photoUser: '8Nkk25o9o6bipF81nvGgGE59cXG2'
    },
    '-NCS3mSw7G2gm5Koihuc': {
        name: 'Iris Users',
        photoKey: '-NCS3mRqT0n2Whhumf9R',
        photoUser: 'N8D5FfWwTxaJK65p8wkq9rJbPCB3',
        lastMessage: {text: 'Community you can join', time: 1663715183992}
    }
}

function ThingPreview({k, communitySet, groupSet, allCommunities, selected, showSelected}) {
    if (communitySet[k]) {
        return (
            <CommunityPreview community={k} name={communitySet[k].name}
                highlight={selected == k && showSelected}
                communityInfo={communitySet[k]} 
            />
        )
    } else {
        return (
            <GroupPreview group={k} name={groupSet[k].name}
                allCommunities={allCommunities}
                highlight={selected == k && showSelected}
                groupInfo={groupSet[k]} shrink={false}
            />
        )
    }
}

export class GroupList extends React.PureComponent {
    state = {groupSet: null, showArchived: false, selected: null, 
        localCommSet: null, masterCommSet: null,
        search: '', name: null, photo: null, allCommunities: {}}

    async componentDidMount() {    
        watchData(this, ['userPrivate', getCurrentUser(), 'group'], groupSet => this.setState({groupSet}));
        watchData(this, ['userPrivate', getCurrentUser(), 'name'], name => this.setState({name}));        
        watchData(this, ['userPrivate', getCurrentUser(), 'photo'], photo => this.setState({photo}), null);
        watchData(this, ['community'], allCommunities => this.setState({allCommunities}));
        watchData(this, ['userPrivate', getCurrentUser(), 'comm'], localCommSet => this.setState({localCommSet}));

        if (isMasterUser()) {
            watchData(this, ['community'], masterCommSet => this.setState({masterCommSet}));
        } 
    }
    async componentWillUnmount() {
        internalReleaseWatchers(this);
    }

    async selectGroupOrCommunity(k) {
        const {localCommSet, masterCommSet, groupSet} = this.state;
        const {navigation, singleScreen} = this.props;
        reloadIfVersionChanged();

        const communitySet = isMasterUser() ? mergeObjectSets(localCommSet, masterCommSet) : {...defaultCommunitySet, ...localCommSet};

        const isCommunity = communitySet[k];

        var groupCommunity = null;
        if (isCommunity) {
            track('View Community', {community: k, communityName: communitySet[k].name});
        } else {
            track('View Group', {group: k, groupName: groupSet[k].name});
            groupCommunity = groupSet[k].community;
        }

        const thingType = communitySet[k] ? 'community' : 'group';
        const dataName = communitySet[k] ? 'comm' : 'group';


        this.setState({selected: k});
        if (singleScreen || Platform.OS == 'web') {           
            navigation.navigate(thingType, {[thingType]: k, openTime: Date.now()});
        } else {
            navigation.reset({
                index: 1,
                routes: [
                    { name: 'home'},
                    { name: thingType, params: {[thingType]: k}}
                ],
            })
        }
        const time = getFirebaseServerTimestamp();
        setDataAsync(['userPrivate', getCurrentUser(), dataName, k, 'readTime'], time);
        setDataAsync(['userPrivate', getCurrentUser(), 'lastAction'], time)

        if (!isCommunity) {
            setDataAsync(['group', k, 'memberRead', getCurrentUser()], time);
            // console.log('logging read', groupCommunity || 'no community' , k, getCurrentUser());
            if (groupCommunity) {
                setDataAsync(['adminCommunity', groupCommunity, 'group', k, 'memberRead', getCurrentUser()], time);
            }
        }
    }

    render() {
        const {navigation, showSelected, shrink, wide} = this.props;
        const {groupSet, localCommSet, masterCommSet, selected, search, name, photo, allCommunities, showArchived} = this.state;

        if (!groupSet || !localCommSet) {
            return <Loading />;
        }

        const communitySet = isMasterUser() ? mergeObjectSets(localCommSet, masterCommSet) : 
            mergeObjectSets(defaultCommunitySet, localCommSet);
            
        // console.log('communitySet', {communitySet, defaultCommunitySet, localCommSet});

        const groupKeys = Object.keys(groupSet || {});
        const communityKeys = Object.keys(communitySet || {});
        // var filteredGroupKeys = groupKeys;
        var filteredGroupKeys = _.filter(groupKeys, k => groupSet[k].name);
        var filteredCommunityKeys = communityKeys;
        if (search) {
            filteredGroupKeys = _.filter(groupKeys, k => searchMatches(groupSet[k].name, search))
            filteredCommunityKeys = _.filter(communityKeys, k => searchMatches(communitySet[k].name, search));
        }
        const filteredGroupAndCommunityKeys = [...filteredGroupKeys, ...filteredCommunityKeys];
        const allSet = {...groupSet, ...communitySet};
        const sortedGroupAndCommunityKeys = _.sortBy(filteredGroupAndCommunityKeys, k => _.get(allSet,[k,'lastMessage','time'],0)).reverse();

        const [archivedKeys, shownKeys] = _.partition(sortedGroupAndCommunityKeys, k => 
            _.get(allSet,[k,'archived']) && !groupNeedsRating(groupSet[k]));

        // console.log('partition', {archivedKeys, shownKeys});

        // console.log('keys', {filteredGroupKeys, filteredCommunityKeys, sortedGroupAndCommunityKeys, groupSet})

        if (Platform.OS != 'web') {
            const unreadGroups = _.filter(groupKeys, k => isGroupUnread(groupSet[k]));
            const unreadCount = unreadGroups.length;
            Notifications.setBadgeCountAsync(unreadCount);
        }

        return (
            <HeaderSpaceView>
            {wide ? null :
                    <ConnectedBanner />
                }
                <StatusBar style='dark' />
            <ScrollView style={{backgroundColor: 'white', flexShrink: 1}}>
                {Platform.OS == 'android' ?
                    <View style={{height: 16}} />
                : null}

                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 8, marginHorizontal: 8}}>
                    <SearchBox value={search} onChangeText={search => this.setState({search})} 
                        placeholder='Search Conversations'
                        style={{marginHorizontal: 8, flex: 1}}
                    />
                    {search ? null :
                        <FixedTouchable onPress={() => navigation.navigate('myProfile')}>
                            <MemberPhotoIcon photoKey={photo} name={name} user={getCurrentUser()} size={32} />
                        </FixedTouchable>
                    }
                </View>
                {shownKeys.map(k => 
                    <Catcher key={k}>
                        <FixedTouchable key={k} onPress={() => this.selectGroupOrCommunity(k)}>
                            <ThingPreview k={k} communitySet={communitySet} groupSet={groupSet} allCommunities={allCommunities} selected={selected} showSelected={showSelected} />
                        </FixedTouchable>
                    </Catcher>
                )}
                {showArchived ?
                    <View style={{margin: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopColor: '#ddd', paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, marginBottom: 8}}>
                        <Text>COMPLETED</Text>
                        <FixedTouchable onPress={() => this.setState({showArchived: false})}>
                            <View style={{borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, borderColor: '#ddd', paddingHorizontal: 8, paddingVertical: 4}}>
                                <Text style={{color: '#666', fontSize: 12}}>Hide</Text>
                            </View>
                        </FixedTouchable>
                    </View>
                :null}

                {!showArchived && archivedKeys.length > 0 ?
                <FixedTouchable onPress={() => this.setState({showArchived: !showArchived})} style={{margin: 16}}>
                    <View style={{alignSelf: 'center', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16}}>
                        <Text style={{color: '#666'}}>
                            Show {archivedKeys.length} completed conversations
                        </Text>
                    </View>
                </FixedTouchable>
                :null}
                {showArchived ?
                    archivedKeys.map(k => 
                        <Catcher key={k}>
                            <FixedTouchable key={k} onPress={() => this.selectGroupOrCommunity(k)}>
                                <ThingPreview k={k} communitySet={communitySet} groupSet={groupSet} allCommunities={allCommunities} selected={selected} showSelected={showSelected} />
                            </FixedTouchable>
                        </Catcher>
                    )
                    
                : null}
                {/* {shrink ? null : 
                    <FixedTouchable onPress={() => navigation.navigate('joinOrCreate')}>
                        <Text style={{alignSelf: 'center', color: baseColor, marginTop: 8}}>Join or Create a group</Text>
                    </FixedTouchable>
                }    */}
                <View style={{borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd', marginTop: 32}} />
                    
                <FixedTouchable onPress={() => navigation.navigate('about')}>
                    <Text style={{alignSelf: 'center', color: baseColor, marginVertical: 16}}>{shrink ? 'About' : ('About ' + appName)}</Text>
                </FixedTouchable>
                <FixedTouchable onPress={() => navigation.navigate('feedback')}>
                    <Text style={{alignSelf: 'center', color: baseColor, marginVertical: 16}}>Send Feedback</Text>
                </FixedTouchable>


                {/* {isMasterUser() ? 
                    <FixedTouchable onPress={() => navigation.navigate('adminCreateGroup')}>
                        <Text style={{alignSelf: 'center', color: baseColor, marginVertical: 16}}>Create Group (admin)</Text>
                    </FixedTouchable>
                :null} */}
                {isMasterUser() ? 
                    <FixedTouchable onPress={() => navigation.navigate('createCommunity')}>
                        <Text style={{alignSelf: 'center', color: baseColor, marginVertical: 16}}>Create Community (admin)</Text>
                    </FixedTouchable>
                :null}


                {/* TODO: Bring back link to app once app is available */}
                {Platform.OS == 'web' ?
                    <AppPromo />
                :null}
            </ScrollView>
            </HeaderSpaceView>
        )
    }
}

export function SidePanel({navigation}) {
    const {width} = useWindowDimensions();
    const wide = width > minTwoPanelWidth;

    if (wide) {
        return (
            <View style={{
                borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#ddd',
                minWidth: 200, maxWidth: 400, flex: 0.5, backgroundColor: '#ddd'}}>
              <GroupList navigation={navigation} showSelected={true} />
            </View>
        )
    } else {
        return null;
    }
}

export function EmptyScreen() {
    return (
        <View style={{backgroundColor: '#fbf8f4', flex: 1}}></View>
    )
}

export function HomeScreen({navigation, route, shrink}) {
    const wide = route?.params?.wide;
    return <GroupList navigation={navigation} singleScreen={true} shrink={shrink} wide={wide}  showSelected />
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupPreview: {
        maxWidth: 500, marginHorizontal: 8, padding: 8, marginVertical: 4, backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        height: 66
        // borderColor: '#ddd', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
    },
    shrinkGroupPreview: {
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 4,
        height: 66,
        justifyContent: 'space-around',
        // borderRadius: 8
    },

    groupPreviewTitle: {
        fontSize: 16, color: 'black'
    },
    groupPreviewRight: {
        flex: 1,
        marginLeft: 12
    },
    p: {
        marginVertical: 8,
        maxWidth: 500,
        color: '#222'
    }
  });
  