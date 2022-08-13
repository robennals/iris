import React, { useEffect, useState } from 'react'
import { FixedTouchable, FormInput, FormTitle, ScreenContentScroll, WideButton } from '../components/basics';
import { firebaseSignOut, getCurrentUser, internalReleaseWatchers, setDataAsync, watchData } from '../data/fbutil';
import { Picker, StyleSheet, View, Text } from 'react-native';
import { reportMemberAsync, setMemberRoleAsync, updateProfileAsync } from '../data/servercall';
import _ from 'lodash';
import { ModeToggle } from '../components/modetoggle';
import { MemberProfilePhotoPlaceholder, MemberProfilePhotoPreview, PhotoPreview, pickImage } from '../components/photo';
import { resizeImageAsync } from '../components/shim';

export function ProfileScreen({navigation, route}) {
    const {group, member} = route.params
    const [members, setMembers] = useState(null);
    const [name, setName] = useState(null);
    const [role, setRole] = useState(null);
    const [photoData, setPhotoData] = useState(null);
    const [thumbData, setThumbData] = useState(null);
    const [blocked, setBlocked] = useState(null);
    useEffect(() => {
        var x = {};
        watchData(x, ['group', group, 'member'], setMembers)
        watchData(x, ['group', group, 'block', getCurrentUser(), member], setBlocked, false)
        return () => internalReleaseWatchers(x)
    }, [group, member]);

    useEffect(() => {
        const memberX = _.get(members, member);
        if (memberX) {
            navigation.setOptions({title: memberX.name})
        }
    }, [members, member])

    if (!members || blocked == null) return null;

    const meAdmin = members[getCurrentUser()].role == 'admin';
    const isMe = getCurrentUser() == member;
    // if (!meAdmin && getCurrentUser() != member) return null
    const photoKey = _.get(members, [member, 'photo']);

    const memberX = members[member];

    const roleOptions = [
        {name: 'Admin', id: 'admin'},
        {name: 'Member', id: 'member'},
        {name: 'Visitor', id: 'visitor'},
    ]

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

    async function onBlockMember({block}) {
        reportMemberAsync({group, member, block});
        navigation.goBack();
    }

    return (
        <ScreenContentScroll>
            {(isMe || meAdmin) ?
                <View>
                    <FixedTouchable onPress={()=>onSelectPhoto()}>
                        <View style={{alignSelf: 'center', marginVertical: 16}}>
                            {(photoKey || photoData) ? 
                                <MemberProfilePhotoPreview photoKey={photoKey} photoUser={member} photoData={photoData} onClearPhoto={() => onClearPhoto()} />
                            :
                                <MemberProfilePhotoPlaceholder />
                            }
                        </View>
                    </FixedTouchable>
                    <FormTitle title='Name in This Group'>
                        <FormInput placeholder='name' value={name || memberX.name} 
                            onChangeText={setName}
                        />            
                    </FormTitle>
                    <WideButton style={{alignSelf: 'flex-start'}}  progressText='Updating...'
                        onPress={async () => {
                            await updateProfileAsync({group, member, name, photoData, thumbData});
                            navigation.goBack();
                        }}>
                        Update Profile
                    </WideButton>
                </View>
            : null
            }
            {(meAdmin && getCurrentUser() != member) ? 
                <View>
                    <View style={{marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd' }} />
                    <FormTitle title='Role in This Group'>
                        <ModeToggle options={roleOptions} value={role || memberX.role} 
                            style={{marginHorizontal: 16, marginTop: 8}}
                            onChangeSelection={role => {
                                setRole(role);
                            }}
                        />
                    </FormTitle>
                    <WideButton style={{alignSelf: 'flex-start'}}  progressText='Updating Role...'
                        onPress={() => {
                            setMemberRoleAsync({group, member, role});
                            navigation.goBack();
                        }}>
                        Update Role
                    </WideButton>

                </View>
            :null}
            <View style={{marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd' }} />
            {isMe ? 
                <WideButton style={{alignSelf:'flex-start'}} onPress={() => {
                    firebaseSignOut();
                    navigation.navigate('home');
                }}>
                    Sign Out
                </WideButton>
            :
                <View style={{flexDirection: 'row'}}>
                    <WideButton onPress={() => navigation.navigate('reportAbuse', {member, group})} 
                            style={{alignSelf: 'flex-start'}}>
                        Report Abuse
                    </WideButton>
                    <WideButton onPress={() => onBlockMember({block: !blocked})}>
                        {blocked ? 'Unblock' : 'Block'}
                    </WideButton>                    
                </View>
            }
        </ScreenContentScroll>
    );
}
