export interface Query {
  text: string;
  queryString?: string;
  query?: any[]; // an array containing JSON query for SA
}
