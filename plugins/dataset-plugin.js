const dcterms = "http://purl.org/dc/terms/";
const dcat = "http://www.w3.org/ns/dcat#";
const skos = "http://www.w3.org/2004/02/skos/core#";
const vcard = "http://www.w3.org/2006/vcard/ns#";
const rdfs = "http://www.w3.org/2000/01/rdf-schema#";
const foaf = "http://xmlns.com/foaf/0.1/";
const labelPredicates = [
  dcterms + "title",
  rdfs + "label",
  skos + "prefLabel",
  vcard + "fn",
  "https://slovník.gov.cz/legislativní/sbírka/111/2009/pojem/má-název-orgánu-veřejné-moci",
];

export async function displayQuads(context) {
  context.notifyUser("Loading data...", "info");
  await context.loadData(labelPredicates);
  await loadAdditionalData(context, dcat + "distribution", labelPredicates);
  await loadAdditionalData(context, dcterms + "temporal", labelPredicates);
  context.notifyUser("Data loaded!", "success");
  context.mount(createDatasetHtml(context));
}

/**
 * Loads additional data to Rendering context of objects from given predicate
 *
 * @param {*} context - Rendering context
 * @param {string} predicateIri - IRI of a predicate of the main subject to take objects as sources of additional data
 * @param {string[]} labelPredicates - Predicates to label the new additional data
 * @returns {Promise<void[]>}
 */
async function loadAdditionalData(context, predicateIri, labelPredicates) {
  const AdditionalSubjectIris = context.getObjects(predicateIri);
  const promises = AdditionalSubjectIris.map((sourcedObject) =>
    context.loadData(labelPredicates, sourcedObject.term.value),
  );
  return Promise.all(promises);
}
/**
 * Creates html for list of distributions from context
 *
 * @param {*} context - Rendering context
 * @returns {HTMLElement}
 */
function createDistributionsHtml(context) {
  const wrapper = document.createElement("div");
  const heading = document.createElement("h2");
  const distrLabel = context.getLabel(dcat + "distribution");
  if (distrLabel)
    heading.appendChild(createLabelHtml(dcat + "distribution", distrLabel));

  const distributions = context.getObjects(dcat + "distribution");
  const distributionsElement = document.createElement("div");
  for (const distr of distributions) {
    distributionsElement.appendChild(
      createDistributionFieldSet(distr.term.value, context),
    );
  }
  wrapper.appendChild(heading);
  wrapper.appendChild(distributionsElement);
  return wrapper;
}
/**
 * Creates HTML fieldset element for a distribution specified by it's IRI
 *
 * @param {string} distributionIri - IRI of a distribution
 * @param {*} context - Rendering context
 * @returns {HTMLElement}
 */
function createDistributionFieldSet(distributionIri, context) {
  const fieldSet = document.createElement("fieldset");
  fieldSet.style.borderRadius = "25px";
  const legend = document.createElement("legend");
  const label = context.getLabel(distributionIri);
  if (label) {
    const bold = document.createElement("b");
    const labelHtml = createLabelHtml(distributionIri, label);
    bold.appendChild(labelHtml);
    legend.appendChild(bold);
  } else legend.textContent = distributionIri;

  const distributionPredicates = [
    dcterms + "title",
    dcterms + "format",
    dcat + "downloadURL",
    dcat + "accessURL",
  ];
  fieldSet.appendChild(legend);
  fieldSet.appendChild(
    createDl(context, distributionPredicates, distributionIri),
  );
  return fieldSet;
}
/**
 * Creates HTML for a dataset specified by user in context
 *
 * @param {*} context - Rendering context
 * @returns {HTMLElement}
 */
function createDatasetHtml(context) {
  const resultElement = document.createElement("div");
  resultElement.appendChild(createHeading(context));
  resultElement.appendChild(createSubHeading(context));

  resultElement.appendChild(createTimeIntervalHtml(context));
  const datasetPredicates = [
    dcterms + "spatial",
    dcterms + "publisher",
    dcat + "keyword",
    dcat + "theme",
    dcterms + "accessRights",
    dcterms + "accrualPeriodicity",
    foaf + "page",
    dcat + "contactPoint",
  ];
  resultElement.appendChild(
    createDl(context, datasetPredicates, context.subjectIri),
  );
  resultElement.appendChild(createDistributionsHtml(context));
  return resultElement;
}
function createTimeIntervalHtml(context) {
  const timeIntervals = context.getObjects(dcterms + "temporal");
  if (timeIntervals.length > 0) {
    const timeIntervalPredicates = [dcat + "startDate", dcat + "endDate"];
    return createDl(
      context,
      timeIntervalPredicates,
      timeIntervals[0].term.value,
    );
  }
  return document.createElement("div");
}
/**
 * Creates H1 heading for the main subject of a context
 *
 * @param {*} context - Rendering context
 * @returns {HTMLElement}
 */
