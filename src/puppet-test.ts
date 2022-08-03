import puppeteer from 'puppeteer-core';
import path from 'path';
import OS from 'os';
import penthouse from 'penthouse';

export default async function ()
{
  const homedir = OS.homedir();
  const userDir = path.resolve(`${homedir}/Library/Application Support/Google/Chrome/Default`);

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      `--user-data-dir=${userDir}`,
      // `--profile-directory=${userDir}`,
    ],
    headless: false,
  });

  const critical = await penthouse({
    url: 'https://crazy-first-client.myshopify.com/',
    cssString: `.product-info.svelte-rlpkxj.svelte-rlpkxj {
      text-align: center;
      min-width: 8em;
    }
    h1.svelte-rlpkxj.svelte-rlpkxj,
    h2.svelte-rlpkxj.svelte-rlpkxj {
      margin: 0;
    }
    h1.svelte-rlpkxj.svelte-rlpkxj {
      font-size: 6rem;
    }
    h2.svelte-rlpkxj.svelte-rlpkxj {
      font-size: 2rem;
    }
    .param-values.svelte-rlpkxj.svelte-rlpkxj {
      font-size: 2em;
      font-family: system-ui;
      letter-spacing: -1px;
      line-height: 1em;
      margin-top: 10px;
    }
    .comparison.svelte-rlpkxj.svelte-rlpkxj {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-gap: 1em;
      padding: 1em;
    }
    .comparison-item.svelte-rlpkxj.svelte-rlpkxj {
      display: flex;
      justify-content: space-around;
    }
    .comparison-item.svelte-rlpkxj.svelte-rlpkxj:nth-child(2) {
      flex-direction: row-reverse;
    }
    .comparison-section-wrapper.svelte-rlpkxj.svelte-rlpkxj {
      width: 100%;
      position: relative;
      text-align: center;
      padding: 3em;
      font-family: "Anton", sans-serif;
    }
    .comparison-section-wrapper.svelte-rlpkxj .svelte-rlpkxj {
      font-family: inherit;
    }
    .transition-enforcement.svelte-rlpkxj .svelte-rlpkxj,
    h1.svelte-rlpkxj.svelte-rlpkxj,
    h2.svelte-rlpkxj.svelte-rlpkxj {
      position: relative;
      z-index: 2;
    }
    .backplate.svelte-rlpkxj.svelte-rlpkxj {
      position: absolute;
      width: 100%;
      height: 100%;
      display: block;
      top: 0;
      left: 0;
      z-index: 1;
    }
    .transition-enforcement.svelte-rlpkxj.svelte-rlpkxj {
      display: grid;
    }
    .transition-enforcement.svelte-rlpkxj > .svelte-rlpkxj {
      grid-column: 1/2;
      grid-row: 1/2;
    }
    @media (min-width: 768px) {
      .product-title.svelte-rlpkxj.svelte-rlpkxj {
        font-size: 14px;
        padding: 11px 20px 8px;
      }
      .product-title.svelte-rlpkxj.svelte-rlpkxj {
        text-transform: uppercase;
        font-weight: 600;
        font-family: "Gotham", sans-serif;
        border: 0;
        padding: 11px 10px 8px !important;
        background-size: 19px 7px;
        font-size: 10.5px;
      }
      select.svelte-rlpkxj.svelte-rlpkxj {
        font-size: 14px;
        padding: 11px 20px 8px;
      }
      select.svelte-rlpkxj.svelte-rlpkxj {
        text-transform: uppercase;
        font-weight: 600;
        font-family: "Gotham", sans-serif;
        border: 0;
        padding: 11px 10px 8px !important;
        background-size: 19px 7px;
        font-size: 10.5px;
      }
    }
    h1.svelte-10eoss1 {
      color: green;
    }
    `,
    puppeteer: puppeteer
  });
  
  console.log('critical', critical);
  // await browser.close();
}