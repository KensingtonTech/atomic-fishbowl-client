import { Query } from './query'

export const defaultQueries: Query[] = [
  { text: 'All Supported File Types', queryString: `filetype = 'jpg','gif','png','pdf','office 2007 document','zip','rar','windows executable','x86 pe','windows dll','x64pe','apple executable (pef)','apple executable (mach-o)'`},
  { text: `PDF's and Office Docs`, queryString: `filetype = 'pdf','office 2007 document'`},
  { text: `PDF's, Office Docs, ZIP and RAR Archives`, queryString: `filetype = 'pdf','office 2007 document','zip','rar'`},
  { text: 'ZIP and RAR Archives', queryString: `filetype = 'zip','rar'`},
  { text: 'Images', queryString: `filetype = 'jpg','gif','png'`},
  { text: 'Windows Executables', queryString: `filetype = 'windows executable','windows dll','x86 pe','x64pe'`},
  { text: 'Mac Executables', queryString: `filetype = 'apple executable (pef)','apple executable (mach-o)'`},
  // {text: 'Images or PDF Documents', queryString: `filetype = 'jpg','gif','png','pdf'`},
  // {text: 'Images, ZIP or RAR Archives', queryString: `filetype = 'jpg','gif','png','zip','rar'`},
  { text: 'Windows and Mac Executables', queryString: `filetype = 'windows executable','x86 pe','windows dll','x64pe','apple executable (pef)','apple executable (mach-o)'`},
  { text: 'Default Query', queryString: `` },
  { text: 'Custom Query', queryString: ``}
];
