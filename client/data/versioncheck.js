import { highlightColor, version } from "./config";
import * as Updates from 'expo-updates';
import {Platform} from 'react-native';
import { watchData } from "./fbutil";

const thisVersion = version;
var latestVersion = null;
var firstLoad = false;

var x = {};
watchData(x, ['special', 'versioncheck', 'sdk_46'], newVersion => {
    latestVersion = newVersion;
    if (firstLoad) {
        reloadIfVersionChanged();
    }
    firstLoad = false;
})

export function forceReload() {
    if (Platform.OS != 'web') {
        if (!__DEV__) {
            expoReload();
        }
    } else {
      window.location.reload(true);
    }
}

export async function expoReload() {
    console.log('checking for new expo update');
    const newUpdate = await Updates.checkForUpdateAsync();
    if (newUpdate) {
      console.log('new update available');
      const {isNew} = await Updates.fetchUpdateAsync();
      if (isNew) {
        console.log('reloading');
        await Updates.reloadAsync();
      } else {
        console.log('loaded update is not new');
      }
    } else {
      console.log('no new update available');
    }
}

export async function reloadIfVersionChanged(){
    if (latestVersion && latestVersion > thisVersion) {
        console.log('version did change', latestVersion, thisVersion);
        forceReload();
    // } else {
    //     console.log('Version did not change', latestVersion, thisVersion);
    }
}
