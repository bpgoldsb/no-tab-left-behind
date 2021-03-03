console.log("Singleton Activated")

const docsDomain = "docs.google.com"
const driveFileMatch =  new RegExp('/(document|presentation|spreadsheets)\/d\/([^\/]{16,}).*/')
const apps = {
    "docs": {domain: docsDomain, pathPrefix: '/document'},
    "slides": {domain: docsDomain, pathPrefix: '/presentation'},
    "sheets": {domain: docsDomain, pathPrefix: '/spreadsheets'},
}


function getGdriveFileId(url) {
    let r = url.pathname.match(driveFileMatch)
    if (r) {
        let fileId = r[2]
        return fileId
    }
}

function openGDriveFileIds(tabs) {
    // console.log("tabs: ", tabs)
    openFileIds = {} // TODO set/hash
    
    tabs.forEach(tab => {
        var tabUrl
        // console.log(tab.url)
        tabUrl = new URL(tab.url)
        // console.log(tabUrl)
        if (tabUrl.host == docsDomain) {
            // console.log("Tab is gdocs: ", tab.id, tab.url)
            let fileId = getGdriveFileId(tabUrl)
            openFileIds[fileId] = tab
        }
    })
    return openFileIds
}

function existingFileTab(fileId, currentTabId, tabs) {
    let openFileIds = openGDriveFileIds(tabs)
    let openTab = openFileIds[fileId]
    if (openTab.id) { 
        console.log(`FileID ${fileId} open in tab ${openTab.id}`)
        if (openTab.id == currentTabId) { 
            console.log(`FileID ${fileId} is being re-opened in same tab`)
        } else {
            console.log(`FileID ${fileId} is being opened in a new tab`)
            return openTab
        }
    }
}

function onError(e) {
    console.log("e", e)
}

function navHandler(navEvent) {
    console.log("New navigation: ", navEvent)
    let newUrl = new URL(navEvent.url)
    let newFileId = getGdriveFileId(newUrl)
    if (!newFileId) {
        console.log(`Ignoring unrecognized file: ${newFileId} from url ${newUrl}`)
        return
    }
    console.log(`New GSuite file "${newFileId}" being opened in tab ${navEvent.tabId}`)
    querying = browser.tabs.query({})
    querying.then((tabs) => {
        console.log("Tabs: ", tabs)
        openTab = existingFileTab(newFileId, navEvent.tabId, tabs)
        if (openTab) {
            console.log(`Switching to tab ${openTab.id}`)
            if (navEvent.windowId != openTab.windowId) {
                console.log(`Switching focus from window ${openTab.windowId} to ${navEvent.windowId}`)
                browser.windows.update(openTab.windowId, {focused: true})
            }
            let removing = browser.tabs.remove([navEvent.tabId])
            removing.then(() => { console.log(`Closed Tab ${navEvent.tabId}`)}, onError)
            
        } else { 
            console.log("Existing or New tab")
        }
    }, reason => {
        onError(reason)
    })
    
}

function buildDomains(apps) {
    let domains = []
    for ([appName, appData] of Object.entries(apps)) {
        domains.push(appData.domain)
    }
    return domains
}

function buildDomainFilters(apps) {
    let filters = []
    for ([appName, appData] of Object.entries(apps)) {
        let f = {hostEquals: appData.domain, pathPrefix: appData.pathPrefix}
        filters.push(f)
    }
    return filters
}


let domains = buildDomains(apps)
let domainFilters = buildDomainFilters(apps)
_.each(domains, (e) => { console.log(e)})

console.log(domainFilters)

browser.webNavigation.onBeforeNavigate.addListener(navHandler, {url: domainFilters})