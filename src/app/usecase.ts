export interface UseCase {
  name: string;
  friendlyName: string;
  query: string;
  contentTypes: string[];
  description: string;
  distillationTerms?: string[];
  regexTerms?: string[];
}
