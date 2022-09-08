import React, { useEffect, useRef, useState } from 'react';
import AppLoading from 'expo-app-loading';
import { Dimensions, InteractionManager, LogBox, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { firebaseSignOut, internalReleaseWatchers, maybeFirebaseSignOut, onFirebaseAuthStatechanged, watchData } from './data/fbutil';
import { SignInScreen } from './screens/Signin';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, CommonActions, useNavigationContainerRef } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';

import _ from 'lodash';

import { EmptyScreen, GroupList, HomeScreen, SidePanel } from './screens/HomeScreen';
import EditGroupScreen from './screens/NewGroupScreen';
import { releaseServerTokenWatch, setupServerTokenWatch } from './data/servercall';
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
import { appName } from './data/config';
import { AdminCreateGroupScreen, AdminCreateScreen } from './screens/AdminCreateGroup';
import { ChatScreen, ChatScreenHeader } from './screens/ChatScreen';
import { playAlertSound } from './components/alertping';
import { MyProfileScreen } from './screens/MyProfileScreen';
import { AdminCreateOrEditCommunity, AdminCreateOrEditCommunityScreen } from './screens/AdminCreateOrEditCommunity';
import { CommunityScreen, CommunityScreenHeader } from './screens/CommunityScreen';
import { CommunityProfileScreen } from './screens/CommunityProfile';
import { IntakeScreen } from './screens/IntakeScreen';
import { CommunitySignupsScreen, SubmissionsScreen } from './screens/CommunitySignups';
import { CommunityGroupsScreen } from './screens/CommunityGroups';
import { AdminCommandScreen } from './screens/AdminCmd';
import { UnsubscribeScreen } from './screens/UnsubscribeScreen';

LogBox.ignoreLogs(['AsyncStorage'])

const Stack = createStackNavigator();

const prefix = Linking.createURL('/');
const linking = {prefixes: [prefix, 'https://talkwell.net'], config: {
  initialRouteName: 'home',
  screens: {
    group: 'group/:group',
    groupProfile: 'groupProfile/:group',
    editCommunity: 'editCommunity/:community',
    community: 'community/:community',
    communityGroups: 'communityGroups/:community',
    communitySignups: 'communitySignups/:community',
    adminCreateGroup: 'adminCreateGroup/:community',
    join: 'join/:community'
  }
}}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

SplashScreen.preventAutoHideAsync();

var global_lastMessageTime = 0;

