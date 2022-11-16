import { Entypo, Ionicons } from '@expo/vector-icons';
import React, { forwardRef, memo, useContext, useEffect, useImperativeHandle, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCurrentUser, getFirebaseServerTimestamp, newKey, setDataAsync, useDatabase } from '../data/fbutil';
import { logErrorAsync, sendMessageAsync } from '../data/servercall';
import { FixedTouchable, MinorButton, OneLineText, ToggleCheck, WideButton } from './basics';
import { track, useCustomNavigation } from './shim';

var global_saveDrafts = {};

export function IsPublicToggle({value, onValueChange}) {
    return <Text>Propose as Public Summary</Text>
}

/* eslint-disable react/display-name */
export const ChatEntryBox = memo(forwardRef(
        ({group, groupName, community, reply, onClearReply, chatInputRef}, ref) => {
    const mySummary = useDatabase([group], ['group', group, 'memberSummary', getCurrentUser()], null);
    const [inProgress, setInProgress] = useState(false);
    const [height, setHeight] = useState(36);
    const [text, setText] = useState(null);
    const [edit, setEdit] = useState(null);
    const [textKey, setTextKey] = useState(0);
    const [proposePublic, setProposePublic] = useState(false);
    const topic = useDatabase([group], ['group', group, 'topic'], null);
    const navigation = useCustomNavigation();


    useImperativeHandle(ref, () => ({
        setEdit: edit => {
            // console.log('setEdit', {edit, text});
            if (!text || text != '') {
                setText(edit.text);
                setEdit(edit);
                setTextKey(textKey + 1);
                setProposePublic(edit.proposePublic);
                return true;
            } else {
                return false;
            }           
        }
    }),[group])

    function onClearEdit() {
        setEdit(null);
        setProposePublic(false);
        setText('');
        setTextKey(textKey + 1);
        setHeight(36);
        onClearReply();
    }

    const byMeCount = 0;

    const replyTo = reply?.key || null;
    const replyText = reply?.text || '';
    const replyName = reply?.name || '';

    function onContentSizeChange(event) {
        const contentHeight = event.nativeEvent.contentSize.height;

        if (contentHeight > height) {
            setHeight(contentHeight);
            // setNextHeight(contentHeight);
        // } else {
            // setNextHeight(contentHeight);
            // setNextHeight(Math.max(36, Math.min(contentHeight, height - 20)))
        }
    }

    const mergedText = text != null ? text : (global_saveDrafts[group] || '');
    const defaultText = edit ? edit.text : global_saveDrafts[group];
    const textLength = mergedText.length;
    const maxMessageLength = proposePublic ? 800 : 400;
    const textGettingLong = textLength > (maxMessageLength - 50);
    const textTooLong = textLength > maxMessageLength;

    const maxByMe = 3;

    async function onSubmit() {
        if (!mergedText || textTooLong) {
            return;
        }
        const messageKey = edit?.key || newKey();
        setInProgress(true);
        onClearReply();
        onClearEdit();
        setText('');
        setTextKey(textKey + 1);
        setProposePublic(false);
        global_saveDrafts[group] = null;
        setHeight(36);
        await setDataAsync(['userPrivate', getCurrentUser(), 'localMessage', group, messageKey], {
            time: edit?.time || getFirebaseServerTimestamp(),
            text: mergedText, replyTo, from: getCurrentUser(),
            proposePublic: proposePublic && !replyTo,
            published: proposePublic,
            pending: true
        })
        setInProgress(false);
        try {
            await sendMessageAsync({proposePublic: proposePublic && !replyTo, isEdit: edit ? true : false, editTime: edit?.time || null, messageKey, group, text: mergedText, replyTo});
        } catch (e) {
            console.log('message send failed');
            await setDataAsync(['userPrivate', getCurrentUser(), 'localMessage', group, messageKey, 'failed'], true);
        }
        try {
            track('Send Message', {length: mergedText.length, isReply: replyTo ? true : false, group, community, groupName});    
        } catch (error) {
            logErrorAsync({error: error.message, context: {from: 'MixPanel Send Message'}});
        }
    }

    function onChangeText(text) {
        setText(text);
        global_saveDrafts[group] = text;
    } 

    function onKeyPress(e) {
        if (Platform.OS == 'web' && e.nativeEvent.key == 'Enter') {
            if (!e.nativeEvent.shiftKey && !e.nativeEvent.ctrlKey && !e.nativeEvent.metaKey){
                onSubmit();    
                e.preventDefault();
                return false;
            }
        }
        return true;
    }

    const isWeb = Platform.OS == 'web'

    const expanded = proposePublic || text;

    const webTextboxStyle = [styles.iosTextBox, {height}];
    const textBoxStyle = Platform.OS == 'android' ? null : (Platform.OS == 'ios' ? styles.iosTextBox : webTextboxStyle);
    const wrapperStyle = Platform.OS == 'android' ? styles.androidInputWrapper : styles.nonAndroidInputWrapper;

    return (
        <View style={styles.mainFrame}>
            {edit ?
                <View>
                    <Text style={{color: '#222', fontWeight: 'bold', fontSize: 12, marginTop: 8, marginLeft: 8}}>Editing previous message</Text>
                </View>
            :null}
            {replyTo ? 
                <View style={{flexDirection: 'row', justifyContent: 'space-between', 
                        paddingLeft: 8, marginTop: 8, marginBottom: 4, borderLeftColor: '#ddd', borderLeftWidth: StyleSheet.hairlineWidth}}>
                    <View style={{flex: 1}}>
                        <Text style={{fontSize: 12, marginBottom: 4}}>Replying to <Text style={{fontWeight: 'bold'}}>{replyName}</Text></Text>
                        <OneLineText style={{color: '#666'}}>{replyText}</OneLineText>
                    </View>
                    <FixedTouchable onPress={onClearReply}>
                         <Entypo name='circle-with-cross' size={20} color='#666' />
                    </FixedTouchable>
                </View>
            : null}
            {!replyTo && expanded && topic ?
                <ToggleCheck value={proposePublic} onValueChange={setProposePublic} label='Public Highlight' style={{marginTop: 4}} textStyle={{color: 'black'}} />
            : null }
            {!replyTo && expanded && proposePublic && mySummary ?
                <Text style={{color: '#666', fontSize: 12, marginBottom: 8, marginTop: 4, marginLeft: 8}}>This will replace your previous highlight</Text>
            : null}
            {textTooLong ? 
                <Text style={{color: 'red', fontSize: 12, marginTop: 8, marginLeft: 8}}>Message is {textLength - maxMessageLength} chars too long</Text>
            : null}
            {textGettingLong && !textTooLong ?
                <Text style={{color: '#666', fontSize: 12, marginTop: 8, marginLeft: 8}}>{maxMessageLength - textLength} / {maxMessageLength} chars remaining</Text>
            :null}
            {byMeCount > maxByMe && mergedText.length > 0 ?
                <Text style={{color: 'red', fontSize: 12, marginTop: 8, marginLeft: 8}}>
                    You have written {byMeCount} messages in a row. Consider letting someone else speak before writing another message.
                </Text>
            : null}
            <View style={styles.buttonRow}>
                <View style={wrapperStyle}>
                    <TextInput // disabled={inProgress} 
                        key={textKey}
                        ref={chatInputRef}
                        defaultValue={defaultText}
                        onChangeText={onChangeText}
                        autoFocus={isWeb}
                        placeholder={proposePublic ? 'Write a public highlight' : 'Write a private message'}
                        placeholderTextColor={'#999'}
                        multiline
                        style={textBoxStyle}
                        autoCorrect={Platform.OS == 'android' ? false : true}
                        onContentSizeChange={Platform.OS == 'web' ? onContentSizeChange : null}
                        onKeyPress={Platform.OS == 'web' ? onKeyPress : null}                
                    />
                </View>
                {!expanded && topic ? 
                    <FixedTouchable onPress={() => {setProposePublic(true); chatInputRef.current.focus()}}>
                    {/* <FixedTouchable onPress={() => navigation.navigate('viewpoint', {community, topic})}> */}
                        <View style={{flexDirection: 'row', backgroundColor: '#f4f4f4', height: 36, alignItems: 'center', marginLeft: 8, borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4}}>
                            <Entypo name='star' color='#FABC05' size={16} />
                            <Text style={{marginLeft: 2, color: '#999'}}>Highlight</Text>
                        </View>
                    </FixedTouchable>                
                : null}
                {/* {!expanded && topic ? 
                    <FixedTouchable onPress={() => navigation.navigate('viewpoint', {community, topic})}>
                        <View style={{flexDirection: 'row', backgroundColor: '#f4f4f4', height: 36, alignItems: 'center', marginLeft: 8, borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4}}>
                            <Entypo name='megaphone' color='#FABC05' size={16} />
                            <Text style={{marginLeft: 2, color: '#999'}}>Viewpoint</Text>
                        </View>
                    </FixedTouchable>                
                : null} */}
                {textLength > 0 && !textTooLong ?
                    (edit ? null
                    :                         
                        <FixedTouchable part='sendMessage' onPress={onSubmit} >
                            <Ionicons style={{marginHorizontal: 8}} name='md-send' size={24}  
                            color={inProgress ? '#999' : '#0084ff'} />
                        </FixedTouchable>
                    ) 
                : null}
            </View>
            {edit ?
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                <WideButton onPress={onSubmit} style={{margin: 4}} progressText='Updating...' disabled={inProgress} alwaysActive>
                    Update
                </WideButton>
                <MinorButton onPress={onClearEdit}>
                    Cancel
                </MinorButton>
                </View>
        
            :null}
        </View>
    )
}))

const styles=StyleSheet.create({
    iosTextBox: {
        backgroundColor: '#f4f4f4', borderRadius: 8, 
        borderWidth: StyleSheet.hairlineWidth, 
        borderColor: '#ddd', padding: 8,
        marginVertical: 8,
        // backgroundColor: 'red',
        flexShrink: 0,
        fontSize: 16, lineHeight: 20, flexGrow: 1
    },
    androidInputWrapper: {
        flex: 1, backgroundColor: '#f4f4f4', borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', paddingVertical: 4, paddingHorizontal: 8,
        marginVertical: 8
    },
    nonAndroidInputWrapper: {
        flex: 1
    },
    mainFrame: {
        borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', paddingHorizontal: 8, backgroundColor: 'white'
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center'   
    }

})
