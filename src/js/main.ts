import '../css/style.css'
import './loadRdf.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div class="header">
        <div>
            <input id="add-data-source-text" placeholder="Enter SPARQL Endpoint URL" type="text" />

            <button id="add-data-source-btn" >Add data source</button>
            
            <input type="file" id="source-input" accept=".ttl,.trig,.nt,.n3,.nq">


            <h4>SPARQL endpoint data sources:</h4>
            <ul id="data-sources">
            </ul>
        </div>

        <div>
            <label for="target-resource">
                Target source: 
                <input id="target-resource" type="text" placeholder="Enter Resource URL" value="https://data.gov.cz/zdroj/lokální-katalogy/00064459/1296195519">
            </label>
            
            
        </div>

        <div>
            <button id='fetch-btn' >Fetch Triples</button>
        </div>
    </div>
    <hr>
    <div id="results">


    </div>
`

