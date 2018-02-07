import { Query } from './query';

export const defaultSaQueries: Query[] = [
  {
    text: 'All Supported File Types',
    // queryString: `filetype = 'jpg','gif','png','pdf','office 2007 document','zip','rar','windows executable','x86 pe','windows dll','x64pe','apple executable (pef)','apple executable (mach-o)'`
// !!! need to add office and exe's and RAR
    query: [
      'file_type~GIF',
      'file_type=PNG',
      'file_type=JPEG',
      'file_type=PDF',
      'file_type=ZIP',
      'file_type=RAR'
      // 'office 2007 document',
      // 'windows executable',
      // 'x86 pe',
      // 'windows dll',
      // 'x64pe',
      // 'apple executable (pef)',
      // 'apple executable (mach-o)'
    ],
  },

  {
    text: `PDF's and Office Docs`,
// !!! need to add office
    query: [
      'file_type=PDF'
      // 'file_type=OFFICE'
    ]

  },

  {
    text: `PDF's, Office Docs, ZIP and RAR Archives`,
// !!! need to add office and confirm rar
    query: [
      'file_type=PDF',
      'file_type=ZIP',
      'file_type=RAR',
      // 'file_type=OFFICE'
    ]
  },

  {
    text: 'ZIP and RAR Archives',
// ! need to confirm RAR
    query: [
      'file_type=ZIP',
      'file_type=RAR'
    ]
  },

  {
    text: 'Images',
    query: [
      'file_type~GIF',
      'file_type=PNG',
      'file_type=JPEG'
    ]
  },

  {
    text: 'Windows Executables',
    query: [
      'file_type=EXE',
      'file_type="windows executable"',
      'file_type="windows dll"',
      'file_type="x86 pe"',
      'file_type=x64pe'
    ]
  },

  {
    text: 'Mac Executables',
    query: [
      'file_type="apple executable (pef)"',
      'file_type="apple executable (mach-o)"'
    ]
  },

  // {text: 'Images or PDF Documents', queryString: `filetype = 'jpg','gif','png','pdf'`},

  // {text: 'Images, ZIP or RAR Archives', queryString: `filetype = 'jpg','gif','png','zip','rar'`},

  {
    text: 'Windows and Mac Executables',
    // queryString: `filetype = 'windows executable','x86 pe','windows dll','x64pe','apple executable (pef)','apple executable (mach-o)'`
    query: []
  },

  {
    text: 'Preset Query',
    query: []
  },

  {
    text: 'Custom Query',
    query: []
  }

];
