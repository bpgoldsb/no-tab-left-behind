const docsDomain = "docs.google.com"
const driveFileMatch =  new RegExp('/(document|presentation|spreadsheets)\/d\/([^\/]{16,}).*/')
const apps = {
    "docs": {domain: docsDomain, pathPrefix: '/document'},
    "slides": {domain: docsDomain, pathPrefix: '/presentation'},
    "sheets": {domain: docsDomain, pathPrefix: '/spreadsheets'},
}

function getGdriveFileId(url) {
    // Extract a Google Drive file ID from a url
    // returns an object containing the type of file and the file id
    // Example: {type: 'docs', id: 'f9auc90jqwr21323jih89' }
    let match = url.pathname.match(driveFileMatch)
    if (match) {
        return {type: match[1], id: match[2]}
    }
}

function openGDriveFileIds(tabs) {
    // Find all Google Drive files currently open in the browser
    // Returns a map of Google Drive File ID to browser.tabs.Tab object
    let openFileIds = {}
    tabs.forEach(tab => {
        var tabUrl
        tabUrl = new URL(tab.url)
        if (tabUrl.host == docsDomain) {
            let fileData = getGdriveFileId(tabUrl)
            let fileId = fileData.id
            if (fileId in openFileIds) {
                openFileIds[fileId].push(tab)
            } else {
                openFileIds[fileId] = [tab]
            }
        }
    })
    return openFileIds
}

function existingFileTab(fileId, currentTabId, tabs) {
    // Find the existing browser tab a file is open in, if it is open.
    // Return undefined if not open, othwewise return an integer of the tabId the file is open in.
    // If file is open in multiple tabs, pick first tab
    let openFileIds = openGDriveFileIds(tabs)
    let existingTabs = openFileIds[fileId]
    if (existingTabs === undefined) { 
        return
    } else if (existingTabs.length > 1) {
        let existingTabIds = _.map(existingTabs, 'id')
        console.log(`File ${fileId} open in multiple ${existingTabs.length} tabs: ${existingTabIds}.  Will use tab with ID ${existingTabs[0].id}`)
        // TODO should we kill multiple tabs too?  Maybe popup to user?
    }

    let existingTab = existingTabs[0]
    if (existingTab.id == currentTabId) { 
        return
    } else {
        return existingTab
    }
}

function onError(e) {
    console.error("e", e)
}


function switchWindow(navEvent, existingTab) {
    // Switch browser window
    if (navEvent.windowId != existingTab.windowId) {
        console.debug(`Existing tab's window not in focus. Switching focus from window ${existingTab.windowId} to ${navEvent.windowId}`)
        let windowUpdate = browser.windows.update(existingTab.windowId, { focused: true })
        windowUpdate.then(undefined, onError)
    }
}

function switchTab(navEvent, existingTab) {
    // Switch to a tab and close the previous
    let tabUpdate = browser.tabs.update(existingTab.id, { active: true, highlighted: true })
    tabUpdate.then(() => {
        let removing = browser.tabs.remove([navEvent.tabId])
        removing.then(undefined, onError)
    }, onError)
}

function handleDriveFileOpen(navEvent, newFileData) {
    // Determine which action to take when a new Google Drive file is opened and take that action.
    querying = browser.tabs.query({})
    querying.then((tabs) => {
        existingTab = existingFileTab(newFileData.id, navEvent.tabId, tabs)

        // New file | Same tab
        if (existingTab === undefined) {
            console.debug(`Google ${newFileData.type} ${newFileData.id} not found in existing tab or being reloaded in same tab`)
            return
        }

        // File already open
        console.info(`Google ${newFileData.type} ${newFileData.id} already open in existing tab.  Will suppress new tab creation.`)
        switchWindow(navEvent, existingTab)
        switchTab(navEvent, existingTab)
    }, reason => {
        onError(reason)
    })
}

function navHandler(navEvent) {
    // Handle a browser navagiation event
    let newUrl = new URL(navEvent.url)
    let newFileData = getGdriveFileId(newUrl)
    let newFileId = newFileData.id
    if (!newFileId) {
        console.warn(`Ignoring unrecognized file: ${newFileData.id} from url ${newUrl}`)
        return
    }

    handleDriveFileOpen(navEvent, newFileData)
}

let domains = _.map(_.values(apps), 'domain')
let domainFilters = _.map(_.values(apps), (a) => { return {hostEquals: a.domain, pathPrefix: a.pathPrefix}})

browser.webNavigation.onBeforeNavigate.addListener(navHandler, {url: domainFilters})