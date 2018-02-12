import { Query } from './query';

export const defaultSaQueries: Query[] = [
  {
    text: 'All Supported File Types',
    // queryString: `filetype = 'jpg','gif','png','pdf','office 2007 document','zip','rar','windows executable','x86 pe','windows dll','x64pe','apple executable (pef)','apple executable (mach-o)'`
// !!! need to add office and exe's and RAR
    queryString: `[ { "any" : [ "file_type~GIF", "file_type=PNG", "file_type=JPEG", "file_type=PDF", "file_type=ZIP", "file_type=RAR", "file_extension=\\"gif\\"", "file_extension=\\"jpg\\"", "file_extension=\\"jpeg\\"", "file_extension=\\"png\\"", "file_extension=\\"pdf\\"", "file_extension=\\"docx\\"", "file_extension=\\"xlsx\\"", "file_extension=\\"pptx\\"", "file_extension=\\"zip\\"", "file_extension=\\"rar\\"", "file_extension=\\"zip\\"", "file_extension=\\"exe\\"", "file_extension=\\"dll\\"" ] } ]`
      // 'office 2007 document',
      // 'windows executable',
      // 'x86 pe',
      // 'windows dll',
      // 'x64pe',
      // 'apple executable (pef)',
      // 'apple executable (mach-o)'
  },

  {
    text: `PDF's and Office Docs`,
// !!! need to add office
    queryString: `[ { "any" : [ "file_type=PDF", "file_extension=pdf", "file_extension=\\"docx\\"", "file_extension=\\"xlsx\\"", "file_extension=\\"pptx\\"" ] } ]`
    // "file_type=OFFICE",
  },

  {
    text: `PDF's, Office Docs, ZIP and RAR Archives`,
// !!! need to add office and confirm rar
    queryString: `[ { "any" : [ "file_type=PDF", "file_type=ZIP", "file_type=RAR", "file_extension=\\"pdf\\"", "file_extension=\\"docx\\"", "file_extension=\\"xlsx\\"", "file_extension=\\"pptx\\"", "file_extension=\\"zip\\"", "file_extension=\\"rar\\"" ] } ]`
    // "file_type=OFFICE"
  },

  {
    text: 'ZIP and RAR Archives',
// ! need to confirm RAR
    queryString: `[ { "any" : [ "file_type=ZIP", "file_type=RAR", "file_extension=\\"zip\\"", "file_extension=\\"rar\\"" ] } ]`
  },

  {
    text: 'Images',
    queryString: `[ { "any" : [ "file_type~GIF", "file_type=PNG", "file_type=JPEG", "file_extension=\\"gif\\"", "file_extension=\\"jpg\\"", "file_extension=\\"jpeg\\"", "file_extension=\\"png\\"" ] } ]`
  },

  {
    text: 'Windows Executables',
    queryString: `[ { "any" : [ "file_type=EXE", "file_type='windows executable'", "file_type='windows dll'", "file_type='x86 pe'", "file_type=x64pe", "file_extension=\\"exe\\"", "file_extension=\\"dll\\"" ] } ]`
  },

  {
    text: 'Mac Executables',
    queryString: `[ { "any" : [ "file_type=\\"apple executable (pef)\\"", "file_type=\\"apple executable (mach-o)\\"" ] } ]`
  },

  // {text: 'Images or PDF Documents', queryStringString: `filetype = 'jpg','gif','png','pdf'`},

  // {text: 'Images, ZIP or RAR Archives', queryStringString: `filetype = 'jpg','gif','png','zip','rar'`},

  {
    text: 'Windows and Mac Executables',
    // queryString: `filetype = 'windows executable','x86 pe','windows dll','x64pe','apple executable (pef)','apple executable (mach-o)'`
    queryString: `[]`
  },

  {
    text: 'Preset Query',
    queryString: `[]`
  },

  {
    text: 'Custom Query',
    queryString: `[]`
  }

];
