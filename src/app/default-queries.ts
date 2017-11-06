export const defaultQueries: any[] = [
  {text: 'All Supported File Types', queryString: `filetype = 'jpg','gif','png','pdf','zip','rar','windows executable','x86 pe','windows dll','x64pe','apple executable (pef)','apple executable (mach-o)'`},
  {text: 'Images', queryString: `filetype = 'jpg','gif','png'`},
  {text: 'PDF Documents', queryString: `filetype = 'pdf'`},
  {text: 'ZIP or RAR Archives', queryString: `filetype = 'zip','rar'`},
  {text: 'Windows Executable', queryString: `filetype = 'windows executable'`},
  {text: 'Images or PDF Documents', queryString: `filetype = 'jpg','gif','png','pdf'`},
  {text: 'Images, ZIP or RAR Archives', queryString: `filetype = 'jpg','gif','png','zip','rar'`},
  {text: 'PDF Documents, ZIP or RAR Archives', queryString: `filetype = 'pdf','zip','rar'`},
  {text: 'Windows and Mac Executables', queryString: `filetype = 'windows executable','x86 pe','windows dll','x64pe','apple executable (pef)','apple executable (mach-o)'`},
  {text: 'Default Query', queryString: `` },
  {text: 'Custom Query', queryString: ``}
];
