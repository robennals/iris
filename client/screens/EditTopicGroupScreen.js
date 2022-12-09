import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { FixedTouchable, MinorButton, OneLineText, ScreenContentNoScroll, ToggleCheck, WideButton } from '../components/basics';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { useCustomNavigation } from '../components/shim';
import { getCurrentUser, useDatabase } from '../data/fbutil';
import { saveTopicGroupAsync } from '../data/servercall';

export function EditTopicGroupScreenHeader({route}) {
    const {community, topic} = route.params;
    const topicName = useDatabase([community, topic], ['topic', community, topic, 'name']);
    return (
        <View>
            <Text style={{fontSize: 12, fontWeight: 'bold'}}>Your Conversation</Text>
            <OneLineText style={{fontSize: 16}}>
                {topicName}
            </OneLineText>
        </View>
    )
}

var global_saveTopicGroupDrafts = {};

export function EditTopicGroupScreen({route}) {
    const {community, topic} = route.params;
    const navigation = useCustomNavigation();
    const [text, setText] = useState(null);
    const [inProgress, setInProgress] = useState(false);
    const oldTopicGroup = useDatabase([community, topic], ['topicGroup', community, topic, getCurrentUser()], null);

    const shownText = text == null ? (global_saveTopicGroupDrafts[topic] || oldTopicGroup?.text) : text;

    function onChangeText(text) {
        global_saveTopicGroupDrafts[topic] = text;
        setText(text);
    }

    function onRevert() {
        onChangeText(oldTopicGroup?.text);
    }

    async function onPost() {
        setInProgress(true);
        await saveTopicGroupAsync({community, topic, text});
        setInProgress(false);
        navigation.goBack();
    }

    return (
        <KeyboardSafeView>
            <View style={{flexDirection: 'row', flex: 1, justifyContent: 'center'}}>
            <View style={{backgroundColor: 'white', flex: 1, maxWidth: 450}}>
                <View style={{flexDirection: 'row', justifyContent:'space-between', alignItems: 'center'}}>
                    <View />
                    <View style={{flexDirection: 'row'}}>                    
                        {oldTopicGroup && global_saveTopicGroupDrafts[topic] && global_saveTopicGroupDrafts[topic] != oldTopicGroup.text ?
                            <MinorButton onPress={onRevert}
                                style={{margin: 4, paddingHorizontal: 4, paddingVertical: 1}}>
                                Revert
                            </MinorButton>
                        : null}
                        <WideButton alwaysActive disabled={inProgress || !text} onPress={onPost} 
                            progressText={!text ? null : (oldTopicGroup ? 'Updating...' : 'Posting...')}
                            style={{margin: 4, paddingHorizontal: 4, paddingVertical: 2}}>{oldTopicGroup ? 'Update' : 'Post'}</WideButton>            
                    </View>
                </View>
                <TextInput multiline placeholder='Introduce your conversation to others. E.g. what is your current viewpoint. What are open questions. What will the outcome be from this conversation?' 
                    style={{flex: 1, padding: 8, borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 4}}
                    value={shownText}
                    textAlignVertical='top'
                    onChangeText={onChangeText}
                />
                {/* <View style={{backgroundColor: 'blue', flex: 1}}/> */}
            </View>
            </View>
        </KeyboardSafeView>
    )
}

