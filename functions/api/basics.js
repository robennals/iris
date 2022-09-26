const _ = require('lodash');

const secondMillis = 1000;
const minuteMillis = 60 * secondMillis;
const hourMillis = 60 * minuteMillis;
const dayMillis = 24 * hourMillis;

exports.minuteMillis = minuteMillis;
exports.hourMillis = hourMillis;
exports.dayMillis = dayMillis;

function firstName(name) {
    if (!name) {
        return '';
    } else {
        return name.split(' ')[0];
    }
}
exports.firstName = firstName;