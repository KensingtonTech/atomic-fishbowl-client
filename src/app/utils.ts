import dayjs from 'dayjs';
import * as log from 'loglevel';
import { SimpleChanges } from '@angular/core';
import { HashValue } from 'types/collection';

export interface CustomTimeSelection {
  timeBegin: number;
  timeEnd: number;
}

export const convertTimeSelection = (selectedTimeframe: string): CustomTimeSelection => {
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
    t.timeBegin = dayjs().startOf('day').unix();
  }
  if (selectedTimeframe === 'Yesterday') {
    t.timeEnd = dayjs().startOf('day').unix() - 1;
    t.timeBegin = dayjs().startOf('day').unix() - 86400;
  }
  if (selectedTimeframe === 'This Week') {
    const now = Math.round(d.getTime() / 1000);
    t.timeEnd = now;
    t.timeBegin = dayjs().startOf('week').unix();
  }
  if (selectedTimeframe === 'Last Week') {
    t.timeBegin = dayjs().startOf('week').unix() - 604800;
    t.timeEnd = dayjs().startOf('week').unix() - 1;
  }
  return t;
};



export const convertCustomTimeSelection = (timeBegin: Date, timeEnd: Date): CustomTimeSelection => ({
  timeBegin: timeBegin.getTime() / 1000,
  timeEnd: timeEnd.getTime() / 1000
});




export const timeValue = (timeBegin: Date, timeEnd: Date): void => {
  // prints human readable begin and end times to console.  Takes two Date objects as input
  log.debug('time1:', timeBegin.getTime() / 1000);
  log.debug('time2:', timeEnd.getTime() / 1000);
};



// returns the 'first' key name of a generic object
// Returns undefined if object is empty
export const getFirstKey = (o: object | any): string | undefined => Object.keys(o)[0];



export const deduplicateArray = <T extends Array<any>>(arr: any[]): T => [...new Set(arr as any)] as T;



export const grokLines = (t: string): string[] => {
  // Converts a multi-line string (with newline delimiters) into an (de-duplicated) array of strings.
  const terms = t.split('\n')
    .map((term) => term.trim())
    .filter( (term) => !term.match(/^$/));
  return deduplicateArray(terms);
};



export const grokHashingLines = (values: string): HashValue[] => {
  // converts a multi-line string (with newline delimiters) into a de-duplicated array of objects, { hash: string, friendly: string }
  // a line from the input string may be either a single hash value, or a comma-separated hash, friendlyName value

  const lines = values
    .split('\n') // split by newline
    .filter( (line) => !line.match(/^\s*$/));
  const hashTracker = new Set<string>(); // used for de-duplicating hash entries

  const hashArray: HashValue[] = []; // this is the array of objects that we return

  lines.forEach( (line, i) => {
    const hashValue = {
      hash: '',
      friendly: ''
    };

    const splitLine = line.split(',');
    let hash = splitLine.shift() as string;
    hash = hash.trim();
    const friendly = splitLine.length
      ? splitLine.join(',').trim()
      : '';

    if (hash.match(/\s/)) {
      // We will skip this row if the key contains any remaining whitespace
      return;
    }

    if (! hashTracker.has(hash)) {
      hashTracker.add(hash);
      hashArray.push({
        hash,
        friendly
      });
    }
  });
  return hashArray;
};



export const pathToFilename = (value: string): string => {
  const RE = /([^/]*)$/;
  const match = RE.exec(value);
  return match?.[0] ?? value;
};



export const capitalizeFirstLetter = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);



export const getHashesFromCollection = (hashes: HashValue[]): string => {
  let text = '';
  for (let i = 0; i < hashes.length; i++) {
    text += hashes[i].hash + ',' + hashes[i].friendly;
    if (i < hashes.length - 1) { // omit the newline on the last line
     text += '\n';
    }
  }
  return text;
};



