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
    const {community, post, topic} = route.params;
    const communityName = useDatabase([community], ['community', community, 'name']);
    const topicName = useDatabase([community, topic], ['postTopic', community, topic, 'name']);
    return (
        <View style={{marginHorizontal: 8}}>
            <Text style={{fontSize: 16, fontWeight: 'bold'}}>{post ? 'Edit Conversation' : 'New Conversation'}</Text>
            <OneLineText style={{fontSize: 12}}>
                {topic && topicName ? <Text>about <Text style={{fontWeight: 'bold'}}>{topicName}</Text> </Text> : null}
                in {communityName}
            </OneLineText>
        </View>
    )
}

var global_savePostDrafts = {};

export function EditPostScreen({navigation, route}) {
    const {community, post, topic} = route.params;
    const [inProgress, setInProgress] = useState(false);
    const [title, setTitle] = useState(null);
    const [text, setText] = useState(null);
    const [isPublic, setIsPublic] = useState(null);
    const [questions, setQuestions] = useState(null);
    const oldPost = useDatabase([community, post], ['post', community, post]);

    if (post && !oldPost) {
        return <Loading />
    }

    const shownText = text == null ? (global_savePostDrafts[post]?.text || oldPost?.text || '') : text;
    const shownTitle = title == null ? (global_savePostDrafts[post]?.title || oldPost?.title || '') : title;
    const shownQuestions = questions == null ? (global_savePostDrafts[post]?.questions || oldPost?.questions || '') : questions;
    const shownPublic = isPublic == null ? (global_savePostDrafts[post]?.public || oldPost?.public || false) : isPublic;

    function onChangeText(text) {
        global_savePostDrafts[post] = {title, text, questions};
        setText(text);
    }

    function onChangeTitle(title) {
        global_savePostDrafts[post] = {title, text, questions};
        setTitle(title);
    }

    function onChangeQuestions(questions) {
        global_savePostDrafts[post] = {title, text, questions};
        setQuestions(questions);
    }


    function onRevert() {
        setText(oldPost?.text || '');
        setTitle(oldPost?.title || '');
        setQuestions(oldPost?.questions || '')
        global_savePostDrafts[post] = null;
    }

    async function onPost() {
        setInProgress(true);
        await editPostAsync({isPublic: shownPublic, community, post: post || null, topic, title: shownTitle, text: shownText, questions: shownQuestions});
        setInProgress(false);
        global_savePostDrafts[post] = null;
        navigation.goBack();
    }

    return (
        <KeyboardSafeView>
            <ScreenContentScroll>
                <View style={{flexDirection: 'row', flex: 1, justifyContent: 'center'}}>
                    <View style={{backgroundColor: 'white', flex: 1, maxWidth: 450}}>
                        <View style={{flexDirection: 'row', justifyContent:'space-between', alignItems: 'center'}}>
                            <View />
                            <View style={{flexDirection: 'row'}}>                    
                                {oldPost && global_savePostDrafts[post] ?
                                    <MinorButton onPress={onRevert}
                                        style={{margin: 8, paddingHorizontal: 4, paddingVertical: 1}}>
                                        Revert
                                    </MinorButton>
                                : null}
                                <WideButton alwaysActive disabled={inProgress || !global_savePostDrafts[post]} onPress={onPost} 
                                    progressText={!text ? null : (oldPost ? 'Updating...' : 'Creating...')}
                                    style={{margin: 8, paddingHorizontal: 4, paddingVertical: 2}}>{oldPost ? 'Update' : 'Create'}</WideButton>            
                            </View>
                        </View>
                        {/* <View style={{flex: 1, borderColor: '#ddd', margin: 4, borderWidth: StyleSheet.hairlineWidth, borderRadius: 4}}> */}
                        <View>
                            <FormTitle title='Conversion Title'>
                                <FormInput value={shownTitle} onChangeText={onChangeTitle} />
                                {/* <TextInput placeholder='Conversation Title' value={shownTitle} onChangeText={setTitle} 
                                    style={{flex: 0, padding: 8, borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth}}
                                    placeholderTextColor='#999'
                                /> */}
                            </FormTitle>
                            <FormTitle title='Context and Purpose'>
                                <FormInput value={shownText} onChangeText={onChangeText} multiline 
                                    extraStyle={{flex: null, height: 100}} />
                            </FormTitle>
                            <FormTitle title='Three short questions (one per line)'>
                                <FormInput value={shownQuestions} onChangeText={onChangeQuestions} multiline 
                                    extraStyle={{flex: null, height: 72}} />
                            </FormTitle>
                            <FormCheckbox label='Public Conversation' selected={shownPublic} onChangeSelected={setIsPublic} />
                            {/* <TextInput multiline placeholder='Introduce your conversation to others. E.g. what is your current viewpoint. What are open questions. What will the outcome be from this conversation?' 
                                style={{flex: 1, padding: 8}}
                                placeholderTextColor='#999'
                                value={shownText}
                                textAlignVertical='top'
                                onChangeText={onChangeText}
                            /> */}
                        </View>
                    </View>
                </View>
            </ScreenContentScroll>
        </KeyboardSafeView>
    )
}