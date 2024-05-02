import fromFile from 'rdf-utils-fs/fromFile.js'
import fetchRdf from '@rdfjs/fetch'
import namespace from '@rdfjs/namespace'
import fs from 'fs'


// load from file
const rdfPath = '.\\rdf\\foaf2.rdf'
const stream = fromFile(rdfPath)
stream.on('data', quad => {
  console.log(`${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`)
})

const ns = {
    schema: namespace('http://schema.org/'),
    rdf: namespace('http://localhost:8080/data/')
}


// load from HTTP
const tbbtRes = await fetchRdf('https://zazuko.github.io/tbbt-ld/dist/tbbt.nq')
const tbbtData = await tbbtRes.dataset()

for (const quad of tbbtData){
    
    if (quad.predicate.value === ns.schema.knows.value){
        console.log(`${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`)
    }
}
const datagovRes = await fetch('https://data.gov.cz/sparql?query=define%20sql%3Adescribe-mode%20"CBD"%20%20DESCRIBE%20<https%3A%2F%2Fdata.gov.cz%2Fzdroj%2Fdatové-sady%2F00231151%2F25b6ed9faca088ebbb1064a05a24d010>&output=text%2Fplain')
let datagovData = await datagovRes.text();
fs.writeFile("./rdf/datagov.nq", datagovData, function(err) {
    if(err) {
        return console.log(err);
    }
}); 
const datagovRdfPath = "./rdf/datagov.nq"
const datagovStream = fromFile(datagovRdfPath)
datagovStream.on('data', quad => {
  console.log(`${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`)
})



