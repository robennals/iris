import React, { useEffect, useRef, useState } from 'react';
import AppLoading from 'expo-app-loading';
import { Dimensions, InteractionManager, LogBox, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { firebaseSignOut, internalReleaseWatchers, maybeFirebaseSignOut, NetworkStateProvider, onFirebaseAuthStatechanged, watchData } from './data/fbutil';
import { SignInScreen } from './screens/Signin';
import { NavigationContainer, CommonActions, useNavigationContainerRef } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';

import _ from 'lodash';

import { EmptyScreen, GroupList, HomeScreen, SidePanel } from './screens/HomeScreen';
import { releaseServerTokenWatch, setupServerTokenWatch } from './data/servercall';
import { ProfileScreen } from './screens/ProfileScreen';
import { ReportAbuseScreen } from './screens/ReportAbuse';
import { GroupProfileScreen } from './screens/GroupProfileScreen';
import { NotifScreen } from './screens/NotifScreen';
import { identify, playAlertSound, resetMixpanel, track, webInit } from './components/shim';
import { PhotoScreen } from './screens/PhotoScreen';
import { CustomNavigator, MemoCustomNavigator } from './components/customnavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LeaveGroupScreen } from './screens/LeaveGroupScreen';
import { AboutScreen } from './screens/AboutScreen';
import { AddSubgroupScreen } from './screens/AddSubgroupScreen';
import { DigestFreqScreen } from './screens/DigestFreqScreen';
import { appName } from './data/config';
import { AdminCreateGroupScreen } from './screens/AdminCreateGroup';
import { ChatScreen, ChatScreenHeader } from './screens/ChatScreen';
import { MyProfileScreen } from './screens/MyProfileScreen';
import { AdminCreateOrEditCommunityScreen } from './screens/AdminCreateOrEditCommunity';
import { CommunityScreen, CommunityScreenHeader } from './screens/CommunityScreen';
import { CommunityProfileScreen } from './screens/CommunityProfile';
import { IntakeScreen } from './screens/IntakeScreen';
import { CommunitySignupsScreen } from './screens/CommunitySignups';
import { CommunityGroupsScreen } from './screens/CommunityGroups';
import { AdminCommandScreen } from './screens/AdminCmd';
import { UnsubscribeScreen } from './screens/UnsubscribeScreen';
import { EditTopicScreen } from './screens/EditTopic';
import * as Sentry from 'sentry-expo';
import { setUserPropertiesAsync } from './data/metrics';
import { AdminLoginScreen } from './screens/AdminLogin';
import Constants from "expo-constants";
import { PublishedHeader, PublishedScreen } from './screens/Published';
import { MissingScreen } from './screens/MissingScreen';
import { EditViewpointScreen, EditViewpointScreenHeader } from './screens/EditViewpointScreen';
import { ViewpointScreen, ViewpointScreenHeader } from './screens/ViewpointScreen';
import { WaitingScreen } from './screens/WaitingScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';
import { TopicScreen, TopicScreenHeader } from './screens/TopicScreen';
import { EditTopicGroupScreen, EditTopicGroupScreenHeader } from './screens/EditTopicGroupScreen';
import { EditPostScreen, EditPostScreenHeader } from './screens/EditPost';
import { PostFeedScreen, PostFeedScreenHeader, PostScreen, PostScreenHeader } from './screens/PostFeedScreen';


Sentry.init({
  dsn: 'https://0c46551eb8ee400c8aa4a6bd6c316f4c@o1414339.ingest.sentry.io/6754623',
  // enableInExpoDevelopment: true,
  // debug: true
});



track('Start up');

LogBox.ignoreLogs(['AsyncStorage'])

// const Stack = createStackNavigator();

const prefix = Linking.createURL('/');
const linking = {prefixes: [prefix, 'https://iris-talk.com'], config: {
  initialRouteName: 'home',
  screens: {
    group: 'group/:group',
    groupProfile: 'groupProfile/:group',
    editCommunity: 'editCommunity/:community',
    community: 'community/:community',
    communityGroups: 'communityGroups/:community',
    communitySignups: 'communitySignups/:community',
    adminCreateGroup: 'adminCreateGroup/:community',
    join: 'join/:community',
    newTopic: 'newTopic/:community',
    editTopic: 'editTopic/:community/:topic',
    newPost: 'newPost/:community',
    editPost: 'editPost/:community/:post',
    communityProfile: 'communityProfile/:community',
    published: 'published/:community/:topic',
    highlights: 'highlighted:/:community/:topic',
    profile: 'profile/:community/:member',
    topic: 'topic/:community/:topic',
    post: 'post/:community/:post',
    home: 'home/',
    feedback: 'feedback/',
    myViewpoint: 'myViewpoint/:community/:topic',
    viewpoint: 'viewpoint/:community/:topic/:user',
    myTopicGroup: 'myTopicGroup/:community/:topic'
  }
}}

Notifications.setNotificationHandler({
  // handleNotification: async () => ({
  //   shouldShowAlert: false,
  //   shouldPlaySound: false,
  //   shouldSetBadge: false,
  // }),
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
  // const [notif, setNotif] = useState(null);
  const initialUrl = Linking.useURL();
  // const [initialUrl, setInitialUrl] = useState(null);
  const [loadStatus, setLoadStatus] = useState('Authenticating...');
  const notificationListener = useRef();
  const responseListener = useRef();
  const navigationRef = useNavigationContainerRef();

  console.log('initialUrl', initialUrl);

  // useEffect(() => {
  //   // TODO: Make this not fail on IOS - Is it because I haven't linked a domain?
  //   Linking.getInitialURL().then(initialUrl => setInitialUrl(initialUrl));
  //   setLoadStatus(loadStatus + ' : Got URL');
  // }, []);

  useEffect(() => {
    // console.log('initial setup');
    onFirebaseAuthStatechanged(async fbUser => {
      setUser(fbUser && fbUser.uid)
      if (fbUser && fbUser.uid) {
        identify(fbUser.uid);        
      } else {
        console.log('reset!');
        resetMixpanel();
      }

      setLoadStatus(loadStatus + ' : Got Auth...');
      setGotAuth(true);
      await SplashScreen.hideAsync();

      if (fbUser && fbUser.uid) {
        await setUserPropertiesAsync();
      }
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
        // console.log('lastMessageTime ', {time, global_lastMessageTime});
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
      console.log('received notif');
      // setNotif(notification);
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



  // console.log('intialUrl', initialUrl);

  const parsedUrl = initialUrl ? parseUrl(initialUrl || '') : {};
  // console.log('parsedUrl', initialUrl, parsedUrl);

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
        <NetworkStateProvider>
          <MemoCustomNavigator screens={screens} initialRouteName='home' linking={linking} navigationRef={navigationRef} />
        </NetworkStateProvider>
      </SafeAreaProvider>
    )
  }
}

const screens = {
  home: {component: HomeScreen, noHeader: true},
  group: {component: ChatScreen, headerTitle: ChatScreenHeader}, 
  pgroup: {component: ChatScreen, headerTitle: ChatScreenHeader},
  profile: {component: ProfileScreen, title: 'Profile'},
  groupProfile: {component: GroupProfileScreen, title: 'Conversation Info'},
  reportAbuse: {component: ReportAbuseScreen, title: 'Report Abuse'},
  notifs: {component: NotifScreen, title: 'Notifications'},
  photo: {component: PhotoScreen, title: 'Photo', noHeader: true},
  empty: {component: EmptyScreen, noHeader: true},
  leaveGroup: {component: LeaveGroupScreen, title: 'Leave Group'},
  about: {component: AboutScreen, title: 'About ' + appName},
  addsubgroup: {component: AddSubgroupScreen, title: 'Add Subgroup'},
  digestFreq: {component: DigestFreqScreen, title: 'Set Digest Frequency'},
  adminCreateGroup: {component: AdminCreateGroupScreen, title: 'Admin Create Groups'},
  myProfile: {component: MyProfileScreen, title: 'My Profile'},
  createCommunity: {component: AdminCreateOrEditCommunityScreen, title: 'Create Community'},    
  editCommunity: {component: AdminCreateOrEditCommunityScreen, title: 'Edit Community'},  
  community: {component: PostFeedScreen, headerTitle: PostFeedScreenHeader},
  // community: {component: CommunityScreen, headerTitle: CommunityScreenHeader},
  communityProfile: {component: CommunityProfileScreen, title: 'Community Profile'},
  communitySignups: {component: CommunitySignupsScreen, title: 'Signups'},
  communityGroups: {component: CommunityGroupsScreen, title: 'Community Groups'},
  adminCommand: {component: AdminCommandScreen, title: 'Admin Command'},
  unsubscribe: {component: UnsubscribeScreen, title: 'Leave Communities'},
  join: {component: IntakeScreen, title: 'Join Community'},
  newTopic: {component: EditTopicScreen, title: 'New Topic'},
  editTopic: {component: EditTopicScreen, title: 'Edit Topic'},
  newPost: {component: EditPostScreen, headerTitle: EditPostScreenHeader},
  editPost: {component: EditPostScreen, headerTitle: EditPostScreenHeader},
  adminLogin: {component: AdminLoginScreen, title: 'Admin Login'},
  published: {component: PublishedScreen, headerTitle: PublishedHeader},
  highlights: {component: PublishedScreen, headerTitle: PublishedHeader},
  post: {component: PostScreen, headerTitle: PostScreenHeader},
  missing: {component: MissingScreen, title: 'Missing Page'},
  topic: {component: TopicScreen , headerTitle: TopicScreenHeader},
  myViewpoint: {component: EditViewpointScreen, headerTitle: EditViewpointScreenHeader},
  viewpoint: {component: ViewpointScreen, headerTitle: ViewpointScreenHeader},
  waiting: {component: WaitingScreen, title: 'Waiting for Matches'},
  feedback: {component: FeedbackScreen, title: 'Send Feedback'},
  myTopicGroup: {component: EditTopicGroupScreen, headerTitle: EditTopicGroupScreenHeader}
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
