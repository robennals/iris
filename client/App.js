import React, { useEffect, useRef, useState } from 'react';
import AppLoading from 'expo-app-loading';
import { Dimensions, InteractionManager, LogBox, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { onFirebaseAuthStatechanged } from './data/fbutil';
import { SignInScreen } from './screens/Signin';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, CommonActions, useNavigationContainerRef } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import _ from 'lodash';

import 'react-native-gesture-handler';
import { EmptyScreen, GroupList, HomeScreen, SidePanel } from './screens/HomeScreen';
import EditGroupScreen from './screens/NewGroupScreen';
import { setupServerTokenWatch } from './data/servercall';
import { GroupScreen, GroupScreenHeader, GroupScreenTitle, GroupScreenWrapper } from './screens/GroupScreen';
import { InviteScreen } from './screens/InviteScreen';
import { JoinOrCreateScreen, JoinScreen } from './screens/JoinScreen';
import { AppContext } from './components/context';
import { MessageBoxScreen, MessageBoxScreenHeader } from './screens/MessageBoxScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ReportAbuseScreen } from './screens/ReportAbuse';
import { GroupProfileScreen } from './screens/GroupProfileScreen';
import { ThreadScreen, ThreadScreenHeader } from './screens/ThreadScreen';
import { NotifIcon } from './components/notificon';
import { NotifScreen } from './screens/NotifScreen';
import { webInit } from './components/shim';
import { PhotoScreen } from './screens/PhotoScreen';
import { CustomNavigator } from './components/customnavigator';
import { NotifLine } from './components/notifline';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LeaveGroupScreen } from './screens/LeaveGroupScreen';
import { AboutScreen } from './screens/AboutScreen';
import { AddSubgroupScreen } from './screens/AddSubgroupScreen';
import { OutsiderThreadScreen, OutsiderThreadScreenHeader } from './screens/OutsiderThreadScreen';
import { DigestFreqScreen } from './screens/DigestFreqScreen';

LogBox.ignoreLogs(['AsyncStorage'])

const Stack = createStackNavigator();

const prefix = Linking.createURL('/');
const linking = {prefixes: [prefix, 'https://talkwell.net'], config: {
  initialRouteName: 'home',
  screens: {
    join: 'join/:group',
    group: 'group/:group',
    thread: 'thread/:group/:rootKey',
    profile: 'profile/:group/:member',
    groupProfile: 'groupProfile/:group',
    notifs: 'notifs',
    messagebox: 'messagebox/:group',
    digestFreq: 'digestFreq'
  }
}}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});


export default function App() {
  const [user, setUser] = useState(null);
  const [gotAuth, setGotAuth] = useState(false);
  const [notif, setNotif] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    console.log('initial setup');
    onFirebaseAuthStatechanged(fbUser => {
      setUser(fbUser && fbUser.uid)
      setGotAuth(true);
    })
    webInit();
  },[]);

  useEffect(() => {
    if (user) {
      setupServerTokenWatch(user);
    }
  }, [user])

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotif(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
      // navigationRef.navigate('home');
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const screens = {
    home: {component: HomeScreen, noHeader: true},
    new: {component: EditGroupScreen, title: 'New Group'},
    group: {component: GroupScreen, headerTitle: GroupScreenHeader}, 
      
      // options: ({navigation, route}) => ({
      // headerLeft: null, headerRight: () => <NotifIcon navigation={navigation} />, 
      // headerTitle: ({children}) => <GroupScreenHeader navigation={navigation} route={route} children={children} />})},
    pgroup: {component: GroupScreen, headerTitle: GroupScreenHeader},
      // options: ({navigation, route}) => ({
      // animationEnabled: false, 
      // headerLeft: null, headerRight: () => <NotifIcon navigation={navigation} />, 
      // headerTitle: ({children}) => <GroupScreenHeader navgation={navigation} route={route} children={children} />})},
    thread: {component: ThreadScreen, headerTitle: ThreadScreenHeader},
      
      // options: ({navigation, route}) => ({
      // title: 'Thread', headerRight: () => <NotifIcon navigation={navigation} />})},
    invite: {component: InviteScreen},
    join: {component: JoinScreen},
    joinOrCreate: {component: JoinOrCreateScreen, title: 'Join or Create a Group'},
    messagebox: {component: MessageBoxScreen, headerTitle: MessageBoxScreenHeader},
    profile: {component: ProfileScreen, title: 'User Profile'},
    groupProfile: {component: GroupProfileScreen, title: 'Group Profile'},
    reportAbuse: {component: ReportAbuseScreen, title: 'Report Abuse'},
    notifs: {component: NotifScreen, title: 'Notifications'},
    photo: {component: PhotoScreen, title: 'Photo', noHeader: true},
    empty: {component: EmptyScreen, noHeader: true},
    leaveGroup: {component: LeaveGroupScreen, title: 'Leave Group'},
    about: {component: AboutScreen, title: 'About Talkwell'},
    addsubgroup: {component: AddSubgroupScreen, title: 'Add Subgroup'},
    outsiderThread: {component: OutsiderThreadScreen, headerTitle: OutsiderThreadScreenHeader},
    digestFreq: {component: DigestFreqScreen, title: 'Set Digest Frequency'}
  }


  if (!gotAuth) {
    return <AppLoading/>
  } else if (!user) {
    return <SignInScreen/>
  } else {
    return (
      <SafeAreaProvider>
        <CustomNavigator user={user} screens={screens} initialRouteName='home' linking={linking} />
      </SafeAreaProvider>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
