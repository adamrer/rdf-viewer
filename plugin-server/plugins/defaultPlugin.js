const titlePredicates = [ 'http://purl.org/dc/terms/title', 'https://www.w3.org/2000/01/rdf-schema#label', 'http://www.w3.org/2004/02/skos/core#prefLabel' ] //TODO: no global variables


export async function printQuads(quadsBySource, fetcher, resultsDiv) {
    
    const resultTitle = document.createElement('h2');
    resultsDiv.appendChild(resultTitle);
    
    resultTitle.textContent = `Results for ${getLabelFromQuads(quadsBySource)}`
    

    quadsBySource.forEach(fetchedQuads => {
        const endpointResultDiv = document.createElement("div");
        const endpointTitle = document.createElement("h3");
        endpointTitle.textContent = fetchedQuads.dataSourceTitle;        
        endpointResultDiv.appendChild(endpointTitle);
        
        const table = createAttributeTable()
        const tbody = document.createElement("tbody");

        fetchedQuads.quads.forEach(async (quad) => {
            
            const predicateTitle = await fetcher.getTitle(quad.predicate.value)
            
            const object = quad.object.value;
            let objectTitle = object
            
            let objectHTML = object
            if (quad.object.termType !== 'Literal'){
                objectTitle = await fetcher.getTitle(object)
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
        if (fetchedQuads.quads.length === 0){
            const noQuadsEl = document.createElement("p")
            noQuadsEl.innerText = "No data found from this data source"
            endpointResultDiv.appendChild(noQuadsEl)
        }
        table.appendChild(tbody)
        table.style.border = "1px solid rgb(160 160 160)"
        table.style.margin = "1rem"
        endpointResultDiv.appendChild(table);
        
        resultsDiv.appendChild(endpointResultDiv)
    });
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

        let title = fetchedQuads[0].quads[0].subject.value
        fetchedQuads.forEach(fetchedQuad => {
            fetchedQuad.quads.forEach(quad => {
                if (quad.predicate.value == titlePredicates[0])
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
