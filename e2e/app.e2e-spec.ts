import { Two21bClientPage } from './app.po';

describe('two21b-client App', () => {
  let page: Two21bClientPage;

  beforeEach(() => {
    page = new Two21bClientPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!');
  });
});
