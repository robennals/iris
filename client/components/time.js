
export const secondMillis = 1000;
export const minuteMillis = secondMillis * 60;
export const hourMillis = minuteMillis * 60;
export const dayMillis = hourMillis * 24;

function twoDigit(num) {
  if (num < 10) {
    return '0' + num;
  } else {
    return num;
  }
}

function isToday({date, nowDate}) {
    return (
        (date.getMonth() == nowDate.getMonth()) && 
        (date.getDate() == nowDate.getDate()) &&
        (date.getFullYear() == nowDate.getFullYear()))
}

function isThisYear({date, nowDate}) {
  return (
      (date.getFullYear() == nowDate.getFullYear()))
}

export function formatFullTime(time) {
  const date = new Date(time);
  return date.toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'}) 
}

export function formatMessageTime(time) {
  const now = Date.now();
  const nowDate = new Date(now);
  const date = new Date(time);
  if (!time) {
    return '';
  } else if ((now - time) < (2 * minuteMillis)) {
    return 'just now';
  } else if (!isToday({date, nowDate})) {
    return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'}) 
  } else {
    return date.toLocaleTimeString(undefined, {hour: 'numeric', minute: 'numeric'}).toLowerCase()
  }
}


export function formatTime(time) {
    const now = Date.now();
    const nowDate = new Date(now);
    const date = new Date(time);
    if (!time) {
      return '';
    } else if ((now - time) < (2 * minuteMillis)) {
      return 'just now';
    } else if ((now - time) < hourMillis) {
        return Math.floor(((now - time)/minuteMillis)) + 'm ago'  
    } else if ((now - time) < dayMillis) {
        return Math.floor(((now - time)/hourMillis)) + 'hr ago'  
    } else if (!isToday({date, nowDate})) {
      return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) 
    } else {
      return date.toLocaleTimeString(undefined, {hour: 'numeric', minute: 'numeric'}).toLowerCase()
    }
  }

  export function formatLongTimeDate(time) {
    const now = Date.now();
    const nowDate = new Date(now);
    const date = new Date(time);
    if (isToday({date, nowDate})) {
      return 'today';
    } else if (isThisYear({date, nowDate})) {
      return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})  
    } else {
      return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})  
    }
  }
