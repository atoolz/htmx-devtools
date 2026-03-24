declare const browser: typeof chrome | undefined

export const api: typeof chrome =
  typeof browser !== 'undefined' ? browser : chrome
