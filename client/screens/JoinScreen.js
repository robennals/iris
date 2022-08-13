import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FixedTouchable, FormInput, FormTitle, MemberIcon, ScreenContentScroll, WideButton } from '../components/basics';
import { getCurrentUser, internalReleaseWatchers, watchData } from '../data/fbutil';
import _ from 'lodash';
import { baseColor } from '../data/config';
import { joinGroupAsync, postMessageAsync } from '../data/servercall';

export function JoinOrCreateScreen({navigation}) {
    return (
        <ScreenContentScroll>
            <View style={{margin: 16}}>
                <Text style={{fontSize: 16, marginBottom: 8, fontWeight: 'bold'}}>Join a Group</Text>
                <Text>
                    To join a group, click on the invite link that a group member sent you. 
                </Text>
                {Platform.OS != 'web' ?
                <Text style={{marginVertical: 8}}>
                    Depending on where you open it from, this link may open in the app, or in a web browser. 
                    If it opens in a web browser then you may need to log in again.
                </Text>
                : 
                <Text style={{marginVertical: 8}}>
                    Clicking the link should take you to a screen that will allow you to join the group.
                </Text>}

                <View style={{borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd', marginVertical: 32}}></View>

                <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 8}}>Create a Group</Text>

                <Text>
                    You can also create a new group, and invite other people to join it.
                </Text>

                <FixedTouchable onPress={() => navigation.replace('new')}>
                    <Text style={{alignSelf: 'center', color: baseColor, marginTop: 8}}>Create a new group</Text>
                </FixedTouchable>
            </View>
        </ScreenContentScroll>
    )
}

export class JoinScreen extends React.Component {
    state = {groupName: null, memberName: null, defaultName: null}

    async componentDidMount() {
        const {navigation} = this.props;
        const {group} = this.props.route.params;
        watchData(this, ['group', group, 'name'], groupName => {
            console.log('name', groupName);
            this.setState({groupName});
            if (groupName == '') {
                navigation.setOptions({title: 'No such group'})
            } else {
                navigation.setOptions({title: 'Join ' + groupName})
            }
        },'');
        watchData(this, ['userPrivate', getCurrentUser(), 'name'], defaultName => this.setState({defaultName}), '');
    }

    componentWillUnmount() {
        internalReleaseWatchers(this);
    }

    async joinGroup() {
        const {navigation} = this.props;
        const {memberName, defaultName} = this.state;
        const {group} = this.props.route.params;
        const trimmedName = (memberName || defaultName).trim();
        await joinGroupAsync({group, memberName: trimmedName});
        await postMessageAsync({group, type: 'join', title: trimmedName + ' arrived', text: 'Use this thread to say hello.'})
        navigation.replace('group', {group});
        if (Platform.OS == 'web') {
            window.history.pushState(null,'','/')
        }
    }

    render() {
        const {groupName, memberName, defaultName} = this.state;
        const name = (memberName == null ? defaultName : memberName) || '';
        const trimmedName = name.trim();
        
        if (groupName == null) return null;
        if (groupName == '') {
            return (
                <ScreenContentScroll>
                    <Text style={{fontSize: 20, marginVertical: 16}}>No such group</Text>
                    <Text>Check that the URL did not get corrupted</Text>
                </ScreenContentScroll>
            )
        }
        return (
            <ScreenContentScroll>
                <FormTitle title='Your Name in This Group'>
                    <FormInput 
                        part='name'
                        placeholder='What should people call you in this group? E.g. Joe Bloggs'
                        value={name}
                        onChangeText={memberName=>this.setState({memberName})}
                    />
                </FormTitle>

                <WideButton disabled={!trimmedName} progressText='Joining...' onPress={()=>this.joinGroup()}>
                    Join group
                </WideButton>
            </ScreenContentScroll>
        )

    }
}
