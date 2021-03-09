const docsDomain = "docs.google.com"
const driveFileMatch =  new RegExp('/(document|presentation|spreadsheets)\/d\/([^\/]{16,}).*/')
const apps = {
    "docs": {domain: docsDomain, pathPrefix: '/document'},
    "slides": {domain: docsDomain, pathPrefix: '/presentation'},
    "sheets": {domain: docsDomain, pathPrefix: '/spreadsheets'},
}
let cleanupPort
let installTabId

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
        let tabUrl = new URL(tab.url)
        if (tabUrl.host === docsDomain) {
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
        console.debug(`File ${fileId} open in multiple ${existingTabs.length} tabs: ${existingTabIds}.  Will use tab with ID ${existingTabs[0].id}`)
    }

    return existingTab[0].id === currentTabId ? null : existingTabs[0]
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

function cleanableFileTabs() {
    // Find duplicate tabs and close the newest tabs
    // Returns a promise which returns a map of fileId to an array of tabs.Tab objects, which exclude the oldest tab
    let tabsQuery = browser.tabs.query({})
    return tabsQuery.then((tabs) => {
        let cleanableFiles = {}
        let openFiles = openGDriveFileIds(tabs)
        
        _.map(openFiles, (tabs, fileId) => {
            if (tabs.length <= 1) {
                return
            }

            let sortedTabs = _.sortBy(tabs, ['lastAccessed', 'id'])
            cleanableFiles[fileId] = _.slice(sortedTabs, 1)
        })
        return cleanableFiles
    }, onError)

}

function ntsbInstallHook(info) {
    // On extension installation, determine if the user already has duplicate tabs open and ask them if they want to close them
    cleanableFileTabs().then((fileTabs) => {
        if (_.size(fileTabs) > 0) {
            let cleanupCreate = browser.tabs.create({active: true, url: '/cleanup.html'})    
            cleanupCreate.then((tab) => {
                installTabId = tab.id
            })
        } else { 
            console.debug("NTSB Installation Hook: No cleanable files/tabs")
        }
    }, onError)    
}

function cleanupConnected(p) {
    // Handle extension messaging from install page
    cleanupPort = p
    cleanupPort.onMessage.addListener(cleanupMessage)
    cleanableFileTabs().then((fileTabs) => {
        cleanupPort.postMessage(fileTabs)    
    })
}

function cleanupMessage(doCleanup) {
    // Check the message from the install page and clean up duplicate tabs
    if (doCleanup === true) {
        cleanableFileTabs().then((fileTabs) => {
            // Build a flat list of tabs to close
            let targetTabs = []
            _.each(fileTabs, (tabs) => {
                let tabIds = _.map(tabs, 'id')
                targetTabs = _.concat(targetTabs, tabIds)
            })

            // Close the tabs
            let tabRemove = browser.tabs.remove(targetTabs)
            tabRemove.then(undefined, onError)
        }, onError)
    }

}

function chromiumThemeHandler(message) {
    if (message.scheme == "dark") {
        browser.browserAction.setIcon({
            "path": {
                "16": "icons/browser-logo-light.svg",
                "32": "icons/browser-logo-light.svg",
                "64": "icons/browser-logo-light.svg",
                "128": "icons/browser-logo-light.svg"
            }
        })
    } else {
        browser.browserAction.setIcon({
            "path": {
                "16": "icons/browser-logo-dark.svg",
                "32": "icons/browser-logo-dark.svg",
                "64": "icons/browser-logo-dark.svg",
                "128": "icons/browser-logo-dark.svg"
            }
        })
    }
    console.log("Message!", message)
}

function main() {
    let domainFilters = _.map(_.values(apps), (a) => { return {hostEquals: a.domain, pathPrefix: a.pathPrefix}})

    browser.runtime.onInstalled.addListener(ntsbInstallHook)
    browser.runtime.onConnect.addListener(cleanupConnected)
    browser.runtime.onMessage.addListener(cleanupMessage)
    browser.runtime.onMessage.addListener(chromiumThemeHandler)
    browser.webNavigation.onBeforeNavigate.addListener(navHandler, {url: domainFilters})

}

main()