import {DataSource, 
    SparqlDataSource, 
    FileDataSource } from './fetch-quads'
    import {DisplayPlugin} from './plugin'

export function getDataSources(): Array<DataSource> {
    const endpointUrls = getEndpointUrls()
    const dataSources: Array<DataSource> = endpointUrls.map(url => new SparqlDataSource(new URL(url)))
    const dataSourceFiles = getDataSourceFiles()
    dataSources.push(...dataSourceFiles.map(file => new FileDataSource(file)))

    return dataSources

}

export function getEntityIri(): string {
    return (document.getElementById('target-resource') as HTMLInputElement).value
}


export function getLanguage(): string {
    return (document.getElementById('language') as HTMLInputElement).value
}
export function createPluginMenu(): void {
    const pluginDiv = document.getElementById('plugins')
    const plugins: Array<DisplayPlugin> = JSON.parse(localStorage.getItem("plugins")!)

    plugins.forEach(plugin => {
        const pluginUrl = plugin.url.toString()
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "plugin";
        radio.id = pluginUrl;
        radio.value = pluginUrl;
    
        if (localStorage.getItem("selectedPlugin") === pluginUrl) {
            radio.checked = true;
        }
    
        radio.addEventListener("change", () => {
            console.log(`Plugin změněn na: ${plugin.label}`);
            localStorage.setItem("selectedPlugin", pluginUrl);
        });
    
        const label = document.createElement("label");
        label.htmlFor = pluginUrl;
        label.textContent = plugin.label;
    
        pluginDiv?.appendChild(radio);
        pluginDiv?.appendChild(label);
        pluginDiv?.appendChild(document.createElement("br")); 
    });

}

export function addDataSource(): void {
    const source : HTMLInputElement = document.getElementById('add-data-source-text') as HTMLInputElement;
    const dataSourcesList  = document.getElementById('data-sources')!;

    const sourceItem = document.createElement("li");
    sourceItem.innerHTML = `<span>${source.value}</span>`;

    const deleteBtn : HTMLButtonElement = document.createElement('button') as HTMLButtonElement;
    deleteBtn.textContent = 'Remove';
    deleteBtn.onclick = function(){
        deleteBtn!.parentNode!.parentNode!.removeChild(deleteBtn!.parentNode!);
    };
    sourceItem.appendChild(deleteBtn);
    dataSourcesList.appendChild(sourceItem);

    source.value = '';

}


export function getDataSourceFiles() : Array<File> {
    const files : FileList = (document.getElementById('source-input') as HTMLInputElement).files!;
    return Array.from(files);

}
function getEndpointUrls() : Array<string>{
    const endpointUrls: Array<string> = [];
    const dataSourcesElements = document.getElementById('data-sources')!.children;
    for (let i = 0; i < dataSourcesElements.length; i++){
        endpointUrls.push(dataSourcesElements[i].children[0].textContent!);
    }
    return endpointUrls;
}