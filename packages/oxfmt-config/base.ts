import type { OxfmtConfig } from 'oxfmt'

export const baseConfig: OxfmtConfig = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  insertFinalNewline: true,
  sortImports: { enabled: true },
  sortTailwindcss: { enabled: true },
  sortPackageJson: { enabled: true },
}
