const puppeteer = require('puppeteer')
async function IMDbNetflixMovieRecommender() {
  const browser = await puppeteer.launch({ headless: false, slowMo: 20 })
  const page = await browser.newPage()
  // customized Fisher-Yates shuffle, source of original: http://sedition.com/perl/javascript-fy.html
  function fisherYatesShuffle(array) {
    let currentIndex = array.length, // 250
      temporaryValue,
      randomIndex
    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1
      temporaryValue = array[currentIndex]
      array[currentIndex] = array[randomIndex]
      array[randomIndex] = temporaryValue
    }
    return array
  }
  // fill an array 1 - 250 and apply the Fisher-Yates shuffle on the whole
  let array250 = Array.from({ length: 250 }, (_, x) => x + 1)
  array250 = fisherYatesShuffle(array250)
  let movieNames = []
  let movieYears = []
  let numberOfRecommendations = 3
  // scrape a given number of movie titles (numberOfRecommendations) from IMDb Top 250
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US' })
  await page.goto('https://www.imdb.com/chart/top', { waitUntil: 'domcontentloaded', timeout: 0 })
  let recommendText = 'I recommend you the following ' + numberOfRecommendations + ' movies from IMDB Top 250: '
  console.log(recommendText + '\n' + '-'.repeat(recommendText.length))
  for (let i = 0; i < numberOfRecommendations; i++) {
    const iMDbTitleSelector = (await page.$$('.titleColumn'))[array250[i] - 1]
    const iMDbTitleContent = await page.evaluate(el => el.innerText, iMDbTitleSelector)
    const iMDbTitleContentClean = iMDbTitleContent.replace(
      /(\d)(\d)(\d)(\. )|(\d)(\d)(\. )|(\d)(\. )| \((\d...)\)/g,
      ''
    )
    const iMDbTitleContentYear = iMDbTitleContent
      .match(/\((\d...)\)/g)
      .toString()
      .replace(/\(|\)/g, '')
    movieNames.push(iMDbTitleContentClean)
    movieYears.push(iMDbTitleContentYear)
    console.log('#' + iMDbTitleContent)
  }
  let netflixText = '\nWatch them on Netflix: '
  console.log(netflixText + '\n' + '-'.repeat(netflixText.length))
  // use DuckDuckGo search to find if the movies are available on Netflix

  for (let i = 0; i < numberOfRecommendations; i++) {
    await page.goto('https://duckduckgo.com/?q=site%3Anetflix.com+' + movieNames[i] + '+' + movieYears[i] + '+inurl%3Atitle', { waitUntil: 'domcontentloaded', timeout: 0 })
    await page.waitForSelector('a[data-testid="result-title-a"]')

    let urlExistsOnDuckGo = await page.$('a[data-testid="result-title-a"]')
    let urlCountOnDuckGo = (await page.$$('a[data-testid="result-title-a"]')).length
    if (urlExistsOnDuckGo !== null) {
      for (let j = 0; j < urlCountOnDuckGo; j++) {
        let urlOnDuckGoSelector = (await page.$$('a[data-testid="result-title-a"]'))[j]
        let urlOnDuckGo = await page.evaluate(el => el.href, urlOnDuckGoSelector)
        urlOnDuckGo = urlOnDuckGo.replace(/(com)(.*)(?=\/title)/g, 'com')
        // expected Netflix url patterns:
        if (urlOnDuckGo.includes('https://www.netflix.com/title/')) {
          // https://www.netflix.com/hu/title/959008 <= standard
          console.log('• ' + movieNames[i] + ' on Netflix: ' + urlOnDuckGo)
          break
        } else if (urlOnDuckGo.includes('https://www.netflix.com/Movie/')) {
          // https://www.netflix.com/Movie/The_Truman_Show/11819086 <= custom
          console.log('• ' + movieNames[i] + ' on Netflix: ' + urlOnDuckGo)
          break
        } else if (urlOnDuckGo.includes('https://dvd.netflix.com/Movie/')) {
          // https://dvd.netflix.com/Movie/It-s-a-Wonderful-Life/644637 <= DVD
          console.log('• ' + movieNames[i] + ' on Netflix DVD: ' + urlOnDuckGo)
          break
        } else {
          // only prints in case of last url
          if (j + 1 === urlCountOnDuckGo) {
            console.log('• ' + movieNames[i] + ' is NOT on Netflix!')
          }
        }
      }
    } else {
      console.log('• ' + movieNames[i] + ' is NOT on Netflix!')
    }
  }
  await browser.close()
}
IMDbNetflixMovieRecommender()