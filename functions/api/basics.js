const _ = require('lodash');

const secondMillis = 1000;
const minuteMillis = 60 * secondMillis;
const hourMillis = 60 * minuteMillis;
const dayMillis = 24 * hourMillis;

exports.minuteMillis = minuteMillis;
exports.hourMillis = hourMillis;
exports.dayMillis = dayMillis;



function normStr(str) {
    return str.toLowerCase().trim();
  }
exports.normStr = normStr;

function firstName(name) {
    if (!name) {
        return '';
    } else {
        return name.split(' ')[0];
    }
}
exports.firstName = firstName;

const AndFormat = new Intl.ListFormat('en', {style: 'long', type: 'conjunction'});
exports.AndFormat = AndFormat;


function formatTime(time) {
    if (time == 0) {
        return 'NO TIME'
    }
    const date = new Date(time);
    return date.toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'}) 
  }
exports.formatTime = formatTime;  

function formatDate(time) {
    if (time == 0) {
        return 'NO TIME'
    }
    const date = new Date(time);
    return date.toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'}) 
  }
exports.formatDate = formatDate;  