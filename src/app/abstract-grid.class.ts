import { ContentMask } from 'types/contentmask';

export abstract class AbstractGrid {
  onSearchBarOpen: (state: boolean) => void;
  onMaskChanged: (event: ContentMask) => void;
  onSearchTermsTyped: (searchTerms: string) => void;
  onToggleCaseSensitiveSearch: () => void;
  onNextSessionClicked: () => void;
  onPreviousSessionClicked: () => void;
}
