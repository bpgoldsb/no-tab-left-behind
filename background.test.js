const { test, expect, beforeEach, afterEach } = require("@jest/globals");
const _ = require('./lodash')
// require("./browser-polyfill")
const background = require("./background")

const unopenedFileUrls = [
    {app: 'docs', url: "https://docs.google.com/document/d/testUnopenedDoc1/edit"},
    {app: 'slides', url: "https://docs.google.com/presentation/d/testUnopenedSlide1/edit"},
    {app: 'sheets', url: "https://docs.google.com/spreadsheets/d/testUnopenedSheet1/edit"},

]
const testTabs = [
    {id: 1, windowId: 1, url: 'thisisnotaurl'},
    {id: 2, windowId: 1,  url: 'https://www.google.com'},  // Not docs domain
    {id: 3, windowId: 1,  url: 'https://docs.google.com/assets/foo'},  // Docs domain, invalid URL
    {id: 4, windowId: 1,  url: 'https://docs.google.com/spreadsheets/d/12wBm8wsMTNdQeBafDSwZ8DPG0rs7IeCIwAxb2zaGpcM/edit'},  // Valid
    {id: 5, windowId: 1,  url: 'https://docs.google.com/presentation/d/1xGVPxSqksByjHcdN9O1t3PvXUKCl39ruWJHABA01gt4/edit'},  // Valid
    {id: 6, windowId: 1,  url: 'https://docs.google.com/document/d/1F2sgaYULlQKlMGNH0EnjM1ibdRnTeuYUrTatLqCgyz4/edit'}, // Valid
    {id: 7, windowId: 1,  url: 'https://docs.google.com/document/d/1F2sgaYULlQKlMGNH0EnjM1ibdRnTeuYUrTatLqCgyz4/edit'}, // Valid but duplicate
    {id: 8, windowId: 1,  url: 'https://docs.google.com/document/d/1i4VEAAZVgNHF7yQuivN5IXqb9eGtY_SutD4yHWeCSN4/edit'}, // Valid
    {id: 9, windowId: 1,  url: 'https://docs.google.com/document/d/1i4VEAAZVgNHF7yQuivN5IXqb9eGtY_SutD4yHWeCSN4/edit'},  // Valid but duplicate
    {id: 10, windowId: 1,  url: 'https://docs.google.com/document/d/1i4VEAAZVgNHF7yQuivN5IXqb9eGtY_SutD4yHWeCSN4/edit'}  // Valid but duplicate 2
]

beforeEach(() => {
    // Suppress console log/debug.  Re-enable if needed during debugging
    console.info = jest.fn()
    console.debug = jest.fn()
    browser.windows = jest.fn()
    browser.windows.update = jest.fn()
    browser.windows.update.mockResolvedValueOnce({})

    browser.tabs.query.mockResolvedValueOnce(testTabs)
    browser.tabs.update.mockResolvedValueOnce({})
})

afterEach(() => {
    jest.clearAllMocks()
})

describe('openGDriveFileIds', () => {
    test('Parses tab information correctly', () => {
        let r = background.openGDriveFileIds(testTabs)
        expect(_.size(r)).toEqual(4)
        expect(r['12wBm8wsMTNdQeBafDSwZ8DPG0rs7IeCIwAxb2zaGpcM'].length).toEqual(1)
        expect(r['1xGVPxSqksByjHcdN9O1t3PvXUKCl39ruWJHABA01gt4'].length).toEqual(1)  
        expect(r['1F2sgaYULlQKlMGNH0EnjM1ibdRnTeuYUrTatLqCgyz4'].length).toEqual(2)
        expect(r['1i4VEAAZVgNHF7yQuivN5IXqb9eGtY_SutD4yHWeCSN4'].length).toEqual(3)
    })
})

