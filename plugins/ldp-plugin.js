const ldp = 'http://www.w3.org/ns/ldp#'
const rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const labelPredicates = [
  "http://purl.org/dc/terms/title",
  "http://www.w3.org/2000/01/rdf-schema#label",
  "http://www.w3.org/2004/02/skos/core#prefLabel",
  "http://schema.org/givenName",
];

export async function displayQuads(context){
  await context.loadData(labelPredicates)
  await loadChildResources(context, context.subjectIri)
  context.mount(createLdpHtml(context))
}

async function loadChildResources(context, containerIri){
  const childResources = getChildResources(context, containerIri)
  const promises = childResources.map(resource => context.loadData(labelPredicates, resource.term.value))
  return Promise.all(promises)
}
function createLdpHtml(context){
    const result = document.createElement('div')
    result.appendChild(createHeading(context))
    result.appendChild(createList(context, context.subjectIri))
    return result
}
function createHeading(context){
    const heading = document.createElement('h1')
    const label = context.getLabel(context.subjectIri)
    if (label){
        heading.appendChild(createLabelHtml(context.subjectIri, label))
    }
    else{
        heading.textContent = context.subjectIri
    }
    return heading
}

function getChildResources(context, containerIri){
    return context.getObjects(ldp+'contains', containerIri)
}

function createList(context, containerIri){
    const children = getChildResources(context, containerIri)
    const listElement = document.createElement('ul')
    listElement.style.display = 'block'
    listElement.style.listStyleType = 'none'
    children.forEach(child => {
        listElement.appendChild(createListItem(context, child.term.value))
    });
    return listElement
}
function createToggler(context, itemElement, itemIri){
  const togglerElement = document.createElement('span')
  togglerElement.textContent = '▶'
  togglerElement.style.cursor = 'pointer'
  togglerElement.style.display = 'inline-block'
  togglerElement.style.width = '1em'
  togglerElement.style.marginRight = '0.2em'
  togglerElement.style.transition = 'transform 0.2s'
  togglerElement.addEventListener('click', async (e) => {
    e.stopPropagation()
    const sublist = itemElement.querySelector(":scope > ul")
    if (sublist){
      if (sublist.style.display === "block"){
        sublist.style.display = "none"
        togglerElement.style.transform = "rotate(0deg)"
      }
      else {
        sublist.style.display = "block"
        togglerElement.style.transform = "rotate(90deg)"
      }
    }
    else{
      await loadChildResources(context, itemIri)
      itemElement.appendChild(createList(context, itemIri))
      togglerElement.style.transform = "rotate(90deg)"
    }
  })
  return togglerElement
}
function isContainer(context, itemIri){
  const types = context.getObjects(rdf+'type', itemIri)
  return types.some((sourcedObject) => sourcedObject.term.value === ldp+'Container')
}
function createListItem(context, itemIri){
    const itemElement = document.createElement('li')
    itemElement.title = itemIri
    itemElement.style.userSelect = 'none'
    if (isContainer(context, itemIri)){
      itemElement.appendChild(createToggler(context, itemElement, itemIri))
    }

    const label = context.getLabel(itemIri)
    if (label){
      itemElement.appendChild(createLabelHtml(itemIri, label))
    }
    else {
      const span = document.createElement('span')

      span.textContent = getResourceName(itemIri)
      itemElement.appendChild(span)
    }
    return itemElement
}
function getResourceName(resourceIri){
  const split = resourceIri.split("/")
  if (split.length === 0)
    return resourceIri
  let i = split.length - 1
  while (i >= 0 && split[i] === ""){
    i--
  }
  if (i >= 0)
    return split[i]
  return resourceIri
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
  const bold = document.createElement("span");
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