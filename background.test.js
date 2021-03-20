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
    {id: 1, url: 'thisisnotaurl'},
    {id: 2, url: 'https://www.google.com'},  // Not docs domain
    {id: 3, url: 'https://docs.google.com/assets/foo'},  // Docs domain, invalid URL
    {id: 4, url: 'https://docs.google.com/spreadsheets/d/12wBm8wsMTNdQeBafDSwZ8DPG0rs7IeCIwAxb2zaGpcM/edit'},  // Valid
    {id: 5, url: 'https://docs.google.com/presentation/d/1xGVPxSqksByjHcdN9O1t3PvXUKCl39ruWJHABA01gt4/edit'},  // Valid
    {id: 6, url: 'https://docs.google.com/document/d/1F2sgaYULlQKlMGNH0EnjM1ibdRnTeuYUrTatLqCgyz4/edit'}, // Valid
    {id: 7, url: 'https://docs.google.com/document/d/1F2sgaYULlQKlMGNH0EnjM1ibdRnTeuYUrTatLqCgyz4/edit'}, // Valid but duplicate
    {id: 8, url: 'https://docs.google.com/document/d/1i4VEAAZVgNHF7yQuivN5IXqb9eGtY_SutD4yHWeCSN4/edit'}, // Valid
    {id: 9, url: 'https://docs.google.com/document/d/1i4VEAAZVgNHF7yQuivN5IXqb9eGtY_SutD4yHWeCSN4/edit'},  // Valid but duplicate
    {id: 10, url: 'https://docs.google.com/document/d/1i4VEAAZVgNHF7yQuivN5IXqb9eGtY_SutD4yHWeCSN4/edit'}  // Valid but duplicate 2
]

beforeEach(() => {
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
        let x = testTabs[9]
        let navEvent = {tabId: 999}
        let newFileUrl = new URL(x.url)
        let newFileData = background.getGdriveFileId(newFileUrl)
    
        expect.assertions(3)
        return background.handleDriveFileOpen(navEvent, newFileData).then(data => {
            expect(browser.tabs.query).toHaveBeenCalled()
            expect(browser.tabs.update).toHaveBeenCalledWith(8, {active: true, highlighted: true})
            expect(browser.tabs.remove).toHaveBeenCalledWith([navEvent.tabId])    
        })
    })

    _.each(unopenedFileUrls, (urlData) => {
        test(`Does not close a ${urlData.app} tab that is not already open`, () => {
            let navEvent = {tabId: 999}
            let newFileUrl = new URL(urlData.url)
            let newFileData = background.getGdriveFileId(newFileUrl)
            expect.assertions(2)
            return background.handleDriveFileOpen(navEvent, newFileData).then(data => {
                expect(browser.tabs.query).toHaveBeenCalled()
                expect(browser.tabs.update).toHaveBeenCalledTimes(0)
            })
        })
    })
})

console.log(browser.windows)