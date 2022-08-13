import React from 'react';
import { TextInput, StyleSheet, View, Text, Platform } from 'react-native'
import { baseColor, highlightColor } from '../data/config';
import { FixedTouchable } from './basics';
import _ from 'lodash';

function getLastWord(prefix) {
    return prefix.slice(prefix.lastIndexOf(' ')).trim();
}

function getSecondLastWord(prefix) {
    return getLastWord(prefix.slice(0, prefix.lastIndexOf(' ')))
}

function getMemberNameForPrefix({members, prefix, start}) {
    const lastWord = getLastWord(prefix);
    const secondLastWord = getSecondLastWord(prefix);
    var result = null;
    _.forEach(_.keys(members), m => {
        const member = members[m];
        const [firstname, lastname] = _.get(member,'name','').split(' ')
        // console.log('long person', {firstname, lastname}, {lastWord, secondLastWord}, secondLastWord == firstname);
        if ((secondLastWord == firstname || secondLastWord == '@' + firstname) && lastname && lastname.startsWith(lastWord)) {
            // console.log('got long')
            result = {name: member.name, start, replaceCount: 2};
        }
    })
    if (result) return result;
    _.forEach(_.keys(members), m => {
        const member = members[m];
        const [firstname, lastname] = _.get(member,'name','').split(' ')
        // console.log('short person', {firstname, lastname}, {lastWord, secondLastWord}, lastWord == firstname);
        if (lastWord == firstname || lastWord == '@' + firstname) {
            // console.log('got short')
            result = {name: member.name, completeLast: member.name, start, replaceCount: 1};
        }
    })
    return result;
}

export function updateTagSuggestionForSelectionChange(event, members, text, setMaybeTag) {
    const selection = event.nativeEvent.selection;
    const prefix = ' ' + (text || '').slice(0, selection.start).trim();
    try {
        const maybeTag = getMemberNameForPrefix({members, prefix, start: selection.start});
        setMaybeTag(maybeTag); 
    } catch (e) {
        console.log(e);
    }
}

export function applyTag({text, maybeTag, textInput}) {
    console.log('applyTag', text, maybeTag);    
    const prefix = ' ' + text.slice(0, maybeTag.start).trim();
    const postfix = text.slice(maybeTag.start);
    var newPrefix;
    if (maybeTag.replaceCount == 1) {
        const sliceIdx = prefix.lastIndexOf(' ');        
        const firstpart = prefix.slice(0, sliceIdx);
        newPrefix = firstpart + ' @' + maybeTag.name;
    } else {
        const firstIdx = prefix.lastIndexOf(' ');        
        const secondIdx = prefix.slice(0, firstIdx).lastIndexOf(' ');
        const firstpart = prefix.slice(0, secondIdx);
        newPrefix = firstpart + ' @' + maybeTag.name;

    }
    console.log('new', newPrefix, postfix, newPrefix + postfix);
    if (textInput) {
        textInput.focus();
    }
    return (newPrefix + postfix).trim();
}

export function TagSuggestion({maybeTag, onTag}) {
    if (!maybeTag || !maybeTag.name) {
        return null;
    } 

    return (
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <FixedTouchable onPress={onTag}>
                <View style={{alignSelf: 'flex-start', backgroundColor: baseColor ,margin: 8, paddingVertical: 4, paddingHorizontal: 8, borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 8}}>
                    <Text style={{color: 'white'}}>@{maybeTag.name}</Text>
                </View>
            </FixedTouchable>
            <Text style={{marginLeft: 4, fontSize: 13, color: '#666'}}>
                tag {maybeTag.name}
            </Text>
        </View>
    )
}