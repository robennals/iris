import React, { useEffect, useState } from 'react';
import { getCurrentUser, watchData } from '../data/fbutil';
import {Audio} from 'expo-av';


var global_soundObject = null;

export async function playAlertSound() {
    // return;
    console.log('play sound');
    try {
      if (!global_soundObject) {
        global_soundObject = new Audio.Sound();
        // await global_soundObject.setVolumeAsync(0.5);
        // await global_soundObject.setVolumeAsync(1);
        await global_soundObject.loadAsync(require('../assets/pop_semiquiet.mp3'));
      }
      await global_soundObject.playAsync();
      // await soundObject.unloadAsync();
    } catch (error) {
    }  
  }

