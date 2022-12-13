import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { FormCheckbox, FormInput, FormTitle, mergeEditedParams, MinorButton, OneLineText, ScreenContentScroll, WideButton } from '../components/basics';
import { CommunityPhotoIcon } from '../components/photo';
import { internalReleaseWatchers, isMasterUser, useDatabase, watchData } from '../data/fbutil';
import { editPostAsync, editTopicAsync } from '../data/servercall';
import _ from 'lodash';
import { Loading } from '../components/loading';
import { KeyboardSafeView } from '../components/keyboardsafeview';


export function EditPostScreenHeader({navigation, route}) {
    const {community, post} = route.params;
    const communityName = useDatabase([community], ['community', community, 'name']);
    return (
        <View style={{marginHorizontal: 8}}>
            <Text style={{fontSize: 16, fontWeight: 'bold'}}>{post ? 'Edit Conversation' : 'New Conversation'}</Text>
            <OneLineText style={{fontSize: 12}}>
                in {communityName}
            </OneLineText>
        </View>
    )
}

var global_savePostDrafts = {};

export function EditPostScreen({navigation, route}) {
    const {community, post} = route.params;
    const [inProgress, setInProgress] = useState(false);
    const [title, setTitle] = useState(null);
    const [text, setText] = useState(null);
    const oldPost = useDatabase([community, post], ['post', community, post]);

    if (post && !oldPost) {
        return <Loading />
    }

    const shownText = text == null ? (global_savePostDrafts[post]?.text || oldPost?.text || '') : text;
    const shownTitle = title == null ? (global_savePostDrafts[post]?.title || oldPost?.title || '') : title;

    function onChangeText(text) {
        global_savePostDrafts[post] = {title, text};
        setText(text);
    }

    function onRevert() {
        onChangeText(oldPost?.text);
        setTitle(oldPost?.title);
    }

    async function onPost() {
        setInProgress(true);
        await editPostAsync({community, post: post || null, title: shownTitle, text: shownText});
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
                        {oldPost && global_savePostDrafts[post] && global_savePostDrafts[post].text != oldPost.text ?
                            <MinorButton onPress={onRevert}
                                style={{margin: 4, paddingHorizontal: 4, paddingVertical: 1}}>
                                Revert
                            </MinorButton>
                        : null}
                        <WideButton alwaysActive disabled={inProgress || !text} onPress={onPost} 
                            progressText={!text ? null : (oldPost ? 'Updating...' : 'Creating...')}
                            style={{margin: 8, paddingHorizontal: 4, paddingVertical: 2}}>{oldPost ? 'Update' : 'Create'}</WideButton>            
                    </View>
                </View>
                <View style={{flex: 1, borderColor: '#ddd', margin: 4, borderWidth: StyleSheet.hairlineWidth, borderRadius: 4}}>
                    <TextInput placeholder='Post Title' value={shownTitle} onChangeText={setTitle} 
                        style={{flex: 0, padding: 8, borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth}}
                        placeholderTextColor='#999'
                    />
                    <TextInput multiline placeholder='Introduce your conversation to others. E.g. what is your current viewpoint. What are open questions. What will the outcome be from this conversation?' 
                        style={{flex: 1, padding: 8}}
                        placeholderTextColor='#999'
                        value={shownText}
                        textAlignVertical='top'
                        onChangeText={onChangeText}
                    />
                </View>
            </View>
            </View>
        </KeyboardSafeView>
    )
}