workspace "Prohlížeč RDF" "Toto je C4 System Context diagram systému Prohlížeč RDF" {

    !identifiers hierarchical

    model {
        user = person "Uživatel" {
            description "Chce si zobrazit entitu"
        }
        admin = person "Administrátor" {
            description "Spravuje aplikaci"

        }

        rdfViewer = softwareSystem "Prohlížeč RDF" {
            webApp = container "Webová aplikace" {
                technology "TypeScript, JavaScript, HTML, CSS"
                description "Webová aplikace pro vizualizaci RDF dat rozšiřitelná pluginy"
                user -> this "Používá"
                admin -> this "Spravuje"
                
                
                

                group "Plugin API"{
                    
                    pluginModule = component "Plugin Module" {
                        technology "JavaScript"
                        tags ExternalComponent
                        description "Externí rozšiřující modul pro registrování nových Pluginů za běhu"


                    }
                    plugin = component "Plugin" {
                        technology "JavaScript"
                        description "Zobrazuje RDF data"
                        
                        pluginModule -> this "Zaregistruje nový"
                    }

                    
                    pluginInstanceContext = component "Plugin Instance Context" {
                        technology "TypeScript"
                        description ""

                        plugin -> this "Vytváří zobrazení entity s pomocí"

                    }
                    setupContext = component "Setup Context" {
                        technology "TypeScript"

                        plugin -> this "Inicializuje se s pomocí"
                    }
                    compatibilityContext = component "Compatibility Context" {
                        technology "TypeScript"
                        description "Umožňuje funkcionalitu pro zjištění kompatibility pluginu"
                        
                        plugin -> this "Zjišťuje kompatibilitu s entitou s pomocí"
                    }
                    dataContext = component "Data Context" {
                        technology "TypeScript"
                        description "Umožňuje pluginu funkcionalitu pro získávání dat z datových zdrojů."
                        
                        pluginInstanceContext -> this "Zpřístupňuje"
                        compatibilityContext -> this "Zpřístupňuje"
                    }

                }
                group "Fetch" {

                    fetcher = component "Fetcher" {
                        technology "TypeScript"
                        description "Načte data z datových zdrojů ve strukturovaném formátu"

                        dataContext -> this "Zpřístupňuje"
                    }
                    dataSource = component "Data Source" {
                        technology "TypeScript"
                        description "Načte data z jednoho SPARQL endpointu/vzdáleného souboru/nahraného souboru"
                        fetcher -> this "Získává data z"
                    }
                }
                group "Query" {

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
                    }
                }
                group "Jádro aplikace"{
                    render = component "Render Entity with Plugin" {
                        technology "TypeScript"
                        description "Načte vybraný plugin a zobrazí ve View"

                    }
                    appState = component "RdfViewerState" { 
                        technology "TypeScript"
                        description "Spravuje stav aplikace"
                        render -> this "Získá data zadaná uživatelem z"

                    }
                    
                    
                    viewSetup = component "View Setup"{
                        technology "TypeScript"
                        description "Propojuje View s logikou aplikace"

                        

                    }
                    config = component "Config" {
                        technology "TypeScript"
                        description "Počáteční konfigurace stavu aplikace"

                        appState -> this "Načítá iniciální stav z"
                        admin -> this "Nastavuje iniciální stav v"
                    }
                }
                view = component "View" {
                    technology "HTML, CSS"
                    description "Rozhraní pro uživatele"

                    user -> this "Interaguje s"
                    admin -> this "Mění vzhled"
                    appState -> this "Uchovává data zadaná uživatelem z"
                    render -> this "Zobrazí výsledek pluginu do"
                }
                
                view -> viewSetup "Propojí se s aplikací pomocí"

                render -> plugin "Zobrazí RDF entitu pomocí"
                render -> pluginInstanceContext "Vytváří"

                viewSetup -> appState "Propojí View s"
                viewSetup -> render "Spustí zobrazování pomocí"

                appState -> setupContext "Vytváří"
                appState -> compatibilityContext "Vytváří"

            }
        }
        dataSources = softwareSystem "Datové zdroje" {
            description "Zdroj RDF dat. Může být SPARQL endpoint, vzdálený RDF soubor, nebo soubor nahraný uživatelem"
            tags "DataSources"
            rdfViewer.webApp -> this "Čerpá data z" technology "HTTP"
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
/*
        dynamic rdfViewer.webApp "RenderPlugin" {
            description "Popis postupu při zobrazení RDF dat"

            user -> rdfViewer.webApp.view "Zadá konfiguraci a spustí zobrazování"
            rdfViewer.webApp.appState -> rdfViewer.webApp.view "Uloží konfiguraci z"
            rdfViewer.webApp.render -> rdfViewer.webApp.appState "Získá konfiguraci z"
            rdfViewer.webApp.render -> rdfViewer.webApp.pluginApiContexts "Vytvoří na základě konfigurace"
            rdfViewer.webApp.render -> rdfViewer.webApp.plugin "Zašle vytvořený pluginApiContexts"
            rdfViewer.webApp.plugin -> rdfViewer.webApp.pluginApiContexts "Získá data pomocí"
            rdfViewer.webApp.pluginApiContexts -> rdfViewer.webApp.queryBuilder "Vytvoří dotaz pomocí"
            rdfViewer.webApp.pluginApiContexts -> rdfViewer.webApp.fetcher "Načte data pomocí"
            rdfViewer.webApp.fetcher -> rdfViewer.webApp.dataSource "Získá data z jednotlivých datových zdrojů"
            rdfViewer.webApp.dataSource -> dataSources "Získá data z" 
            rdfViewer.webApp.dataSource -> rdfViewer.webApp.queryProcessor "Zpracuje dotaz a získá žádaná data ze souborových datových zdrojů pomocí"
            rdfViewer.webApp.plugin -> rdfViewer.webApp.pluginApiContexts "Předá vytvořené HTML"
            rdfViewer.webApp.pluginApiContexts -> rdfViewer.webApp.view "Přidá předané HTML do View"


            autolayout lr
        }
*/
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