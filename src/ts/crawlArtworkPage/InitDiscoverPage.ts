// 初始化发现页面
import { InitPageBase } from '../crawl/InitPageBase'
import { Colors } from '../config/Colors'
import { lang } from '../Lang'
import { Tools } from '../Tools'
import { options } from '../setting/Options'
import { store } from '../store/Store'
import { API } from '../API'
import { log } from '../Log'
import { filter, FilterOption } from '../filter/Filter'
import { downloadRecord } from '../download/DownloadRecord'
import {
  BookMarkNewIllustData,
  ArtworkCommonData,
  DiscoveryData,
} from '../crawl/CrawlResult'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class InitDiscoverPage extends InitPageBase {
  constructor() {
    super()
    this.init()
  }

  protected addCrawlBtns() {
    Tools.addBtn(
      'crawlBtns',
      Colors.bgBlue,
      '_抓取当前作品',
      '_抓取当前作品Title'
    ).addEventListener('click', () => {
      this.readyCrawl()
    })

    this.addStartTimedCrawlBtn(this.readyCrawl.bind(this))
    this.addCancelTimedCrawlBtn()
  }

  protected setFormOption() {
    options.hideOption([1])
  }

  protected getWantPage() {}

  protected getIdListOld() {
    // 在发现页面，直接获取页面上显示的作品，不需要获取列表页
    if (location.pathname.includes('/novel')) {
      // 小说页面
      const allWork = document.querySelectorAll(
        '.gtm-novel-work-recommend-link'
      )
      allWork.forEach((div) => {
        const a = div.querySelector('a')
        if (a) {
          const id = Tools.getNovelId(a.href)
          store.idList.push({
            type: 'novels',
            id,
          })
        }
      })
    } else {
      // 插画漫画页面
      const allLink = document.querySelectorAll(
        'div[width="184"]>a'
      ) as NodeListOf<HTMLAnchorElement>
      // 获取已有作品的 id
      allLink.forEach((a) => {
        const id = Tools.getIllustId(a.href)
        store.idList.push({
          type: 'unknown',
          id,
        })
      })
    }
    this.getIdListFinished()
  }

  protected async getIdList(): Promise<void> {
    let ids: string[] = []
    for (let p = 0; p < 5; p++) {
      let data = await API.getDiscoveryIDS()
      let newIds = data.body.recommended_work_ids || []
      ids = ids.concat(newIds)
      log.success(`[提示] 发现页正在抓取第 (${p}) 页`)
      await delay(1000)
    }
    let finalIds = await downloadRecord.filterDuplicateIdList(ids)
    log.success(
      `[提示] 发现页共${ids.length}个作品，去重后剩余${finalIds.length}个作品`
    )
    finalIds.forEach((id) => {
      store.idList.push({
        type: 'illusts',
        id,
      })
    })
    this.getIdListFinished()
  }

  protected async getIdList2() {
    let worksData: BookMarkNewIllustData[] = []

    for (let p = 0; p < 50; p++) {
      try {
        let data = await API.getDiscoveryData()
        let works = data.body.thumbnails.illust || []
        worksData = worksData.concat(works)
        log.success(
          `[提示] 发现页正在抓取作品 第(${p})页，作品数 ${worksData.length}`
        )
        await delay(500)
      } catch (error) {
        //this.getIdList()
        break
      }
    }

    // 检查数据，如果数据为空
    if (worksData.length === 0) {
      log.log(lang.transl('_列表页抓取完成'))
      return this.getIdListFinished()
    }

    // 过滤作品
    let idList = Array<ArtworkCommonData>()

    for (const data of <BookMarkNewIllustData[]>worksData) {
      if (data.isAdContainer) {
        continue
      }

      const filterOpt: FilterOption = {
        id: data.id,
        width: data.pageCount === 1 ? data.width : 0,
        height: data.pageCount === 1 ? data.height : 0,
        pageCount: data.pageCount,
        bookmarkData: data.bookmarkData,
        workType: data.illustType,
        tags: data.tags,
        userId: data.userId,
        xRestrict: data.xRestrict,
      }

      if (await filter.check(filterOpt)) {
        idList.push(data)
      }
    }

    let ids = idList.map((x) => x.id)
    let finalIds = await downloadRecord.filterDuplicateIdList(ids)
    idList = idList.filter((x) => finalIds.includes(x.id))
    log.success(
      `[提示] 发现页共${ids.length}个作品，去重后剩余${idList.length}个`
    )

    for (const data of idList) {
      store.idList.push({
        type: Tools.getWorkTypeString(data.illustType),
        id: data.id,
      })
    }

    log.log(
      lang.transl('_列表页抓取进度', this.listPageFinished.toString()),
      1,
      false
    )

    log.log(lang.transl('_列表页抓取完成'))
    this.getIdListFinished()
  }
}
export { InitDiscoverPage }
