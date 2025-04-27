const titlePredicates = [ 
    'http://purl.org/dc/terms/title', 
    'https://www.w3.org/2000/01/rdf-schema#label', 
    'http://www.w3.org/2004/02/skos/core#prefLabel' 
]


export async function displayQuads(entityIri, fetcher, language, resultsEl) {
    const messageEl = document.createElement('p');
    resultsEl.appendChild(messageEl);
  
    const resultTitle = document.createElement('h2');
    resultsEl.appendChild(resultTitle);
  
    messageEl.textContent = 'Loading data...';
  
    const builder = fetcher.builder();
    const query = builder
        .subject(entityIri)
        .lang([language])
        .quadsWithoutLang()
        .build();
        
    try {

        const quadsBySource = await fetcher.fetchQuads(query);

        let entityLabel = getLabelFromQuads(quadsBySource);
        if (!entityLabel) {
            entityLabel = entityIri;
        }
        resultTitle.textContent = `Results for ${entityLabel}`;

        const preparedRowsBySource = await prepareRows(
            quadsBySource,
            fetcher,
            language
        );

        messageEl.textContent = 'Data successfully loaded!';
        
        renderTable(preparedRowsBySource, resultsEl)

        } catch (error) {
            messageEl.textContent = 'Error occurred while loading data';
            console.error(error);
        }
}
function prepareRows(quadsBySource, fetcher, language){
    return Promise.all(
        quadsBySource.map(async (fetched) => {
          const rows = await Promise.all(
            fetched.quads.map((quad) => prepareRow(quad, fetcher, language))
          );
          return {
            dataSourceTitle: fetched.dataSourceTitle,
            quads: rows,
          };
        })
      );
}

function renderTable(preparedRowsBySource, resultsEl){
    const table = createAttributeTable();
    const tbody = document.createElement('tbody');

    preparedRowsBySource.forEach((source) => {
        const endpointResultEl = document.createElement('div');
        const endpointTitle = document.createElement('h3');
        endpointTitle.textContent = source.dataSourceTitle;
        endpointResultEl.appendChild(endpointTitle);

        if (source.quads.length === 0) {
            const noQuadsEl = document.createElement('p');
            noQuadsEl.innerText = 'No data found from this data source';
            endpointResultEl.appendChild(noQuadsEl);
        } else {
            source.quads.forEach((row) => {
                addRowToTableBody(row, tbody);
            });
        }

        table.appendChild(tbody);
        endpointResultEl.appendChild(table);
        resultsEl.appendChild(endpointResultEl);
    });
}
function addRowToTableBody(preparedRow, tableBodyEl){
    const row = document.createElement("tr")
    const attribute = document.createElement("td")
    attribute.innerText = preparedRow.predicate
    const value = document.createElement("td")
    value.innerHTML = preparedRow.object
    attribute.style.border = "1px solid rgb(160 160 160)"
    value.style.border = "1px solid rgb(160 160 160)"
    row.appendChild(attribute)
    row.appendChild(value)
    tableBodyEl.appendChild(row)
}
async function getObjectTitle(object, fetcher, language){
    if (object.termType === 'Literal') {
        return object.value;
      }
      const title = await getTitle(object.value, fetcher, language);
      return `<a href="${object.value}">${title}</a>`;
}
async function prepareRow(quad, fetcher, language){
    const predicate = await getTitle(quad.predicate.value, fetcher, language)
    const object = await getObjectTitle(quad.object, fetcher, language)
    return { predicate, object }

}

async function getTitle(iri, fetcher, language){
    const builder = fetcher.builder()
    builder.subject(iri)
        .predicates(titlePredicates)
        .lang([language])
        .quadsWithoutLang()
    const quadsBySource = await fetcher.fetchQuads(builder.build())
    let title = iri
    quadsBySource.forEach(fetchedQuads =>{
        if (fetchedQuads.quads.length !== 0){
            title = fetchedQuads.quads[0].object.value
            return
        }
    })
    return title
}

function createAttributeTable(){
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const trAttribute = document.createElement("th")
    trAttribute.innerText = "Attribute"
    const trValue = document.createElement("th");
    trValue.innerText = "Value"
    
    trValue.style.border = "1px solid rgb(160 160 160)"
    trAttribute.style.border = "1px solid rgb(160 160 160)"
    table.style.border = "1px solid rgb(160 160 160)"
    table.style.margin = "1rem"

    thead.appendChild(trAttribute)
    thead.appendChild(trValue)
    table.appendChild(thead);
    
    return table;
}


function getLabelFromQuads(fetchedQuads){
    if (fetchedQuads.length!==0){
        let title = null
        fetchedQuads.forEach(fetchedQuad => {
            fetchedQuad.quads.forEach(quad => {
                if (titlePredicates.includes(quad.predicate.value))
                    title = quad.object.value
                    return
            })
            
        });
        return title
    }
    else {
        return ''
    }
}

