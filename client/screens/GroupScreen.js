import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { FixedTouchable, getRootForMessage, GroupIcon, MemberIcon, OneLineText, ScreenContentScroll, searchMatches, WideButton } from '../components/basics';
import { getCurrentUser, getUser, internalReleaseWatchers, watchData } from '../data/fbutil';
import _ from 'lodash';
import { baseColor, minTwoPanelWidth } from '../data/config';
import { getMessageReplies, Message } from '../components/message';
import { MessageEntryBox } from '../components/messageentrybox';
import { GroupContext } from '../components/context';
import { MemberSection } from '../components/membersection';
import { JoinScreen } from './JoinScreen';
import { EnableNotifsBanner } from '../components/notifpermission';
import { reloadIfVersionChanged } from '../data/versioncheck';
import { Entypo } from '@expo/vector-icons';
import { SearchBox } from '../components/searchbox';
import { GroupPhotoIcon } from '../components/photo';
import { Catcher } from '../components/catcher';
import { SubgroupSection } from '../components/subgroupsection';

export function GroupScreenHeader({navigation, route, children}) {
    const {group} = route.params;
    const [name, setName] = useState('');
    const [photo, setPhoto] = useState(null);

    useEffect(() => {
        var x = {}
        watchData(x, ['group', group, 'name'], setName);
        watchData(x, ['group', group, 'photo'], setPhoto);

        return () => internalReleaseWatchers(x);
    }, [group])

    return (
        <FixedTouchable onPress={() => navigation.navigate('groupProfile', {group})}>
            <View style={{flexDirection: 'row', alignItems: 'center', padding: 8}}>
                <GroupPhotoIcon photo={photo} name={name} size={28} style={{opacity: (name && photo) ? 1 : 0}}/>
                <OneLineText style={{fontSize: 16, marginLeft: 8}}>
                    {name}
                </OneLineText>
            </View>
        </FixedTouchable>
    )
}

function getMessagesByAuthor(messages) {
    var byAuthor = {highlight:[]};
    Object.keys(messages).forEach(m => {
        const message = messages[m];
        if (!byAuthor[message.from]) {
            byAuthor[message.from] = [];
        }
        byAuthor[message.from].push(m);
        if (message.highlight) {
            byAuthor.highlight.push(m);
        }
    })
    return byAuthor;
}

function getThreadReplyCount(messages) {
    var rootCounts = {};
    _.keys(messages).forEach(m => {
        const message = messages[m];
        if (message.replyTo) {
            const root = getRootForMessage({messages, messageKey: message.replyTo});
            if (!rootCounts[root]) {
                rootCounts[root] = 1
            } else {
                rootCounts[root] += 1
            }
        }
    })
    return rootCounts;
}

function EmptyScreen() {
    return <View style={{flex:1, backgroundColor: 'white'}}></View>
}

