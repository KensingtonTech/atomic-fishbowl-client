export interface IsotopeAPI {
  layout: (refreshConfig?: boolean) => void;
  destroyMe: () => void;
  initializeMe: () => void;
  unhideAll: () => void;
  basicLayout: () => void;
  reloadItems: () => void;
}
