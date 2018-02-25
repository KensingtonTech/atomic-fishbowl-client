import { Query } from './query';

export const defaultSaQueries: Query[] = [
  {
    text: 'All Supported File Types',
    queryString: `[ { "any" : [ "file_type~GIF", "file_type=PNG", "file_type=JPEG", "file_type=PDF", "file_type=ZIP", "file_type=RAR", "file_type=\\"PE (exe)\\"", "file_extension=\\"gif\\"", "file_extension=\\"jpg\\"", "file_extension=\\"jpeg\\"", "file_extension=\\"png\\"", "file_extension=\\"pdf\\"", "file_extension=\\"docx\\"", "file_extension=\\"xlsx\\"", "file_extension=\\"pptx\\"", "file_extension=\\"zip\\"", "file_extension=\\"rar\\"", "file_extension=\\"exe\\"", "file_extension=\\"dll\\"", "mime_type=\\"image/jpeg\\"", "mime_type=\\"image/jpg\\"", "mime_type=\\"image/gif\\"", "mime_type=\\"image/png\\"", "mime_type=\\"image/pjpeg\\"", "mime_type=\\"image/jp2\\"", "mime_type=\\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\\"", "mime_type=\\"application/vnd.openxmlformats-officedocument.presentationml.presentation\\"", "mime_type=\\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\\"", "mime_type=\\"application/zip\\"", "mime_type=\\"application/x-rar-compressed\\"", "mime_type=\\"application/pdf\\"", "mime_type=\\"application/x-msdownload\\"" ] } ]`
      // 'office 2007 document',
      // 'windows executable',
      // 'x86 pe',
      // 'windows dll',
      // 'x64pe',
      // 'apple executable (pef)',
      // 'apple executable (mach-o)'
  },

  {
    text: 'Images',
    queryString: `[ { "any" : [ "file_type~GIF", "file_type=PNG", "file_type=JPEG", "file_extension=\\"gif\\"", "file_extension=\\"jpg\\"", "file_extension=\\"jpeg\\"", "file_extension=\\"png\\"", "mime_type=\\"image/jpeg\\"", "mime_type=\\"image/jpg\\"", "mime_type=\\"image/gif\\"", "mime_type=\\"image/png\\"", "mime_type=\\"image/pjpeg\\"", "mime_type=\\"image/jp2\\"" ] } ]`
  },

  {
    text: `PDF's and Office Docs`,
    queryString: `[ { "any" : [ "file_type=PDF", "file_extension=\\"pdf\\"", "mime_type=\\"application/pdf\\"", "file_type=ZIP", "file_extension=\\"docx\\"", "mime_type=\\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\\"", "file_extension=\\"xlsx\\"", "mime_type=\\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\\"", "file_extension=\\"pptx\\"",  "mime_type=\\"application/vnd.openxmlformats-officedocument.presentationml.presentation\\"" ] } ]`
  },

  {
    text: `PDF's, Office Docs, ZIP and RAR Archives`,
    queryString: `[ { "any" : [ "file_type=PDF", "file_extension=\\"pdf\\"", "mime_type=\\"application/pdf\\"", "file_type=ZIP", "file_extension=\\"zip\\"", "mime_type=\\"application/zip\\"", "file_extension=\\"docx\\"", "mime_type=\\"application/vnd.openxmlformats-officedocument.wordprocessingml.document\\"", "file_extension=\\"xlsx\\"", "mime_type=\\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\\"", "file_extension=\\"pptx\\"", "mime_type=\\"application/vnd.openxmlformats-officedocument.presentationml.presentation\\"", "file_type=RAR", "file_extension=\\"rar\\"", "mime_type=\\"application/x-rar-compressed\\"" ] } ]`
  },

  {
    text: 'ZIP and RAR Archives',
    queryString: `[ { "any" : [ "file_type=ZIP", "file_extension=\\"zip\\"", "mime_type=\\"application/zip\\"", "file_type=RAR", "file_extension=\\"rar\\"", "mime_type=\\"application/x-rar-compressed\\"" ] } ]`
  },

  {
    text: 'Windows Executables',
    queryString: `[ { "any" : [ "file_type=\\"PE (exe)\\"", "file_extension=\\"exe\\"", "file_extension=\\"dll\\"", "mime_type=\\"application/x-msdownload\\"" ] } ]`
  },

  /*
  {
    text: 'Mac Executables',
    queryString: `[ { "any" : [ "file_type=\\"apple executable (pef)\\"", "file_type=\\"apple executable (mach-o)\\"" ] } ]`
  },*/

  /*{
    text: 'Windows and Mac Executables',
    // queryString: `filetype = 'windows executable','x86 pe','windows dll','x64pe','apple executable (pef)','apple executable (mach-o)'`
    queryString: `[]`
  },*/

  {
    text: 'Preset Query',
    queryString: `[]`
  },

  {
    text: 'Custom Query',
    queryString: `[]`
  }

];
