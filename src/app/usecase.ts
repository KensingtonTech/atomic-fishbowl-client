export interface UseCase {
  name: string;
  friendlyName: string;
  nwquery: string;
  saquery: string;
  contentTypes: string[];
  description: string;
  distillationTerms?: string[];
  regexTerms?: string[];
}
