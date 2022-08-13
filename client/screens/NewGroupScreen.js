import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FormInput, FormTitle, ScreenContentScroll, WideButton } from '../components/basics';
import { createGroupAsync, postMessageAsync } from '../data/servercall';

export default class NewGroupScreen extends React.Component {
    state = {name: null, desc: null}

    async createGroupAndNavigateToIt({groupName, adminName}) {
        const {navigation} = this.props;
        const trimmedName = adminName.trim();
        const result = await createGroupAsync({groupName, adminName: trimmedName});
        navigation.replace('group', {group: result.group});
        await postMessageAsync({group: result.group, type: 'join', title: trimmedName + ' arrived', text: 'Use this thread to say hello.'})
    }

    render () {
        const groupName = this.state.groupName || this.props.groupName;
        const adminName = this.state.adminName || this.props.adminName;

        return (
            <ScreenContentScroll>
                <FormTitle title='Group Name'>
                    <FormInput 
                        part='name'
                        placeholder='What is this group called? E.g. Super Friends'
                        defaultValue={groupName}
                        onChangeText={groupName=>this.setState({groupName})}
                    />
                </FormTitle>
                <FormTitle title='Your Name in This Group'>
                    <FormInput 
                        part='name'
                        title='Your Name in This Group'
                        placeholder='What is your name in this group? E.g. Joe Bloggs'
                        defaultValue={adminName}
                        onChangeText={adminName=>this.setState({adminName})}
                    />
                </FormTitle>

                <WideButton progressText='Creating...' part='submit' onPress={()=>this.createGroupAndNavigateToIt({groupName, adminName})}>
                    Create Group
                </WideButton>

            </ScreenContentScroll>
        )
    }
}

