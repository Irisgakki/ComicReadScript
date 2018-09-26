// ==UserScript==
// @name      DMZJ Script
// @version     1.4
// @author      hymbz
// @description 动漫之家脚本——双页阅读、体验优化、可看被封漫画
// @namespace   DMZJScript
// @match       *://*.dmzj.com/*
// @grant       GM_xmlhttpRequest
// @grant       GM_deleteValue
// @grant       GM_listValues
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_getResourceURL
// @grant       GM_registerMenuCommand
// @resource    css https://userstyles.org/styles/chrome/119945.json
// @run-at      document-end
// @require     https://cdn.jsdelivr.net/npm/vue
// @require     https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/1.3.8/FileSaver.min.js
// @require     https://greasyfork.org/scripts/371295-comicread/code/ComicRead.js
// @supportURL  https://github.com/hymbz/ComicReadScript/issues
// @updateURL   https://github.com/hymbz/ComicReadScript/raw/master/DMZJScript/DMZJScript.user.js
// @downloadURL https://github.com/hymbz/ComicReadScript/raw/master/DMZJScript/DMZJScript.user.js
// ==/UserScript==
/* global GM_xmlhttpRequest, GM_getResourceText, GM_addStyle, GM_info, appendDom, getTop, comicReadWindow, ScriptMenu, qiehuan, huPoint, g_comic_name, g_chapter_name, g_comic_id, g_comic_url */

GM_addStyle(':root {--color1: #05a7ca;--color2: #f8fcff;--color3: #ffffff;--color4: #aea5a5;}');

ScriptMenu.load({
  '漫画阅读': {
    'Enable': true,
    '双页显示': true,
    '页面填充': true,
    '点击翻页': false,
    '阅读进度': true,
    '夜间模式': true
  },
  '体验优化': {
    'Enable': true,
    '在新页面中打开链接': true
  },
  'Version': GM_info.script.version
});

