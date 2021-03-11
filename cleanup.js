const cleanupDataDOMId = "cleanupData"

function onMessage(cleanupData) {
    // Receives a map of fileIds to duplicate tabs from background.js
    let totalTabs = 0
    _.each(cleanupData, (tabs, fileId) => {
        totalTabs = totalTabs + tabs.length
        let tabWindowCount = _.uniq(_.map(tabs, 'windowId')).length
        createListItem(tabs, tabWindowCount)
    })
    setupCloseButton(totalTabs)
}

function setupCloseButton(totalTabs) {
    // Setup handler and content for tab close button
    let closeTabsButton = document.getElementById("closeTabs")
    closeTabsButton.textContent = `Close ${totalTabs} Duplicate Tabs`
    closeTabsButton.addEventListener('click', () => {
        port.postMessage(true)
    })
}

function createListItem(tabs, tabWindowCount) {
    // Add information about duplicate tabs/files
    let docTitle = tabs[0].title
    let newNode = document.querySelector('.list-template').cloneNode(true);

    // Remove class reserved for template node
    newNode.classList.remove('list-template')
    // Set Title variable for .cleanUpDataTitle
    newNode.children[0].textContent = docTitle

    // Set count variable for .cleanUpDataCount
    newNode.children[1].textContent = tabs.length + 1

    // Populate window count or remove text if only in a single window
    if (tabWindowCount > 1) {
        newNode.children[2].children[0].textContent = tabWindowCount
    } else {
        newNode.children[2].remove()
    }
    
    document.getElementById(cleanupDataDOMId).appendChild(newNode)
}


let port = browser.runtime.connect({name: 'ntlb-cleanup'})
port.onMessage.addListener(onMessage)