import { Meta } from './meta';

export interface Session {
  id: number;
  // meta: any = {}; // we don't know what type of meta we'll be getting
  meta: Meta; // we don't know what type of meta we'll be getting
}

export class Sessions {
  [key: number]: Session
}