const type = /(?<=\/\/).+?\./.exec(document.URL)[0];
if (type === 'manhua.') {
  if (document.title === '页面找不到') {
    let urlInfo = document.URL.split('/');
    GM_xmlhttpRequest({
      method: 'GET',
      url: `https://manhua.dmzj.com/${urlInfo[3]}`,
      onload: function (xhr) {
        if (xhr.status === 200) {
          self.location.href = `https://m.dmzj.com/view/${RegExp('(?<=g_current_id = ")\\d+').exec(xhr.responseText)[0]}/${urlInfo[4].split('.')[0]}.html`;
        }
      }
    });
  } else {
    $(document).unbind();

    // 判断当前页是漫画页
    if (typeof g_chapter_name !== 'undefined') {
      GM_addStyle(`${JSON.parse(GM_getResourceText('css')).sections[0].code}@@DMZJScriptRaw.css@@`);
      document.getElementsByTagName('body')[0].className = ScriptMenu.UserSetting['漫画阅读']['夜间模式'] ? '' : 'day';

      // 切换至上下翻页阅读
      if ($.cookie('display_mode') === '0')
        qiehuan();

      let List = document.querySelectorAll('.inner_img img');
      let i = List.length;
      while (i--)
        if (List[i].getAttribute('data-original')) {
          List[i].setAttribute('data-original', `${document.location.protocol}${List[i].getAttribute('data-original')}`);
          List[i].setAttribute('src', `${document.location.protocol}${List[i].getAttribute('data-original')}`);
        }

      let tempDom = document.querySelector('.btns a:last-of-type');
      tempDom.innerHTML = '阅读模式';
      tempDom.setAttribute('href', 'javascript:;');
      tempDom.addEventListener('click', function () {
        if (!comicReadWindow.$el) {
          let checkImgLoad = function () {
            let i = List.length;
            while (i--)
              if (List[i].getAttribute('src') === 'https://static.dmzj.com/ocomic/images/mh-last/lazyload.gif')
                return false;
            return true;
          };
          if (checkImgLoad() || confirm('可能还有图片正在加载，请确认所有图片均已加载完毕')) {
            comicReadWindow.load({
              'comicImgList': List,
              'readSetting': ScriptMenu.UserSetting['漫画阅读'],
              'EndExit': function () {
                huPoint();
                scrollTo(0, getTop(document.getElementById('hd')));
              },
              'comicName': `${g_comic_name} ${g_chapter_name}`,
              'nextChapter': document.getElementById('next_chapter') ? document.getElementById('next_chapter').href : null,
              'prevChapter': document.getElementById('prev_chapter') ? document.getElementById('prev_chapter').href : null
            });
          } else
            return;
        }
        comicReadWindow.start();
      });
    } else {
      GM_addStyle('#floatCode,.toppic_content+div:not(.wrap),#type_comics+a,icorss_acg{display: none !important;}.cartoon_online_border>img{transform: rotate(180deg);}');

      // 判断当前页是漫画详情页
      if (typeof g_comic_name !== 'undefined') {
        // 判断漫画被禁
        if (document.querySelector('.cartoon_online_border>img')) {
          [...document.querySelectorAll('.odd_anim_title ~ div')].forEach(e => e.parentNode.removeChild(e));

          GM_xmlhttpRequest({
            method: 'GET',
            url: `http://v2api.dmzj.com/comic/${g_comic_id}.json`,
            onload: function (xhr) {
              if (xhr.status === 200) {
                let temp = '';
                let Info = JSON.parse(xhr.responseText);
                let List = Info.chapters;
                for (let i = 0; i < List.length; i++) {
                  temp += `<div class="photo_part"><div class="h2_title2"><span class="h2_icon h2_icon22"></span><h2>${Info.title}：${List[i].title}</h2></div></div><div class="cartoon_online_border" style="border-top: 1px dashed #0187c5;"><ul>`;
                  let chaptersList = List[i].data;
                  for (let i = 0; i < chaptersList.length; i++)
                    temp += `<li><a target="_blank" title="${chaptersList[i].chapter_title}" href="https://manhua.dmzj.com/${g_comic_url}${chaptersList[i].chapter_id}.shtml">${chaptersList[i].chapter_title}</a></li>`;
                  temp += '</ul><div class="clearfix"></div></div>';
                }
                appendDom(document.getElementsByClassName('middleright_mr')[0], temp);
              }
            }
          });
        } else {
          if (ScriptMenu.UserSetting['体验优化']['在新页面中打开链接'])
            [...document.getElementsByTagName('a')].forEach(e => e.setAttribute('target', '_blank'));
        }
      }
    }
  }
} else if (type === 'm.') {
  if (document.getElementsByTagName('body')[0].innerText === '漫画内容不存在') {
    GM_addStyle('img {display:none;}#comicRead{left: 0;position: absolute !important;}#comicRead img{visibility: visible;}');
    document.getElementsByTagName('body')[0].innerText = '正在加载中，请坐和放宽，若长时间无反应请刷新页面';
    let num;
    GM_xmlhttpRequest({
      method: 'GET',
      url: `http://v2api.dmzj.com/chapter/${RegExp('\\d+/\\d+').exec(document.URL)[0]}.json`,
      onload: function (xhr) {
        if (xhr.status === 200) {
          let Info = JSON.parse(xhr.responseText);
          num = Info.picnum;
          document.title = Info.title;
          let loadImg = function (index) {
            let i = index;
            GM_xmlhttpRequest({
              method: 'GET',
              url: Info.page_url[i],
              headers: {
                'Referer': 'http://images.dmzj.com/'
              },
              responseType: 'blob',
              onload: function (xhr) {
                if (xhr.status === 200) {
                  let temp = document.createElement('img');
                  temp.src = URL.createObjectURL(xhr.response);
                  temp.setAttribute('order', i);
                  appendDom(document.getElementsByTagName('body')[0], temp);
                  if (document.getElementsByTagName('img').length === num) {
                    comicReadWindow.load({
                      'comicImgList': [...document.getElementsByTagName('img')].sort((a, b) => a.getAttribute('order') - b.getAttribute('order')),
                      'readSetting': ScriptMenu.UserSetting['漫画阅读'],
                      'EndExit': false,
                      'comicName': document.title
                    });
                    let start = function () {
                      if (comicReadWindow.comicImgList.every(e => e.complete))
                        comicReadWindow.start();
                      else
                        setTimeout(start, 100);
                    };
                    setTimeout(start, 100);
                  }
                } else
                  loadImg(i);
              }
            });
          };
          for (let index = 0; index < Info.picnum; index++)
            loadImg(index);
        }
      }
    });
  }
}
