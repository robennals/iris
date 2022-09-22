import React, { useState } from 'react';
import { FormInput, FormTitle, ScreenContentScroll, WideButton } from '../components/basics';
import { useCustomNavigation } from '../components/shim';
import { firebaseSignOut, isMasterUser, signInWithTokenAsync } from '../data/fbutil';
import { adminGetLoginTokenAsync } from '../data/servercall';

export function AdminLoginScreen() {
    const [email, setEmail] = useState('');
    const navigation = useCustomNavigation();

    if (!isMasterUser()) {
        return null;
    }

    async function onSignIn() {
        const result = await adminGetLoginTokenAsync({email});
        console.log('result', result);
        await navigation.popToTop();
        await firebaseSignOut();
        console.log('signed out');
        await signInWithTokenAsync(result.token);   
        console.log('done');
    }

    return (
        <ScreenContentScroll>
            <FormTitle title='email'>
                <FormInput value={email} onChangeText={setEmail} />
            </FormTitle>
            <WideButton onPress={() => onSignIn()}>
                Sign Into Account
            </WideButton>
        </ScreenContentScroll>
    )
}