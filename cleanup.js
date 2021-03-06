const cleanupDataDOMId = "cleanupData"

function onMessage(cleanupData) {
    // Receives a map of fileIds to duplicate tabs from background.js
    let totalTabs = 0
    _.each(cleanupData, (tabs, fileId) => {
        totalTabs = totalTabs + tabs.length
        let tabWindowCount = _.uniq(_.map(tabs, 'windowId')).length
        createListItem(fileId, tabs, tabWindowCount)
    })
    setupCloseButton(totalTabs)
}

function setupCloseButton(totalTabs) {
    // Setup handler and content for tab close button
    let closeTabsButton = document.getElementById("closeTabs")
    closeTabsButton.innerHTML = `Close ${totalTabs} Duplicate Tabs`
    closeTabsButton.addEventListener('click', () => {
        port.postMessage(true)
    })
}

function createListItem(fileId, tabs, tabWindowCount) {
    // Add information about duplicate tabs/files
    let liNode = document.createElement("LI")
    itemText = `Google Drive file ${fileId} is open in ${tabs.length + 1} tabs`
    if (tabWindowCount > 1) {
        itemText += ` (across ${tabWindowCount} browser windows)`
    }
    let textNode = document.createTextNode(itemText)
    liNode.appendChild(textNode)
    document.getElementById(cleanupDataDOMId).appendChild(liNode)
    
}

let port = browser.runtime.connect({name: 'ntlb-cleanup'})
port.onMessage.addListener(onMessage)
