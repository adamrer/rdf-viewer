workspace "Prohlížeč RDF" "Toto je C4 System Context diagram systému Prohlížeč RDF" {

    !identifiers hierarchical

    model {
        user = person "Uživatel" {
            description "Chce si zobrazit entitu"
        }
        pluginDev = person "Vývojář pluginů" {
            description "Vytvoří plugin, který chce využít v aplikaci"
        }

        rdfViewer = softwareSystem "Prohlížeč RDF" {
            webApp = container "Webová aplikace" {
                technology "TypeScript, JavaScript, HTML, CSS"
                description "Webová aplikace pro vizualizaci RDF dat rozšiřitelná pluginy"
                user -> this "Používá"


                fetcher = component "Fetcher" {
                    technology "TypeScript"
                    description "Načte data z datových zdrojů ve strukturovaném formátu"

                }
                dataSource = component "Data Source" {
                    technology "TypeScript"
                    description "Načte data z jednoho SPARQL endpointu/vzdáleného souboru/nahraného souboru"
                    fetcher -> this "Získává data z"
                }
                queryProcessor = component "Query Processor" {
                    technology "TypeScript"
                    description "Zpracuje dotaz a vyfiltruje podle něj data ze souborových datových zdrojů"
                    dataSource -> this "Zpracuje dotaz pomocí"
                }
                queryBuilder = component "Query Builder" {
                    technology "TypeScript"
                    description "Vytváří dotaz pro dotazování na datové zdroje"
                    fetcher -> this "Zpřístupňuje"
                }
                query = component "Query" {
                    technology "TypeScript"
                    description "Reprezentuje dotaz pro získání dat z datových zdrojů"
                    queryBuilder -> this "Vytváří"
                    dataSource -> this "Dotazuje se pomocí"
                    fetcher -> this "Dotazuje se pomocí"
                }
                display = component "Display" {
                    technology "TypeScript"
                    description "Načte vybraný plugin a zobrazí v UI"

                }
                appState = component "App State" { 
                    technology "TypeScript"
                    description "Udržuje konfiguraci nastavenou uživatelem"
                    display -> this "Získá data zadaná uživatelem z"

                }
                plugin = component "Plugin" {
                    technology "JavaScript"
                    description "Externí rozšiřující modul, načítaný za běhu"
                    tags "ExternalComponent"
                    display -> this "Načte a zobrazí RDF pomocí"
                }
                renderingContext = component "Rendering Context" {
                    technology "TypeScript"
                    description "Seskupuje potřebné komponenty a logiku nad nimi pro plugin"
                    fetcher -> this "Je součástí"
                    plugin -> this "Získává data pomocí"
                    display -> this "Vytvoří"
                }
                ui = component "UI" {
                    technology "HTML, CSS"
                    description "Rozhraní pro uživatele"
                    user -> this "Interaguje s"
                    pluginDev -> this "Přidává pluginy v"
                    renderingContext -> this "Zobrazuje výsledek pluginu do"
                    appState -> this "Uchovává data zadaná uživatelem z"

                }
                queryProcessor -> dataSource "Pošle výsledek dotazu"
                renderingContext -> queryBuilder "Má přístup k (přes Fetcher)"
                plugin -> fetcher "Má přístup k (přes RenderingContext)"

            }
        }
        dataSources = softwareSystem "Datové zdroje" {
            description "Zdroj RDF dat. Může být SPARQL endpoint, vzdálený RDF soubor, nebo soubor nahraný uživatelem"
            tags "DataSources"
            rdfViewer.webApp -> this "Čerpá data z"
            rdfViewer.webApp.dataSource -> this "Získává data z"
        }

    }

    views {
        systemContext rdfViewer "Level1" {
            include *
            autolayout lr
        }

        container rdfViewer "Level2" {
            include *
            autolayout lr
        }

        component rdfViewer.webApp "Level3" {
            include *
        }

        dynamic rdfViewer.webApp "DisplayPlugin" {
            description "Popis postupu při zobrazení RDF dat"

            user -> rdfViewer.webApp.ui "Zadá konfiguraci a spustí zobrazování"
            rdfViewer.webApp.appState -> rdfViewer.webApp.ui "Uloží konfiguraci z"
            rdfViewer.webApp.display -> rdfViewer.webApp.appState "Získá konfiguraci z"
            rdfViewer.webApp.display -> rdfViewer.webApp.renderingContext "Vytvoří na základě konfigurace"
            rdfViewer.webApp.display -> rdfViewer.webApp.plugin "Zašle vytvořený RenderingContext"
            rdfViewer.webApp.plugin -> rdfViewer.webApp.renderingContext "Získá data pomocí"
            rdfViewer.webApp.renderingContext -> rdfViewer.webApp.queryBuilder "Vytvoří dotaz pomocí"
            rdfViewer.webApp.renderingContext -> rdfViewer.webApp.fetcher "Načte data pomocí"
            rdfViewer.webApp.fetcher -> rdfViewer.webApp.dataSource "Získá data z jednotlivých datových zdrojů"
            rdfViewer.webApp.dataSource -> dataSources "Získá data z" 
            rdfViewer.webApp.dataSource -> rdfViewer.webApp.queryProcessor "Zpracuje dotaz a získá žádaná data ze souborových datových zdrojů pomocí"
            rdfViewer.webApp.plugin -> rdfViewer.webApp.renderingContext "Předá vytvořené HTML"
            rdfViewer.webApp.renderingContext -> rdfViewer.webApp.ui "Přidá předané HTML do UI"


            autolayout lr
        }

        styles {
            element "Element" {
                color #ffffff
            }
            element "Person" {
                background #05527d
                shape person
            }
            element "Software System" {
                background #066296
            }
            element "Container" {
                background #0773af
            }
            element "Component" {
                background #3285b1
            }
            element "DataSources" {
                background #cbcbcb
                color #000000
                shape "Cylinder"
            }
            element "ExternalComponent" {
                background #b55555
            }
        }
    }

    configuration {
        scope softwaresystem
    }

}