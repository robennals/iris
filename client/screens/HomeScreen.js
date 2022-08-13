import React, { useContext, useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { firstLine, FixedTouchable, GroupIcon, MemberIcon, OneLineText, ScreenContentScroll, searchMatches, WideButton } from '../components/basics';
import { AppContext } from '../components/context';
import { baseColor, minTwoPanelWidth } from '../data/config';
import { getCurrentUser, internalReleaseWatchers, setDataAsync, watchData } from '../data/fbutil';
import _ from 'lodash';
import { NotifIcon } from '../components/notificon';
import { SearchBox } from '../components/searchbox';
import { Ionicons } from '@expo/vector-icons';
import { GroupPhotoIcon } from '../components/photo';
import { Catcher } from '../components/catcher';
import { AppPromo } from '../components/apppromo';

function GroupPreview ({name, groupInfo, highlight, shrink}) {
    const unread = _.get(groupInfo,'readTime', 0) < _.get(groupInfo, ['lastMessage', 'time'], 0);
    var summaryLine = '';
    if (groupInfo.lastMessage) {
        summaryLine = groupInfo.lastMessage.fromName + ': ' + 
            firstLine(groupInfo.lastMessage.text)
    }
    if (shrink) {
        return (
            <View style={[styles.shrinkGroupPreview, 
                    highlight ? {backgroundColor: '#ddd'} : null]}>
                <GroupPhotoIcon name={name} size={40} photo={groupInfo.photo} />
                {/* <Text style={{fontSize: 10, color: '#666'}} numberOfLines={2}>{name}</Text> */}
            </View>
        )             
    } else {
        return (
            <View style={[styles.groupPreview, 
                    highlight ? {backgroundColor: '#eee'} : null]}>
                <GroupPhotoIcon name={name} size={50} photo={groupInfo.photo} />

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
}



export class GroupList extends React.Component {
    state = {groupSet: null, selected: null, search: '', name: null}

    async componentDidMount() {    
        watchData(this, ['userPrivate', getCurrentUser(), 'group'], groupSet => this.setState({groupSet}));
        watchData(this, ['userPrivate', getCurrentUser(), 'name'], name => this.setState({name}));        
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
        const {groupSet, selected, search, name} = this.state;

        if (!groupSet) {
            return null;
        }

        const groupKeys = Object.keys(groupSet || {});
        var filteredGroupKeys = groupKeys;
        if (search) {
            filteredGroupKeys = _.filter(groupKeys, k => searchMatches(groupSet[k].name, search))
        }
        const sortedGroupKeys = _.sortBy(filteredGroupKeys, k => _.get(groupSet,[k,'lastMessage','time'],0)).reverse();

        // console.log('groupSet', {groupSet, sortedGroupKeys, filteredGroupKeys});

        return (
            <ScreenContentScroll>
                {Platform.OS == 'android' ?
                    <View style={{height: 16}} />
                : null}

                {shrink ? 
                    <View style={{alignSelf: 'center', marginTop: 16}}>
                        <NotifIcon navigation={navigation} alwaysShow />
                    </View>
                : 
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginLeft: 16, marginRight: 6, marginBottom: 0}}>
                        {/* <View style={{flexDirection: 'row'}}>
                            <MemberIcon name={name} size={32} style={{marginRight: 8}} />
                            <Text style={{fontSize: Platform.OS == 'web' ? 24 : 30, fontWeight: 'bold'}}>Groups</Text>
                        </View> */}
                        <Text style={{fontSize: Platform.OS == 'web' ? 24 : 30, fontWeight: 'bold'}}>Groups</Text>
                        <NotifIcon navigation={navigation} alwaysShow />
                    </View>
                }
                {shrink ? 
                    <FixedTouchable onPress={() => navigation.goHome()}>
                        <Ionicons name='ios-search' size={20} color='#999' 
                            style={{alignSelf: 'center', paddingVertical: 16}} />
                    </FixedTouchable>
                :
                    <SearchBox value={search} onChangeText={search => this.setState({search})} 
                        style={{marginHorizontal: 16, marginBottom: 8}}
                    />
                    }   
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
                {shrink ? null : 
                    <FixedTouchable onPress={() => navigation.navigate('joinOrCreate')}>
                        <Text style={{alignSelf: 'center', color: baseColor, marginTop: 8}}>Join or Create a group</Text>
                    </FixedTouchable>
                }   
                <View style={{borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd', marginTop: 32}} />
                    
                <FixedTouchable onPress={() => navigation.navigate('about')}>
                    <Text style={{alignSelf: 'center', color: baseColor, marginVertical: 16}}>{shrink ? 'About' : 'About Talkwell'}</Text>
                </FixedTouchable>

                {Platform.OS == 'web' && !shrink ?
                    <AppPromo />
                :null}
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

function MaybeWelcomeScreen() {
    return (
        <ScreenContentScroll>
            <View>
                <Text style={{fontSize: 24, fontWeight: 'bold', marginVertical: 16}}>Welcome to Talkwell</Text>
                <Text style={styles.p}>Talkwell is a platform for People-Centered Groups.</Text>
                <Text style={styles.p}>
                    Get started by creating a new group, or clicking on an invite link someone sent you to visit their group.
                </Text>
            </View>
        </ScreenContentScroll>
    )
}

export function EmptyScreen() {
    return (
        <View style={{backgroundColor: '#fbf8f4', flex: 1}}></View>
    )
}

export function HomeScreen({navigation, route, shrink}) {
    // const {width} = useWindowDimensions();
    // const {alwaysShow} = route.params || {};
    // const wide = width > minTwoPanelWidth;

    // useEffect(() => {
    //     if (wide && !alwaysShow) {
    //         navigation.setOptions({title: 'Welcome to Talkwell'})
    //     } else {   
    //         navigation.setOptions({title: 'Groups'})
    //     }
    // }, [wide])

    // if (wide && !alwaysShow) {
    //     return null;
    // } else {
        return <GroupList navigation={navigation} singleScreen={true} shrink={shrink} showSelected />
    // }
    
    // onSelect={group => navigation.navigate('group', {group})} />
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
  