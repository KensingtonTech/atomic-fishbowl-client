export interface NwServer {
  id: string; // this is a uuid
  friendlyName: string;
  host: string;
  port: number;
  ssl: boolean;
  user: string;
  deviceNumber: number;
  password?: string;
}

export interface NwServers {
  [id: string]: NwServer;
}
