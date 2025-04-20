const titlePredicates = [ 'http://purl.org/dc/terms/title', 'https://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2004/02/skos/core#prefLabel' ]

export async function displayQuads(entityIri, fetcher, language, resultsEl) {
    
    const resultTitle = document.createElement('h2');
    resultsEl.appendChild(resultTitle);
    
    const builder = fetcher.builder()
    const query = builder.subject(entityIri)
                        .lang([language])
                        .quadsWithoutLang()
                        .build()
    
    const quadsBySource = await fetcher.fetchQuads(query)

    
    let entityLabel = getLabelFromQuads(quadsBySource)
    if (entityLabel  === null){
        entityLabel = entityIri
    }
    
    resultTitle.textContent = `Results for ${entityLabel}`
    

    quadsBySource.forEach(fetchedQuads => {
        const endpointResultDiv = document.createElement("div");
        const endpointTitle = document.createElement("h3");
        endpointTitle.textContent = fetchedQuads.dataSourceTitle;        
        endpointResultDiv.appendChild(endpointTitle);
        
        if (fetchedQuads.quads.length === 0){
            const noQuadsEl = document.createElement("p")
            noQuadsEl.innerText = "No data found from this data source"
            endpointResultDiv.appendChild(noQuadsEl)
        }
        else{

            const table = createAttributeTable()
            const tbody = document.createElement("tbody");
    
            fetchedQuads.quads.forEach(async (quad) => {
                
                const predicateTitle = await getTitle(quad.predicate.value, fetcher, language)
                
                const object = quad.object.value;
                let objectTitle = object
                
                let objectHTML = object
                if (quad.object.termType !== 'Literal'){
                    objectTitle = await getTitle(object, fetcher, language)
                    objectHTML = `<a href=${object}>${objectTitle}</a>`
                }
                const row = document.createElement("tr")
                const attribute = document.createElement("td")
                attribute.innerText = predicateTitle
                const value = document.createElement("td")
                value.innerHTML = objectHTML
                attribute.style.border = "1px solid rgb(160 160 160)"
                value.style.border = "1px solid rgb(160 160 160)"
                row.appendChild(attribute)
                row.appendChild(value)
                tbody.appendChild(row)
            });
            
            table.appendChild(tbody)
            table.style.border = "1px solid rgb(160 160 160)"
            table.style.margin = "1rem"
            endpointResultDiv.appendChild(table);
        }
        
        resultsEl.appendChild(endpointResultDiv)
    });
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

