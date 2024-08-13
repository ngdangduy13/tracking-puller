import puppeteer from 'puppeteer'
import { IpcHandler, IpcService } from '../decorators/ipc'
import * as fs from 'fs'
import _ from 'lodash'
import { v4 as uuidV4 } from 'uuid'
import * as proxyChain from 'proxy-chain'

interface ITrackingService {
  trackEvent(event: string, data: any): Promise<any>
}

// @IpcService('TrackingService')
class TrackingService implements ITrackingService {
  //   @IpcHandler
  async trackEvent(request: any) {
    const batch = _.chunk(request.trackingIds, 200)

    for (const items of batch) {
      const promises = _.chunk(items, 20).map((trackingIds, index) =>
        this.execute(trackingIds, index)
      )

      await Promise.all(promises)
    }

    // const promises = _.chunk(batch[0], 10).map((trackingIds, index) => {
    //   // console.log(trackingIds)
    //   this.execute(trackingIds, index)
    // })

    // await Promise.all(promises)
  }

  async execute(ids, index) {
    const proxies = [
      'http://1752mdthitmo:thitmo@171.229.87.101:21433',
      'http://1751mdthitmo:thitmo@171.229.140.79:27434',
      'http://1750mdthitmo:thitmo@171.229.101.72:27434'
    ]
    const proxyUrl = await proxyChain.anonymizeProxy(
      proxies[Math.floor(Math.random() * proxies.length)]
    )
    // const proxyUrl = proxies[Math.floor(Math.random() * proxies.length)]
    const browser = await puppeteer.launch({
      headless: false,
      // userDataDir: `chrome-profiles/test`,
      args: [
        '--start-maximized',
        `--disable-blink-features=AutomationControlled`,
        `--disable-web-security`,
        `--allow-running-insecure-content`,
        `--proxy-server=${proxyUrl}`
      ]
      // ignoreDefaultArgs: ['--enable-automation', '--enable-sync'],
      // ignoreHTTPSErrors: true
    })
    try {
      // const profilePath = await fs.getFullFilePath(`chrome-profiles/${opts.profileId}`)

      const page = await browser.newPage()
      await page.setRequestInterception(true)
      page.on('request', (request) => {
        request.continue()
      })

      page.on('console', (msg) => console.log('PAGE LOG:', msg.text()))

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36'
      )

      await page.goto(`https://t.17track.net/en#nums=${ids.join(',')}`, { timeout: 60 * 1000 })
      // await page.goto(`https://tinhte.vn/`, { timeout: 60 * 1000 })

      const nextBtn = await page.locator('.introjs-nextbutton')
      if (nextBtn) {
        await nextBtn.click()

        await page.waitForSelector('.introjs-nextbutton', { visible: true })
        await page.locator('.introjs-nextbutton').click()

        await page.waitForSelector('.introjs-nextbutton', { visible: true })
        await page.locator('.introjs-nextbutton').click()

        await page.waitForSelector('.introjs-nextbutton', { visible: true })
        await page.locator('.introjs-nextbutton').click()
      }

      const response = await page.waitForResponse(
        (response) => response.url().includes('https://t.17track.net/track/restapi'),
        { timeout: 10_000 }
      )
      const data = await response.json()

      fs.writeFileSync(`responses/${uuidV4()}.json`, Buffer.from(JSON.stringify(data)))
      console.log('done')
    } catch (e) {
      console.log(e)
    } finally {
      await browser.close()
      await proxyChain.closeAnonymizedProxy(proxyUrl, true)
    }
  }
}

export const trackingService = new TrackingService()