describe('existingFileTab', () => {
    test('File ID not open in any tab', () => {
        expect(background.existingFileTab('5823u498th2yhogjnoirtfj234890hjrf4', 100, testTabs)).toBe(null)
    })
    test('File ID open in 1 tab', () => {
        expect(background.existingFileTab('1xGVPxSqksByjHcdN9O1t3PvXUKCl39ruWJHABA01gt4', 5, testTabs)).toBe(null)
    })
    test('File open in two tabs, currentTabId is lower value', () => {
        expect(background.existingFileTab('1F2sgaYULlQKlMGNH0EnjM1ibdRnTeuYUrTatLqCgyz4', 6, testTabs).id).toEqual(7)
    })
    test('File open in two tabs, currentTabId is higher value', () => {
        expect(background.existingFileTab('1F2sgaYULlQKlMGNH0EnjM1ibdRnTeuYUrTatLqCgyz4', 7, testTabs).id).toEqual(6)
    })
    test('File open in more than 2 tabs, currentTabId is lower bound', () => {
        expect(background.existingFileTab('1i4VEAAZVgNHF7yQuivN5IXqb9eGtY_SutD4yHWeCSN4', 8, testTabs).id).toEqual(9)
    })
    test('File open in more than 2 tabs, currentTabId is not min or max', () => {
        expect(background.existingFileTab('1i4VEAAZVgNHF7yQuivN5IXqb9eGtY_SutD4yHWeCSN4', 9, testTabs).id).toEqual(8)
    })
    test('File open in more than 2 tabs, currentTabId is upper bound', () => {
        expect(background.existingFileTab('1i4VEAAZVgNHF7yQuivN5IXqb9eGtY_SutD4yHWeCSN4', 10, testTabs).id).toEqual(8)
    })

})

describe('handleDriveFileOpen', () => {
    test('closes a new tab when an existing tab is open', () => {
        let lastTab = _.last(testTabs)
        let navEvent = {tabId: lastTab.id + 10000, windowId: lastTab.windowId}
        let newFileUrl = new URL(lastTab.url)
        let newFileData = background.getGdriveFileId(newFileUrl)
    
        expect.assertions(4)
        return background.handleDriveFileOpen(navEvent, newFileData).then(data => {
            expect(browser.tabs.query).toHaveBeenCalled()
            expect(browser.tabs.update).toHaveBeenCalledWith(8, {active: true, highlighted: true})
            expect(browser.tabs.remove).toHaveBeenCalledWith([navEvent.tabId])    
            expect(browser.windows.update).toHaveBeenCalledTimes(0)
        })
    })

    _.each(unopenedFileUrls, (urlData) => {
        test(`Does not close a ${urlData.app} tab that is not already open`, () => {
            let lastTab = _.last(testTabs)
            let navEvent = {tabId: lastTab.id + 10000, windowId: lastTab.windowId}
            let newFileUrl = new URL(urlData.url)
            let newFileData = background.getGdriveFileId(newFileUrl)
            expect.assertions(2)
            return background.handleDriveFileOpen(navEvent, newFileData).then(data => {
                expect(browser.tabs.query).toHaveBeenCalled()
                expect(browser.tabs.update).toHaveBeenCalledTimes(0)
            })
        })
    })

    test("Window switching", () => {
        let lastTab = _.last(testTabs)
        let navEvent = {tabId: lastTab.id + 10000, windowId: lastTab.windowId + 1}
        let newFileUrl = new URL(lastTab.url)
        let newFileData = background.getGdriveFileId(newFileUrl)
    
        expect.assertions(4)
        return background.handleDriveFileOpen(navEvent, newFileData).then(data => {
            expect(browser.tabs.query).toHaveBeenCalled()
            expect(browser.tabs.update).toHaveBeenCalledWith(8, {active: true, highlighted: true})
            expect(browser.tabs.remove).toHaveBeenCalledWith([navEvent.tabId])    
            expect(browser.windows.update).toBeCalledWith(lastTab.windowId, {focused: true})
        })
        
    })
})
