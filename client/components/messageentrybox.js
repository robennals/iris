import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/core';
import React, { useContext, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FixedTouchable, MemberIcon, ScreenContentScroll, WideButton } from '../components/basics';
import { getCurrentUser, watchData } from '../data/fbutil';
import { postMessageAsync } from '../data/servercall';
import { GroupContext, MemberSectionContext } from './context';
import { compressImageAsync, PhotoPreview, pickImage } from './photo';
import { getCurrentDomain, resizeImageAsync, useCustomNavigation } from './shim';
import { TagSuggestion, applyTag, updateTagSuggestionForSelectionChange } from './tagging';

export function MessageEntryBox({style, onCancel, editText='', editPhotoKey=null, editKey=null, edit=false, rootKey=null, replyTo=null}) {
    const {group, meName} = useContext(GroupContext);
    const {member} = useContext(MemberSectionContext);
    const [text, setText] = useState('');
    const [photoKey, setPhotoKey] = useState(null);
    const [photoData, setPhotoData] = useState(null);
    const [maybeTag, setMaybeTag] = useState(null);
    const [members, setMembers] = useState(null);
    const [height, setHeight] = useState(36);
    const [nextHeight, setNextHeight] = useState(36);
    const [textInput, setTextInput] = useState(null);

    const [inProgress, setInProgress] = useState(false);
    const navigation = useCustomNavigation();

    useEffect(() => {
        var x = {};
        watchData(x, ['group', group, 'member'], setMembers);
    }, [group]);

    async function postMessage() {
        setInProgress(true);
        const {key} = await postMessageAsync({group, text: text || editText, photoKey: photoKey || editPhotoKey, photoData, editKey, rootKey, replyTo, member});
        if (editKey) {
            onCancel();
        }
        navigation.replace('thread', {group, rootKey, messageKey: key});
    }

    async function isFocused(text) {
        if (Platform.OS != 'web' || !replyTo) {
            navigation.navigate('messagebox', {group, replyTo: replyTo || undefined})
        }
    }

    async function onSelectPhoto() {
        const pickedImage = await pickImage();
        const smallData = await resizeImageAsync({uri: pickedImage.uri, pickedImage, rotate: true, maxSize: 600});
        setPhotoData(smallData);
        setPhotoKey(null);
    }

    function onClearPhoto() {
        setPhotoData(null);
        setPhotoKey(null);
    }

    function onSelectionChange(event) {
        updateTagSuggestionForSelectionChange(event, members, text, setMaybeTag);
        setHeight(nextHeight);
    }

    function onContentSizeChange(event) {
        const contentHeight = event.nativeEvent.contentSize.height;

        if (contentHeight > height) {
            setHeight(contentHeight);
            setNextHeight(contentHeight);
        } else {
            setNextHeight(contentHeight);
            // setNextHeight(Math.max(36, Math.min(contentHeight, height - 20)))
        }
        
    }


    return (
        <View style={[styles.messageEntryBox, style]}>
            <View style={styles.messageEntryHoriz}>
                {!edit ?
                    <MemberIcon name={meName} size={24} style={{marginTop: 4, marginRight: 8}} />
                : null}
                <View style={{flex: 1}}>
                    <TextInput
                        disabled={inProgress}
                        value={text || editText}
                        autoFocus={Platform.OS == 'web' && replyTo}
                        onChangeText={setText}
                        onFocus={isFocused}
                        ref={r => setTextInput(r)}
                        // style={styles.messageEntryText}
                        style={[{height}, styles.messageEntryText]}
                        // style={{height, ...styles.messageEntryText}}
                        // style={[styles.messageEntryText, {height}]}
                        multiline={true}
                        placeholder={replyTo ? 'Write a reply' : 'What is on your mind?'}
                        onSelectionChange={onSelectionChange}
                        onContentSizeChange={onContentSizeChange}
                    />
                    <TagSuggestion maybeTag={maybeTag} onTag={() => setText(applyTag({text, maybeTag, textInput}))} />
                </View>
            </View>
            {(photoData || photoKey || editPhotoKey) ? 
                <PhotoPreview photoKey={photoKey || editPhotoKey} onClearPhoto={() => onClearPhoto()}
                    photoUser={getCurrentUser()} photoData={photoData}/> 
            : null}
            {(text || onCancel) ?
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <FixedTouchable part='photo' onPress={() => onSelectPhoto()} title='Add Image' >
                        <FontAwesome name='photo' size={20} color='#999' style={{marginLeft: editText ? 8 : 40}} />
                    </FixedTouchable>
                    <View style={{alignSelf: 'flex-end', alignItems: 'center', flexDirection: 'row'}}>
                        {onCancel ?
                            <FixedTouchable onPress={()=>onCancel()}>
                                <Text style={{marginRight: 8, fontSize: 12, color: '#666'}}>Cancel</Text>
                            </FixedTouchable>
                        : null}
                        <WideButton onPress={()=>postMessage()} 
                            disabled={inProgress}
                            progressText={editKey ? 'Updating...' : 'Posting...'}
                            style={{alignSelf: 'flex-end', margin: 4, marginVertical: 4, marginRight: 0, padding: 6}}>
                            {editKey ? 'Update' : 'Post'}
                        </WideButton>
                    </View>
                </View>
            : null}
        </View>
    )    
}

const styles = StyleSheet.create({
    messageEntryBox: {
        alignItems: 'stretch',
        backgroundColor: 'white',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 16,
        margin: 0
        // marginHorizontal: 16,
        // marginVertical: 16
    },
    messageEntryHoriz: {
        flexDirection: 'row', 
        alignItems: 'flex-start',   
        flex: 1     
    },
    messageEntryText: {
        backgroundColor: '#f4f4f4',
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#ddd',
        padding: 8,
        // marginLeft: 8, 
        // flex: 1,
        fontSize: 16,
        lineHeight: 20
    }
})
