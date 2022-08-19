import React, { useContext, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { firstLine, FixedTouchable, GroupIcon, MemberIcon, OneLineText, ScreenContentScroll, searchMatches, WideButton } from '../components/basics';
import { AppContext } from '../components/context';
import { appName, baseColor, minTwoPanelWidth } from '../data/config';
import { getCurrentUser, internalReleaseWatchers, isMasterUser, setDataAsync, watchData } from '../data/fbutil';
import _ from 'lodash';
import { NotifIcon } from '../components/notificon';
import { SearchBox } from '../components/searchbox';
import { Ionicons } from '@expo/vector-icons';
import { GroupMultiIcon, GroupPhotoIcon, MemberPhotoIcon } from '../components/photo';
import { Catcher } from '../components/catcher';
import { AppPromo } from '../components/apppromo';
import * as Notifications from 'expo-notifications';


function isGroupUnread(groupInfo) {
    return (_.get(groupInfo,'readTime', 0) < _.get(groupInfo, ['lastMessage', 'time'], 0))
        && _.get(groupInfo, ['lastMessage', 'from']) != getCurrentUser();
}

function GroupPreview ({group, name, groupInfo, highlight, shrink}) {
    const [members, setMembers] = useState(null);

    useEffect(() => {
        var x = {};
        watchData(x, ['group', group, 'member'], setMembers);
        return () => internalReleaseWatchers(x);
    }, [group])

    const unread = isGroupUnread(groupInfo);

    var summaryLine = '';
    if (groupInfo.lastMessage) {
        summaryLine = groupInfo.lastMessage.fromName + ': ' + 
            firstLine(groupInfo.lastMessage.text)
    }
    return (
        <View style={[styles.groupPreview, 
                highlight ? {backgroundColor: '#eee'} : null]}>
            <GroupMultiIcon members={members || {}} name={name} size={50} photo={groupInfo.photo} />

            {/* <GroupIcon name={name} size={shrink ? 40 : 50} /> */}
                <View style={styles.groupPreviewRight}>
                    <OneLineText style={{fontSize: 16, fontWeight: unread ? 'bold' : null}}>
                        {name}
                    </OneLineText>
                    <OneLineText numberOfLines={1} style={{
                            color: '#666', marginTop: 4,
                            fontWeight: unread ? 'bold' : null}}>
                        {summaryLine}
                    </OneLineText>
                </View>
        </View>
    )
}



export class GroupList extends React.Component {
    state = {groupSet: null, selected: null, search: '', name: null, photo: null}

    async componentDidMount() {    
        watchData(this, ['userPrivate', getCurrentUser(), 'group'], groupSet => this.setState({groupSet}));
        watchData(this, ['userPrivate', getCurrentUser(), 'name'], name => this.setState({name}));        
        watchData(this, ['userPrivate', getCurrentUser(), 'photo'], photo => this.setState({photo}));
    }
    async componentWillUnmount() {
        internalReleaseWatchers(this);
    }

    async selectGroup(group) {
        const {navigation, singleScreen} = this.props;
        this.setState({selected: group});
        // navigation.navigate('group', {group});
        if (singleScreen || Platform.OS == 'web') {           
            navigation.navigate('group', {group});
        } else {
            navigation.reset({
                index: 1,
                routes: [
                    { name: 'home'},
                    { name: 'pgroup', params: {group}}
                ],
            })
        }
        setDataAsync(['userPrivate', getCurrentUser(), 'group', group, 'readTime'], Date.now());
        setDataAsync(['userPrivate', getCurrentUser(), 'lastAction'], Date.now())
    }

    render() {
        const {navigation, showSelected, shrink} = this.props;
        const {groupSet, selected, search, name, photo} = this.state;

        if (!groupSet) {
            return null;
        }

        const groupKeys = Object.keys(groupSet || {});
        var filteredGroupKeys = groupKeys;
        if (search) {
            filteredGroupKeys = _.filter(groupKeys, k => searchMatches(groupSet[k].name, search))
        }
        const sortedGroupKeys = _.sortBy(filteredGroupKeys, k => _.get(groupSet,[k,'lastMessage','time'],0)).reverse();

        if (Platform.OS != 'web') {
            const unreadGroups = _.filter(groupKeys, k => isGroupUnread(groupSet[k]));
            const unreadCount = unreadGroups.length;
            Notifications.setBadgeCountAsync(unreadCount);
        }

        return (
            <ScreenContentScroll>
                {Platform.OS == 'android' ?
                    <View style={{height: 16}} />
                : null}

                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8, marginLeft: 16, marginRight: 6}}>
                    {/* <View style={{flexDirection: 'row'}}>
                        <MemberIcon name={name} size={32} style={{marginRight: 8}} />
                        <Text style={{fontSize: Platform.OS == 'web' ? 24 : 30, fontWeight: 'bold'}}>Groups</Text>
                    </View> */}
                    <Text style={{fontSize: Platform.OS == 'web' ? 24 : 30, fontWeight: 'bold'}}>Conversations</Text>
                    <MemberPhotoIcon photoKey={photo} name={name} user={getCurrentUser()} size={32} />
                </View>
                <SearchBox value={search} onChangeText={search => this.setState({search})} 
                    style={{marginHorizontal: 16, marginBottom: 8}}
                />
                {sortedGroupKeys.map(group => 
                    <Catcher key={group}>
                        <FixedTouchable key={group} onPress={() => this.selectGroup(group)}>
                            <GroupPreview group={group} name={groupSet[group].name}
                                highlight={selected == group && showSelected}
                                groupInfo={groupSet[group]} shrink={shrink}
                            />
                        </FixedTouchable>
                    </Catcher>
                )}
                {/* {shrink ? null : 
                    <FixedTouchable onPress={() => navigation.navigate('joinOrCreate')}>
                        <Text style={{alignSelf: 'center', color: baseColor, marginTop: 8}}>Join or Create a group</Text>
                    </FixedTouchable>
                }    */}
                <View style={{borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd', marginTop: 32}} />
                    
                <FixedTouchable onPress={() => navigation.navigate('about')}>
                    <Text style={{alignSelf: 'center', color: baseColor, marginVertical: 16}}>{shrink ? 'About' : ('About ' + appName)}</Text>
                </FixedTouchable>

                {isMasterUser() ? 
                    <FixedTouchable onPress={() => navigation.navigate('adminCreateGroup')}>
                        <Text style={{alignSelf: 'center', color: baseColor, marginVertical: 16}}>Create Group (admin)</Text>
                    </FixedTouchable>
                :
                    null
                }

                {/* TODO: Bring back link to app once app is available */}
                {/* {Platform.OS == 'web' && !shrink ?
                    <AppPromo />
                :null} */}
            </ScreenContentScroll>
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
    return <GroupList navigation={navigation} singleScreen={true} shrink={shrink} showSelected />
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupPreview: {
        maxWidth: 500, marginHorizontal: 8, padding: 8, marginVertical: 0, backgroundColor: 'white',
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
  