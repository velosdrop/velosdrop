declare module 'countries-list' {
  export interface Country {
    name: string;
    native: string;
    phone: string;
    continent: string;
    capital: string;
    currency: string;
    languages: string[];
    emoji: string;
    emojiU: string;
  }

  export interface Countries {
    [code: string]: Country;
  }

  export const countries: Countries;
  export const emojis: Record<string, string>;
}