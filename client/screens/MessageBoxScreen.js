import { FontAwesome } from '@expo/vector-icons';
import { NavigationContainer, useNavigation } from '@react-navigation/native'
import React, { useContext, useEffect, useState } from 'react'
import { TextInput, StyleSheet, View, Text, Platform } from 'react-native'
import { firstName, FixedTouchable, OneLineText, ScreenContentScroll, toBool, ToggleCheck, WideButton } from '../components/basics';
import { MemberSectionContext } from '../components/context';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { PhotoPreview, pickImage } from '../components/photo';
import { resizeImageAsync, useCustomNavigation } from '../components/shim';
import { applyTag, TagSuggestion, updateTagSuggestionForSelectionChange } from '../components/tagging';
import { getCurrentUser, internalReleaseWatchers, watchData } from '../data/fbutil';
import { postMessageAsync } from '../data/servercall';

function PostButton({group, text, title, photoKey, photoData, rootKey, editKey, replyTo, member, membersOnly}) {
    const [inProgress, setInProgress] = useState(false)
    const navigation = useCustomNavigation();

    async function postMessage(){
        setInProgress(true);
        console.log('postMessage', group, text, editKey);
        const {key} = await postMessageAsync({group, text, title: title || null, photoKey, photoData, editKey, rootKey, replyTo, member, membersOnly});
        setInProgress(false);
        if (Platform.OS != 'web' && replyTo) {
            navigation.navigate('thread', {group, rootKey, messageKey: key});
            console.log('navigated to', {group, rootKey, key});
        } else {
            navigation.goBack();
        }
    }

    return (
        <WideButton disabled={inProgress || (!rootKey && !title)} 
            onPress={postMessage}
            progressText={editKey ? 'Updating...' : 'Posting...'}
            style={{margin: 0, marginHorizontal: 4, paddingVertical: 6, 
                    paddingHorizontal: 4}}>
            {editKey ? 'Update' : 'Post' }
        </WideButton>
    )
}

export function MessageBoxScreenHeader({route}) {
    const {group, editKey, replyTo} = route.params;
    const [groupName, setGroupName] = useState(null);
    useEffect(() => {
        var x = {}
        watchData(x, ['group', group, 'name'], setGroupName, 'Group');

        return () => internalReleaseWatchers(x);
    }, [group])

    if (!groupName) return null;

    var title = '';
    if (replyTo) {
        title = editKey ? 'Edit Reply' : 'Write Reply';
    } else {
        title = editKey ? 'Edit Post' : 'Create Post';
    }

    return (
        <View style={{paddingHorizontal: 8}}>
            <OneLineText style={{fontSize: 16}}>{title}</OneLineText>
            <Text style={{fontSize: 13, alignSelf: Platform.OS != 'ios' ? 'flex-start' : 'center'}}>
                in <Text style={{fontWeight: 'bold'}}>{groupName}</Text>
            </Text>
        </View>            
    )
}


function MembersOnlyToggle({membersOnly, setMembersOnly}){
    return <ToggleCheck value={membersOnly} onValueChange={setMembersOnly} label='Current Members Only' />
}

export function MessageBoxScreen({navigation, route}) {
    const {group, rootKey, editKey, editText = '', editTitle = '', editPhotoKey = null, replyTo, onNewHighlight} = route.params;
    const [text, setText] = useState(null);
    const [title, setTitle] = useState('');
    const [photoKey, setPhotoKey] = useState(null);
    const [photoData, setPhotoData] = useState(null);
    const [membersOnly, setMembersOnly] = useState(false);
    const [members, setMembers] = useState(null);
    const [maybeTag, setMaybeTag] = useState(null);
    const [textInput, setTextInput] = useState(null);

    useEffect(() => {
        var x = {};
        watchData(x, ['group', group, 'member'], setMembers);
        return () => internalReleaseWatchers();
    }, [group])

    useEffect(() => {
        if (replyTo) {
            navigation.setOptions({title: editKey ? 'Edit Reply' : 'Write Reply'})
        } else {
            navigation.setOptions({title: editKey ? 'Edit Post' : 'Create Post'})
        }
    }, [replyTo, editKey]);

    useEffect(() => {
        navigation.setOptions({headerRight: () =>
            <PostButton text={text || editText} title={title || editTitle} group={group} 
                replyTo={replyTo} rootKey={rootKey} editKey={editKey} membersOnly={membersOnly}
                photoKey={photoKey || editPhotoKey} photoData={photoData} onNewHighlight={onNewHighlight} />
        })
    }, [text, editKey, title, photoKey, photoData, editPhotoKey, membersOnly])

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
    }

    return (
        <KeyboardSafeView>
        <View style={{flex: 1, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'white'}}>
            <View style={{
                    flex: 1, borderWidth: StyleSheet.hairlineWidth,  borderColor: '#ddd', borderRadius: 8,
                    shadowRadius: 1, shadowOpacity: 0.5, shadowColor: '#555', shadowOffset: {width: 0, height: 2},
                    marginVertical: 8, marginHorizontal: 4, backgroundColor: 'white',
                    maxWidth: 500
                    }}>
                {!replyTo ?
                    <TextInput style={{padding: 8, fontSize: 16, lineHeight: 20, 
                        fontWeight: 'bold',                         
                        borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' }}
                        autoFocus
                        value={title || editTitle} onChangeText={setTitle}
                        placeholder='What is the subject of your post?'
                    />
                :null}
                <TagSuggestion maybeTag={maybeTag} onTag={() => setText(applyTag({text, maybeTag, textInput}))} />
                <TextInput style={{flex: 1, padding: 8, fontSize: 16, lineHeight: 20 }}
                    multiline autoFocus={toBool(replyTo)}
                    textAlignVertical='top'
                    onSelectionChange={onSelectionChange}
                    ref={r => setTextInput(r)}
                    value={(text == null) ? editText : text} onChangeText={setText}
                    placeholder={replyTo ? 'Write a reply' : 'What do you want to say about that subject?'}
                />
                {(photoData || photoKey || editPhotoKey) ? 
                    <PhotoPreview photoKey={photoKey || editPhotoKey} onClearPhoto={() => onClearPhoto()}
                        photoUser={getCurrentUser()} photoData={photoData}/> 
                : 
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                        {(replyTo || editKey) ? <View /> :
                            // <MembersOnlyToggle />
                            <ToggleCheck value={membersOnly} onValueChange={setMembersOnly} label='Current Members Only' />
                        }
                        <FixedTouchable part='photo' onPress={() => onSelectPhoto()} title='Add Image' >
                            <FontAwesome name='photo' size={20} color='#999' style={{marginHorizontal: 8, marginVertical: 6}} />
                        </FixedTouchable>
                    </View>
                }
            </View>
        </View>      
        </KeyboardSafeView>
    )
}

