// 初始化发现页面
import { InitPageBase } from '../crawl/InitPageBase'
import { Colors } from '../config/Colors'
import { lang } from '../Lang'
import { Tools } from '../Tools'
import { options } from '../setting/Options'
import { store } from '../store/Store'
import { API } from '../API'
import { log } from '../Log'
import { downloadRecord } from '../download/DownloadRecord'

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
    let data = await API.getDiscoveryData()
    let allIds = data.body.recommended_work_ids || []
    log.success(`[提示] 发现页作品抓取完毕，共${allIds.length}个作品`)
    let finalIds = await downloadRecord.filterDuplicateIdList(allIds)
    log.success(
      `[提示] 发现页作品预处理完毕，去重后剩余${finalIds.length}个作品`
    )
    finalIds.forEach((id) => {
      store.idList.push({
        type: 'unknown',
        id,
      })
    })
    this.getIdListFinished()
  }
}
export { InitDiscoverPage }