export function GroupScreen({navigation, route}) {
    const {group} = route.params;


    const [name, setName] = useState(null);
    const [members, setMembers] = useState(null);
    const [subgroups, setSubgroups] = useState(null);
    // const [messages, setMessages] = useState(null);
    const [userReadTime, setUserReadTime] = useState(null);
    const [threadReadTime, setThreadReadTime] = useState(null);
    const [groupSet, setGroupSet] = useState(null);
    const [search, setSearch] = useState(null);
    const [blocks, setBlocks] = useState(null);
    // const {width} = useWindowDimensions();
    // const wide = width > minTwoPanelWidth;

    useEffect(() => {
        navigation.setOptions({title: name || ''});
    }, [name])

    // useEffect(() => {
    //     navigation.setOptions({headerLeft: wide ? null : undefined});
    // }, [width])

    useEffect(() => {
        var x = {};        
        watchData(x, ['userPrivate', getCurrentUser(), 'group'], setGroupSet);
        return () => internalReleaseWatchers(x);
    }, [group]);

    useEffect(() => {
        var x = {};
        if (_.get(groupSet,group)) {      
            console.log('is member. Loading group data', group);      
            watchData(x, ['group', group, 'name'], setName);
            watchData(x, ['group', group, 'member'], setMembers);
            watchData(x, ['group', group, 'subgroup'], setSubgroups);
            watchData(x, ['group', group, 'block'], setBlocks);
            watchData(x, ['userPrivate', getUser(), 'readTime', group], setUserReadTime)
            watchData(x, ['userPrivate', getUser(), 'threadReadTime', group], setThreadReadTime)
            return () => internalReleaseWatchers(x);
        }
    },[group, groupSet])

    if (groupSet && !groupSet[group]) {
        return <JoinScreen route={route} navigation={navigation} />
    }

    if (!name || !members || !subgroups ||
        !threadReadTime || !userReadTime || !blocks) return <EmptyScreen/>;

    // console.log('render group', group, threadReadTime);

    const peopleKeys = Object.keys(members);
    const realPeopleKeys = _.filter(peopleKeys, k => k != 'highlight');
    // const realPeopleKeys = _.filter(peopleKeys, k => false);
    const filteredPeopleKeys = search ? _.filter(realPeopleKeys, k => searchMatches(members[k].name, search)) : realPeopleKeys;
    const [memberKeys, visitorKeys] = _.partition(filteredPeopleKeys, k => members[k].role == 'member' || members[k].role == 'admin');
    const filteredSubgroupKeys = search ? _.filter(_.keys(subgroups), k => searchMatches(subgroups[k].name, search)) : _.keys(subgroups);

    const sortedMemberKeys = _.sortBy(memberKeys, k => members[k].time).reverse();
    const sortedVisitorKeys = _.sortBy(visitorKeys, k => members[k].time).reverse();
    const sortedSubgroupKeys = _.sortBy(filteredSubgroupKeys, k => subgroups[k].time).reverse();

    // const threadReplyCounts = getThreadReplyCount(messages);

    // const byAuthor = getMessagesByAuthor(messages);
    // const replies = getMessageReplies(messages);
    const meName = members[getCurrentUser()].name;
    const meRole = members[getCurrentUser()].role;

    return (
        <GroupContext.Provider value={{group, meName, groupName: name, meRole, members, subgroups, blocks, threadReadTime}}>
            <ScreenContentScroll style={{backgroundColor: '#FBF8F4'}}>
                <EnableNotifsBanner />
                {/* <MessageEntryBox group={group} meName={members[getCurrentUser()].name} style={{margin: 8}} /> */}
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <SearchBox value={search} onChangeText={setSearch} placeholder='Search People' 
                        style={{backgroundColor: 'white', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth}}/>
                    {search ? null :
                        <FixedTouchable onPress={()=>navigation.navigate('messagebox', {group})}>
                            <View style={{flexDirection: 'row', alignItems: 'center', 
                                    backgroundColor: baseColor, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginRight: 8}}>
                                <Entypo name='new-message' size={16} style={{color: 'white', marginRight: 5, marginTop: Platform.OS == 'web' ? 2 : 0}}/> 
                                <Text style={{fontSize: 15, color: 'white', fontWeight: 'bold'}}>New Post</Text>
                            </View>
                        </FixedTouchable>
                    }
                </View>
                {search ? null : 
                    <Catcher>
                        <MemberSection member='highlight' key='highlight' lastReadTime={userReadTime['highlight']} />
                    </Catcher>
                }   
                {sortedSubgroupKeys.length > 0 ? 
                    <Text style={{fontSize: 18, color: '#222', marginLeft: 16, marginTop: 16, marginBottom: 4}}>Subgroups</Text>
                : null}
                {sortedSubgroupKeys.map(subgroup => 
                    <Catcher key={subgroup}>
                        <SubgroupSection subgroup={subgroup} lastReadTime={userReadTime[subgroup]} />
                    </Catcher>
                )}                
                <Text style={{fontSize: 18, color: '#222', marginLeft: 16, marginTop: 16, marginBottom: 4}}>Members</Text>
                {sortedMemberKeys.map(member => 
                    <Catcher key={member}>
                        <MemberSection member={member} key={member}
                            lastReadTime={userReadTime[member]} 
                        />
                    </Catcher>
                )}
                <Text style={{fontSize: 18, color: '#222', marginLeft: 16, marginTop: 16, marginBottom: 4}}>Visitors</Text>
                {sortedVisitorKeys.map(member => 
                    <Catcher key={member}>
                        <MemberSection member={member} key={member}
                            lastReadTime={userReadTime[member]} 
                        />
                    </Catcher>
                )}
                {meRole == 'admin' || meRole == 'member' ? 
                    <FixedTouchable style={{alignSelf: 'center'}} onPress={() => navigation.navigate('invite', {group, name})}>
                        <Text style={{color: baseColor, marginVertical: 8}}>Invite more people</Text>
                    </FixedTouchable>
                :null}
                {meRole == 'admin' ? 
                    <FixedTouchable style={{alignSelf: 'center'}} onPress={() => navigation.navigate('addsubgroup', {group, name})}>
                        <Text style={{alignSelf: 'center', color: baseColor, marginVertical: 8}}>Add subgroups</Text>
                    </FixedTouchable>
                :null}

            </ScreenContentScroll>
        </GroupContext.Provider>
    )
}