export default function App() {
  const [user, setUser] = useState(null);
  const [gotAuth, setGotAuth] = useState(false);
  const [notif, setNotif] = useState(null);
  const [initialUrl, setInitialUrl] = useState(null);
  const [loadStatus, setLoadStatus] = useState('Authenticating...');
  const notificationListener = useRef();
  const responseListener = useRef();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    // TODO: Make this not fail on IOS - Is it because I haven't linked a domain?
    Linking.getInitialURL().then(initialUrl => setInitialUrl(initialUrl));
    setLoadStatus(loadStatus + ' : Got URL');
  }, []);

  useEffect(() => {
    // console.log('initial setup');
    onFirebaseAuthStatechanged(async fbUser => {
      setUser(fbUser && fbUser.uid)
      setLoadStatus(loadStatus + ' : Got Auth...');
      setGotAuth(true);
      await SplashScreen.hideAsync();
    })
    webInit();
  },[]);

  useEffect(() => {
    if (!user) {
      maybeFirebaseSignOut();
    }
  }, [user])

  useEffect(() => {
    if (user) {
      setLoadStatus(loadStatus + ' : setup access token');
      setupServerTokenWatch(user);
    } else {
      releaseServerTokenWatch();        
    }
  }, [user])

  useEffect(() => {
    var x = {};
    global_lastMessageTime = 0;
    if (user) {
      watchData(x, ['userPrivate', user, 'lastMessageTime'], async time => {
        console.log('lastMessageTime ', {time, global_lastMessageTime});
        if (global_lastMessageTime && global_lastMessageTime != time) {
          await playAlertSound();
        }
        global_lastMessageTime = time;
      })
    }
    return () => internalReleaseWatchers(x);
  }, [user]);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotif(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // console.log(response);
      console.log('notif tapped');

      if (Platform.OS != 'web') {
        console.log('navigating to home');
        navigationRef.navigate('home');
        console.log('done');
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const screens = {
    home: {component: HomeScreen, noHeader: true},
    new: {component: EditGroupScreen, title: 'New Group'},
    group: {component: ChatScreen, headerTitle: ChatScreenHeader}, 
      
      // options: ({navigation, route}) => ({
      // headerLeft: null, headerRight: () => <NotifIcon navigation={navigation} />, 
      // headerTitle: ({children}) => <GroupScreenHeader navigation={navigation} route={route} children={children} />})},
    pgroup: {component: ChatScreen, headerTitle: ChatScreenHeader},
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
    groupProfile: {component: GroupProfileScreen, title: 'Conversation Info'},
    reportAbuse: {component: ReportAbuseScreen, title: 'Report Abuse'},
    notifs: {component: NotifScreen, title: 'Notifications'},
    photo: {component: PhotoScreen, title: 'Photo', noHeader: true},
    empty: {component: EmptyScreen, noHeader: true},
    leaveGroup: {component: LeaveGroupScreen, title: 'Leave Group'},
    about: {component: AboutScreen, title: 'About ' + appName},
    addsubgroup: {component: AddSubgroupScreen, title: 'Add Subgroup'},
    outsiderThread: {component: OutsiderThreadScreen, headerTitle: OutsiderThreadScreenHeader},
    digestFreq: {component: DigestFreqScreen, title: 'Set Digest Frequency'},
    adminCreateGroup: {component: AdminCreateGroupScreen, title: 'Admin Create Groups'},
    myProfile: {component: MyProfileScreen, title: 'My Profile'},
    createCommunity: {component: AdminCreateOrEditCommunityScreen, title: 'Create Community'},    
    editCommunity: {component: AdminCreateOrEditCommunityScreen, title: 'Edit Community'},  
    community: {component: CommunityScreen, headerTitle: CommunityScreenHeader},
    communityProfile: {component: CommunityProfileScreen, title: 'Community Profile'},
    communitySignups: {component: CommunitySignupsScreen, title: 'Signups'},
    communityGroups: {component: CommunityGroupsScreen, title: 'Community Groups'},
    adminCommand: {component: AdminCommandScreen, title: 'Admin Command'},
    unsubscribe: {component: UnsubscribeScreen, title: 'Leave Communities'},
    join: {component: IntakeScreen, title: 'Join Community'}
  }

  // console.log('intialUrl', initialUrl);

  const parsedUrl = initialUrl ? parseUrl(initialUrl || '') : {};
  console.log('parsedUrl', initialUrl, parsedUrl);

  if (!gotAuth) {
    return <View style={{justifyContent: 'center', flex: 1, alignItems: 'center'}}><Text>Authenticating...</Text></View>
  // } else if (!initialUrl) {
  //   return <View style={{justifyContent: 'center', flex: 1, alignItems: 'center'}}><Text>Starting up...</Text></View>
    // return null;
  } else if (!user && (parsedUrl.screen == 'community' || parsedUrl.screen == 'join')) {
    return <IntakeScreen community={parsedUrl.param} />
  } else if (!user) {
    return <SignInScreen/>
  } else {
    return (
      <SafeAreaProvider>
        <CustomNavigator user={user} screens={screens} initialRouteName='home' linking={linking} navigationRef={navigationRef} />
      </SafeAreaProvider>
    )
  }
}

function parseUrl(url) {
  try {
    const {path} = Linking.parse(url || '');
    if (!path) {
      return {screen: 'home', param: null}
    }
    const parts = path.split('/');
    const screen = parts[0];
    const param = parts[1];
    return {screen, param};
  } catch (e) {
    console.log('bad url ', url);
    return {screen: 'home', param: null}
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
