export class NwServer {
  id?: string; // this is a uuid and is optional because we don't know it before we create it
  friendlyName: string;
  host: string;
  port: number;
  ssl: boolean;
}
