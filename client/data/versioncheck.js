import { highlightColor, version } from "./config";
import * as Updates from 'expo-updates';
import {Platform} from 'react-native';
import { watchData } from "./fbutil";
import Constants from "expo-constants"
import _ from 'lodash';


const thisVersion = version;
var latestVersion = null;
var firstLoad = false;

const runtimeKey = _.replace(Constants.manifest.runtimeVersion, /\./g, '_');
console.log('runtimeKey', runtimeKey);

var x = {};
watchData(x, ['special', 'versioncheck', runtimeKey], newVersion => {
    latestVersion = newVersion;
    if (firstLoad) {
        reloadIfVersionChanged();
    }
    firstLoad = false;
},0)

export function forceReload() {
    if (Platform.OS != 'web') {
        if (!__DEV__) {
            expoReload();
        } else {
            console.log('DEV - cannot reload');
        }
    } else {
      window.location.reload(true);
    }
}

export async function expoReload() {
  // HACK: Commenting out all of this since it maybe caused a crash
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
