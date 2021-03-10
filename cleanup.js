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
    // let liNode = document.createElement("LI")
    let docTitle = tabs[0].title
    // let item = createLineItemText(docTitle, tabs, tabWindowCount)
    // liNode.appendChild(item)


    let newNode = document.querySelector('.list-template').cloneNode(true);

    // Remove class reserved for template node
    newNode.classList.remove('list-template')
    // Set Title variable for .cleanUpDataTitle
    newNode.children[0].textContent = docTitle

    // Set count variable for .cleanUpDataCount
    newNode.children[1].textContent = tabs.length + 1
    document.getElementById(cleanupDataDOMId).appendChild(newNode)
}

function createLineItemText(docTitle, tabs, tabWindowCount) {
    // Create the text node that contains the information about 1 closeable group of tabs
    let textParts = []
    let listItem = document.createElement('p')
    textParts.push(document.createTextNode("Google Drive file "))
    let listItemPart2 = document.createElement("u")
    let listItemPart2a = document.createElement("b")
    let listItemPart2b = document.createTextNode(docTitle)
    listItemPart2.appendChild(listItemPart2a)
    listItemPart2a.appendChild(listItemPart2b)
    textParts.push(listItemPart2)
    textParts.push(document.createTextNode(` is open in ${tabs.length + 1} tabs`))

    if (tabWindowCount > 1) {
        textParts.push(document.createTextNode(` (across ${tabWindowCount} browser windows)`))
    }
    _.map(textParts, (p) => { listItem.appendChild(p) })

    return listItem
}

let port = browser.runtime.connect({name: 'ntlb-cleanup'})
port.onMessage.addListener(onMessage)