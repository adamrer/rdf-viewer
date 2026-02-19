import { Language } from "./query/query-interfaces";

type IRI = string

type LanguageString = { [language: Language]: string };

export type{
    IRI,
    LanguageString
}