export function deepCopy<T extends Record<string | number, any>>(obj: T): T;
export function deepCopy<T extends T[]>(obj: T): T[];
export function deepCopy(obj: unknown): unknown;
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function deepCopy<T extends Record<string | number, any> | T[]>(obj: T): T | T[] {
  // taken from https://jsperf.com/deep-copy-vs-json-stringify-json-parse/5
  let newObj: T | T[];
  if (obj === undefined) {
    return obj;
  }
  if (typeof obj !== 'object') {
    return obj;
  }

  if (isArray(obj)) {
    newObj = [];
    for (let i = 0; i < (obj as T[]).length; i++) {
      newObj[i] = deepCopy((obj as T[])[i]) as T;
    }
    return newObj as T[];
  }

  newObj = {} as T;
  for (const property in obj) {
    if (obj.hasOwnProperty(property)) {
      newObj[property] = deepCopy(obj[property]) as any;
    }
  }
  return newObj as T;
};



const getRootElementFontSize = (): number => parseFloat(
  // in px
  getComputedStyle(
    // for the root <html> element
    document.documentElement
  ).fontSize
);



const getElementFontSize = (element: Element): number => parseFloat(
  // of the computed font-size, so in px
  getComputedStyle(
    // for the root <html> element
    element
  ).fontSize
);



export const convertEmRelativeToElement = (value: number, element: Element): number => value * getElementFontSize(element);



export const convertRem = (value: number): number => value * getRootElementFontSize();



// from https://stackoverflow.com/questions/9333379/check-if-an-elements-content-is-overflowing
// tells if a DOM element is overflown
export const isOverflown = (element: HTMLElement): boolean => element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;



export const uriEncodeFilename = (filename: string) => encodeURIComponent(filename);



export const isEven = (num: number): boolean => num % 2 === 0;



export const getRectWidth = (rect: DOMRect): number => rect.width || (rect.right - rect.left);



export const getRectHeight = (rect: DOMRect): number => rect.height ?? (rect.bottom - rect.top);



export const getVisibleElements = (elements: HTMLCollectionOf<HTMLElement>): HTMLElement[] =>
  /*const visibleElements: HTMLElement[] = [];
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < elements.length; i++) {
    const elem = elements[i];
    const width = elem.offsetWidth;
    const height = elem.offsetHeight;
    const noWidthAndHeight = width === 0 && height === 0;
    if (noWidthAndHeight) {
      continue;
    }
    visibleElements.push(elem);
  }*/
  // return visibleElements;
  Array.from(elements).filter(
    (elem) => {
      const width = elem.offsetWidth;
      const height = elem.offsetHeight;
      const noWidthAndHeight = width === 0 && height === 0;
      return !noWidthAndHeight;
    }
  );

export const isArray = <T>(obj: T): boolean => Array.isArray(obj);


export const firstOrChangedSimpleChange = (key: string, changes: SimpleChanges): boolean => {
  const found = key in changes;
  const isFirstChange = found && changes[key].isFirstChange();
  const valueChanged = found && !isFirstChange && changes[key].currentValue !== changes[key].previousValue;
  return isFirstChange || valueChanged;
};



export const changedSimpleChange = (key: string, changes: SimpleChanges): boolean => {
  const found = key in changes;
  const isFirstChange = found && changes[key].isFirstChange();
  const valueChanged = found && !isFirstChange && changes[key].currentValue !== changes[key].previousValue;
  return !isFirstChange && valueChanged;
};



export const firstSimpleChange = (key: string, changes: SimpleChanges): boolean => {
  const found = key in changes;
  const isFirstChange = found && changes[key].isFirstChange();
  return isFirstChange;
};


export const noop = (): void => {};


export const stringToBase64 = (str: string): string => Buffer.from(str).toString('base64');



export const getArrayMemberByObjectAttribute = <T extends Record<string, T>>(array: T[], key: string, value: unknown): T => {
  for (const member of array) {
    if (member[key] === value) {
      return member;
    }
  }
  throw new Error('Not found');
};



export const toEnumerable = (obj: any) => Object.fromEntries(
  Object.getOwnPropertyNames(obj).map(prop => [prop, obj[prop]])
);