function createHeading(context) {
  const titleElement = document.createElement("h1");
  const label = context.getLabel();
  if (label)
    titleElement.appendChild(createLabelHtml(context.subjectIri, label));
  else titleElement.textContent = context.subjectIri;
  return titleElement;
}
function createSubHeading(context) {
  const descriptionElement = document.createElement("p");
  const description = context.getObjects(dcterms + "description");
  if (description.length > 0)
    descriptionElement.appendChild(
      createLabelHtml(description[0].term.value, description[0]),
    );

  return descriptionElement;
}
/**
 * Creates HTML dl element based on specified predicates for a subject
 *
 * @param {*} context - Rendering context
 * @param {string[]} predicateIris - Predicates to have in dl
 * @param {string} subjectIri - Subject that has the predicates
 * @returns {HTMLDListElement}
 */
function createDl(context, predicateIris, subjectIri) {
  const dlElement = document.createElement("dl");
  for (const predicateIri of predicateIris) {
    if (context.getObjects(predicateIri, subjectIri).length > 0)
      addPredicateToDl(context, predicateIri, subjectIri, dlElement);
  }
  return dlElement;
}
/**
 * Adds a predicate of a subject to given dl HTML element
 *
 * @param {*} context - Rendering context
 * @param {string} predicateIri
 * @param {string} subjectIri
 * @param {HTMLDListElement} dlElement
 */
function addPredicateToDl(context, predicateIri, subjectIri, dlElement) {
  const dtElement = document.createElement("dt");
  const termElement = document.createElement("b");
  const label = context.getLabel(predicateIri);
  if (label) {
    dtElement.appendChild(createLabelHtml(predicateIri, label));
  } else {
    dtElement.textContent = predicateIri;
  }
  termElement.appendChild(dtElement);
  dlElement.appendChild(termElement);
  const objects = context.getObjects(predicateIri, subjectIri);
  for (const object of objects) {
    addSourcedObjectToDl(context, object, dlElement);
  }
}
/**
 * Creates HTML for a subject with a label
 *
 * @param {string} iri - IRI of the labeled subject
 * @param {*} sourcedObjectLabel - Label returned by context
 * @returns {HTMLElement}
 */
function createLabelHtml(iri, sourcedObjectLabel) {
  const literal = sourcedObjectLabel.term;
  const bold = document.createElement("div");
  const valueElement = document.createElement("span");
  valueElement.textContent = literal.value + " ";
  const small = document.createElement("small");
  let langOrDatatype = literal.language;
  if (!langOrDatatype) {
    langOrDatatype = literal.datatype.value.split("#")[1];
  }
  small.textContent = `(${langOrDatatype}) `;
  // const sourcesSmall = document.createElement('small')
  // sourcesSmall.textContent = `[${Array.from({ length: sourcedObjectLiteral.sourceIds.length }, (_, i) => i).join(",")}]`

  bold.appendChild(valueElement);
  bold.appendChild(small);
  addCopyRedirectButtons(bold, iri);

  // bold.appendChild(sourcesSmall)

  return bold;
}
function addCopyRedirectButtons(element, iri) {
  const copyButton = document.createElement("span");
  copyButton.textContent = "📋";
  copyButton.onclick = () => {
    navigator.clipboard.writeText(iri);
  };
  copyButton.style.cursor = "pointer";
  copyButton.title = "Copy IRI to clipboard";
  const linkElement = document.createElement("a");
  linkElement.href = iri;
  linkElement.textContent = "🔗";
  linkElement.style.textDecoration = "none";
  copyButton.style.opacity = "0";
  linkElement.style.opacity = "0";
  copyButton.style.transition = "opacity 0.3s ease";
  linkElement.style.transition = "opacity 0.3s ease";
  element.addEventListener("mouseenter", () => {
    copyButton.style.opacity = "1";
    linkElement.style.opacity = "1";
  });
  element.addEventListener("mouseleave", () => {
    copyButton.style.opacity = "0";
    linkElement.style.opacity = "0";
  });
  element.appendChild(linkElement);
  element.appendChild(copyButton);
}
/**
 * Adds a sourcedObject to dl HTML element
 *
 * @param {*} context - Rendering context
 * @param {SourcedObject} sourcedObject
 * @param {HTMLDListElement} dlElement
 */
function addSourcedObjectToDl(context, sourcedObject, dlElement) {
  const ddElement = document.createElement("dd");
  const object = sourcedObject.term;
  if (object.termType === "Literal") {
    const literalHtml = createLabelHtml(sourcedObject.value, sourcedObject);
    ddElement.appendChild(literalHtml);
  } else {
    const label = context.getLabel(object.value);
    if (label) {
      ddElement.appendChild(createLabelHtml(object.value, label));
    } else {
      ddElement.textContent = object.value;
    }
  }
  dlElement.appendChild(ddElement);
}
