import { Entypo } from '@expo/vector-icons';
import { stringLength } from '@firebase/util';
import React, { useEffect, useState } from 'react';

import { Platform, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View, Image } from 'react-native';
import { FixedTouchable, FormTitle, makePhotoDataUrl, mergeEditedParams, ScreenContentScroll, WideButton } from '../components/basics';
import { getUrlForImage, GroupPhotoIcon, pickImage } from '../components/photo';
import { resizeImageAsync } from '../components/shim';
import { watchData } from '../data/fbutil';
import { createCommunityAsync, createOrUpdateCommunityAsync, updateCommunityAsync } from '../data/servercall';
import _ from 'lodash';


export function AdminCreateOrEditCommunityScreen({navigation, route}) {
    const community = route?.params?.community;
    const [old, setOld] = useState({});
    const [name, setName] = useState(null);
    const [info, setInfo] = useState(null);
    const [questions, setQuestions] = useState(null);
    const [topics, setTopics] = useState(null);
    const [photoData, setPhotoData] = useState(null);
    const [thumbData, setThumbData] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        var x = {};
        watchData(x, ['community', community], setOld);
    }, [community])

    const merged = mergeEditedParams({oldObj: old, newObj: {name, info, questions, topics}});

    const textBoxStyle = {
        backgroundColor: 'white',
        padding: 8,
        borderColor: '#ddd',
        borderRadius: 8,
        borderWidth: 1,
        margin: 4,
        // flex: 1,
        marginHorizontal: 16,
        marginTop: 8
    }

    function onCreateCommunityClicked() {
        console.log('create community', name, info, questions, topics);
    }

    async function choosePhotoAsync() {
        const bigPhoto = await pickImage();
        const photoData = await resizeImageAsync({uri: bigPhoto.uri, bigPhoto, rotate: true, maxSize:  600})
        const thumbData = await resizeImageAsync({uri: bigPhoto.uri, bigPhoto, rotate: true, maxSize:  600})
    
        setPhotoData(photoData);
        setThumbData(thumbData);
    }
    
    async function onCreateCommunityClicked() {
        setUploading(true);
        var result;
        await createOrUpdateCommunityAsync({community, photoData, thumbData, 
                photoKey: old.photoKey || null, photoUser: old.photoUser || null, 
                name: merged.name, info: merged.info, questions: merged.questions, topics: merged.topics});                        
        setUploading(false);
        console.log('created community', name, result);
        navigation.goBack();
    }

    return (
        <ScreenContentScroll>
            <View style={{marginVertical: 16, alignItems: 'center'}}>
                <FixedTouchable onPress={() => choosePhotoAsync()}>
                    <View style={{width: 200, height: 200}}>
                        {old.photoKey || photoData ? 
                            <Image source={{uri: photoData ? makePhotoDataUrl(photoData) : getUrlForImage(old.photoKey, old.photoUser)}} 
                                style={{width: 200, height: 200, borderRadius: 200/8, borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth}}
                            />
                        :
                            <View style={{width: 200, height: 200, borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, borderRadius: 200/8, alignItems: 'center', justifyContent: 'center'}}>
                                <Text style={{fontSize: 200/8,color: '#666'}}>Logo</Text>
                            </View>
                        }
                        <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd', position: 'absolute', right: 8, bottom: 8, alignItems: 'center', justifyContent: 'center'}}>                        
                            <Entypo name='camera' size={24} />
                        </View>
                    </View>
                </FixedTouchable>
            </View>
 

            <FormTitle title='Community Name'>
                <TextInput value={merged.name} onChangeText={setName} style={textBoxStyle} />
            </FormTitle>
            <FormTitle title='Intro'>
                <TextInput multiline style={[textBoxStyle, {height: 50}]}   
                    placeholder='Text shown before the user is asked to fill in their bio info.'
                    value={merged.info} onChangeText={setInfo} />
            </FormTitle>
            <FormTitle title='Bio Questions (markup)'>
                <TextInput multiline placeholder='One line per question. ":" between question and format. Format is comma separated options or "text". No need to ask for name, photo, or email since those are always requested.'
                    onChangeText={setQuestions}
                    value={merged.questions}
                    style={[textBoxStyle, {height: 100}]}
                />
            </FormTitle>
            {/* <FormTitle title='Topics'>
                <TextInput multiline placeholder='Each topic starts wih "#". Followed by a list of questions, each of which starts with "*".'
                    onChangeText={setTopics} 
                    value={merged.topics}
                    style={[textBoxStyle, {height: 200}]}
                />
            </FormTitle> */}

            <WideButton alwaysActive onPress={onCreateCommunityClicked} style={{alignSelf: 'flex-start'}} 
                disabled={uploading || !merged.name || !merged.info || !merged.questions || !(photoData || old.photoKey) || !merged.topics} >
                {community ? (uploading ? 'Updating...' : 'Update Community') : (uploading ? 'Creating...' : 'Create Community')}
            </WideButton>

        </ScreenContentScroll>
    )
}