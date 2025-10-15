// Built-in calls

import N3, { Variable, Literal, DataFactory } from "n3";
import { Substitution, NO_LANG_SPECIFIED, Language, ANY_LANGUAGE, BuiltInCall, OperatorExpression } from "./query-interfaces";
import { BuiltInCallImpl, OperatorExpressionImpl } from "./query-node-implementations"

// return true if 'value' has a language tag
const lang = (variable: Variable) =>
  new BuiltInCallImpl(
    "LANG",
    (variablesSubstitution: Substitution) => {
      const value = variablesSubstitution[variable.value];
      return (
        N3.Util.isLiteral(value) &&
        (value as Literal).language !== NO_LANG_SPECIFIED
      );
    },
    variable,
  );
const isIri = (variable: Variable) =>
  new BuiltInCallImpl(
    "isIRI",
    (variablesSubstitution: Substitution) =>
      N3.Util.isNamedNode(variablesSubstitution[variable.value]),
    variable,
  );
const isUri = (variable: Variable) =>
  new BuiltInCallImpl(
    "isURI",
    (variablesSubstitution: Substitution) =>
      N3.Util.isNamedNode(variablesSubstitution[variable.value]),
    variable,
  );
const isBlank = (variable: Variable) =>
  new BuiltInCallImpl(
    "isBLANK",
    (variablesSubstitution: Substitution) =>
      N3.Util.isBlankNode(variablesSubstitution[variable.value]),
    variable,
  );
const isLiteral = (variable: Variable) =>
  new BuiltInCallImpl(
    "isLITERAL",
    (variablesSubstitution: Substitution) =>
      N3.Util.isLiteral(variablesSubstitution[variable.value]),
    variable,
  );
const isNumeric = (variable: Variable) =>
  new BuiltInCallImpl(
    "isNUMERIC",
    (variablesSubstitution: Substitution) => {
      if (typeof variablesSubstitution[variable.value] === "number")
        return true;
      return false;
    },
    variable,
  );
// TODO: langMatches to match all languages
const langMatches = (
  variable: Variable,
  language: Language | typeof ANY_LANGUAGE,
) =>
  new BuiltInCallImpl(
    "langMatches",
    (variablesSubstitution: Substitution) => {
      if (!N3.Util.isLiteral(variablesSubstitution[variable.value])) {
        return false;
      }
      if (language === ANY_LANGUAGE) {
        return true;
      }
      return (
        (
          variablesSubstitution[variable.value] as Literal
        ).language.toLocaleLowerCase() === language.toLocaleLowerCase()
      );
    },
    variable,
    language,
  );

// Operator expressions
const or = (
  firstArg: BuiltInCall | OperatorExpression,
  secondArg: BuiltInCall | OperatorExpression,
) =>
  new OperatorExpressionImpl(
    "||",
    [firstArg, secondArg],
    (variablesSubstitution: Substitution) => {
      const firstValue = firstArg.evaluate(variablesSubstitution);
      const secondValue = secondArg.evaluate(variablesSubstitution);
      return firstValue || secondValue;
    },
  );
const langEquality = (variable: Variable, language: Language) =>
  new OperatorExpressionImpl(
    "=",
    [lang(variable), DataFactory.literal(language)],
    (variablesSubstitution: Substitution) => {
      const value = variablesSubstitution[variable.value];
      if (!N3.Util.isLiteral(value) && language !== NO_LANG_SPECIFIED) {
        return false;
      }
      if (language === NO_LANG_SPECIFIED && !N3.Util.isLiteral(value)) {
        return true;
      }

      const literal = value as Literal;
      return literal.language.toLowerCase() === language.toLowerCase();
    },
  );


export {
  or,
  langEquality,
  isIri,
  isUri,
  isBlank,
  isLiteral,
  isNumeric,
  langMatches,
};