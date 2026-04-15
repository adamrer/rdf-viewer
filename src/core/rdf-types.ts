import { Language } from "../query/query";

type IRI = string;

type LanguageString = { [language: Language]: string };

export type { IRI, LanguageString };
