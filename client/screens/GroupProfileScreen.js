import React, { useEffect, useState } from 'react'
import { FixedTouchable, FormInput, FormTitle, ScreenContentScroll, WideButton } from '../components/basics';
import { getCurrentUser, internalReleaseWatchers, watchData } from '../data/fbutil';
import { Picker, View, StyleSheet } from 'react-native';
import _ from 'lodash';
import { leaveGroupAsync, updateGroupProfileAsync } from '../data/servercall';
import { GroupProfilePhotoPlaceholder, GroupProfilePhotoPreview, pickImage } from '../components/photo';
import { resizeImageAsync } from '../components/shim';

export function GroupProfileScreen({navigation, route}) {
    const {group} = route.params;
    const [oldName, setOldName] = useState('');
    const [newName, setNewName] = useState(null);
    const [oldIntro, setOldIntro] = useState('');
    const [newIntro, setNewIntro] = useState(null);
    const [members, setMembers] = useState('');
    const [photoData, setPhotoData] = useState(null);
    const [thumbData, setThumbData] = useState(null);
    const [photo, setPhoto] = useState({});

    console.log('group profile', {group, oldName, newName, members});

    useEffect(() => {
        var x = {};
        watchData(x, ['group', group, 'name'], setOldName)
        watchData(x, ['group', group, 'intro'], setOldIntro, '')

        watchData(x, ['group', group, 'member'], setMembers)
        watchData(x, ['group', group, 'photo'], setPhoto);

        return () => internalReleaseWatchers(x)
    }, [group]);

    useEffect(() => {
        if (oldName) {
            navigation.setOptions({title: oldName + ' - Profile'});
        }
    }, [oldName]);   

    if (!members) return null;

    const meAdmin = members[getCurrentUser()].role == 'admin';

    async function onSelectPhoto() {
        const pickedImage = await pickImage();
        const photoData = await resizeImageAsync({uri: pickedImage.uri, pickedImage, rotate: true, maxSize: 600});
        const thumbData = await resizeImageAsync({uri: pickedImage.uri, pickedImage, rotate: true, maxSize: 80});
        setPhotoData(photoData);
        setThumbData(thumbData);
    }

    async function onClearPhoto() {
        setPhotoData(null);
        setThumbData(null);
    }

    return (
        <ScreenContentScroll>
            {meAdmin ?
                <View>
                    <FixedTouchable onPress={() => onSelectPhoto()}>
                        <View style={{alignSelf: 'center', marginVertical: 16}}>
                            {(photo.key || photoData) ?
                                <GroupProfilePhotoPreview photoKey={photo.key} photoUser={photo.user} photoData={photoData} onClearPhoto={()=>onClearPhoto} />
                            : 
                                <GroupProfilePhotoPlaceholder />
                            }
                        </View>                        
                    </FixedTouchable>
                    <FormTitle title='Name of This Group'>
                        <FormInput placeholder='name' value={newName || oldName} 
                            onChangeText={setNewName}
                        />            
                    </FormTitle>
                    <FormTitle title='Intro Message'>
                        <FormInput placeholder='Shown to people before they join' value={newIntro || oldIntro} 
                            onChangeText={setNewIntro} multiline
                        />            
                    </FormTitle>

                    <WideButton style={{alignSelf: 'flex-start'}} progressText='Updating...'
                        onPress={async ()=> {
                            await updateGroupProfileAsync({group, name: newName, photoData, thumbData});
                            navigation.goBack();
                        }}>
                        Update Group Profile
                    </WideButton>

                </View>
            : null
            }
            <View style={{marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd' }} />

            <View style={{flexDirection: 'row'}}>
                <WideButton onPress={() => navigation.replace('leaveGroup', {group})}>
                    Leave Group
                </WideButton>
                <WideButton alwaysActive onPress={() => navigation.replace('reportAbuse', {group})} 
                        style={{alignSelf: 'flex-start'}}>
                    Report Abuse
                </WideButton>
            </View>
        </ScreenContentScroll>
    )

}