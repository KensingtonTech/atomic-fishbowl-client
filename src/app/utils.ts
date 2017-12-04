declare var moment;
import * as log from 'loglevel';

export function convertTimeSelection(selectedTimeframe): any {
  // returns an object { timeBegin: epochTime, timeEnd: epochTime } from a string ('Last 5 Minutes', etc)
  const t = { timeBegin: 0, timeEnd: 0 };
  const d = new Date();
  if (selectedTimeframe === 'Last 5 Minutes') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = ( now - 60 * 5 );
  }
  if (selectedTimeframe === 'Last 10 Minutes') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = ( now - 60 * 10 );
  }
  if (selectedTimeframe === 'Last 15 Minutes') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = ( now - 60 * 15 );
  }
  if (selectedTimeframe === 'Last 30 Minutes') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = ( now - 60 * 30 );
  }
  if (selectedTimeframe === 'Last Hour') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = ( now - 60 * 60 );
  }
  if (selectedTimeframe === 'Last 3 Hours') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = ( now - 60 * (60 * 3) );
  }
  if (selectedTimeframe === 'Last 6 Hours') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = ( now - 60 * (60 * 6) );
  }
  if (selectedTimeframe === 'Last 12 Hours') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = ( now - 60 * (60 * 12) );
  }
  if (selectedTimeframe === 'Last 24 Hours') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = ( now - 60 * (60 * 24) );
  }
  if (selectedTimeframe === 'Last 48 Hours') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = ( now - 60 * (60 * 24) * 2 );
  }
  if (selectedTimeframe === 'Last 5 Days (120 Hours)') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = ( now - 60 * (60 * 24) * 5 );
  }
  if (selectedTimeframe === 'Today') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = moment().startOf('day').unix();
  }
  if (selectedTimeframe === 'Yesterday') {
    t.timeEnd = moment().startOf('day').unix() - 1;
    t.timeBegin = moment().startOf('day').unix() - 86400;
  }
  if (selectedTimeframe === 'This Week') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = moment().startOf('week').unix();
  }
  if (selectedTimeframe === 'Last Week') {
    t.timeBegin = moment().startOf('week').unix() - 604800;
    t.timeEnd = moment().startOf('week').unix() - 1;
  }
  return t;
}

export function convertCustomTimeSelection(timeBegin: Date, timeEnd: Date): object {
  // Takes two Date objects as input
  const t = { timeBegin: 0, timeEnd: 0 };
  t.timeBegin = timeBegin.getTime() / 1000;
  t.timeEnd = timeEnd.getTime() / 1000;
  return t;
}

export function timeValue(timeBegin: Date, timeEnd: Date): void {
  // prints human readable begin and end times to console.  Takes two Date objects as input
  log.debug('time1:', timeBegin.getTime() / 1000);
  log.debug('time2:', timeEnd.getTime() / 1000);
}


export function getFirstKey(o: object | any): string | null {
  // returns the 'first' key name of a generic object - a bit of a hack since dicts aren't really ordered.
  // Returns null if object is empty
  // return Object.keys(o)[0];
  for (let s in o) {
    if (o.hasOwnProperty(s)) {
      return s;
    }
  }
  return null;
}


export function uniqueArrayValues(a: string[]): string[] {
  // De-duplicates an array of strings and returns the de-duplicated array
  let unique = [];
  for (let i = 0; i < a.length; i++) {
    let current = a[i];
    if (unique.indexOf(current) < 0) { unique.push(current); }
  }
  return unique;
}

export function grokLines(t: string): any[] {
  // Converts a multi-line string (with newline delimiters) into an (de-duplicated) array of strings.
  let terms = t.split('\n');
  let midterms: any = [];
  for (let i = 0; i < terms.length; i++) {
    let term = terms[i];
    term = term.replace(/\s+$/g, ''); // remove trailing whitespace
    term = term.replace(/^\s+/g, '');  // remove leading whitespace
    if ( ! term.match(/^\s*$/g) ) { // remove blank lines from array
      midterms.push(term);
    }
  }
  let endterms = uniqueArrayValues(midterms); // de-deduplicate array
  return endterms;
}

export function grokHashingLines(v: string): any {
  // converts a multi-line string (with newline delimiters) into a de-duplicated array of objects, { hash: string, friendly: string }
  // a line from the input string may be either a single hash value, or a comma-separated hash, friendlyName value

  let n = v.split('\n'); // split by newline
  let newArray = [];
  let hashTracker = []; // used for de-duplicating hash entries

  for (let x = 0; x < n.length; x++) {
    // remove blank lines
    if (!n[x].match(/^\s*$/)) {
      newArray.push(n[x]);
    }
  }

  let keysArray = []; // this is the array of objects that we return

  for (let i = 0; i < newArray.length; i++) {
    let x = { hash: '', friendly: '' }; // x is the object which we will add to the array
    let y = newArray[i].split(','); // split our line by comma

    y[0] = y[0].trim(); // remove trailing and leading whitespace from key name, if any

    if (y[0].match(/\s/)) {
      // We will skip this row if the key contains any remaining whitespace
      continue;
    }

    if (!hashTracker.includes(y[0])) { // de-dupe hashes
      hashTracker.push(y[0]);
      x.hash = y[0]; // assign hash id

      if (y.length >= 2) {
        // if user specifies CSV notation, save the second part as the friendly identifier
        let s = y[1].trim(); // remove leading and trailing whitespace
        x.friendly = s;
      }

      keysArray.push(x);
    }
  }
  // log.debug('AddCollectionModalComponent: grokHashingLines(): keysArray:', keysArray);
  return keysArray;
}

export function pathToFilename(s: string): string {
  const RE = /([^/]*)$/;
  let match = RE.exec(s);
  return match[0];
}

export function toCaps(s: string): string {
  return s.toUpperCase();
}

export function capitalizeFirstLetter(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getHashesFromConfig(a: any[]): string {
  let text = '';
  for (let i = 0; i < a.length; i++) {
    text += a[i].hash + ',' + a[i].friendly;
    if (i < a.length - 1) { // omit the newline on the last line
     text += '\n';
    }
  }
  return text;
}

