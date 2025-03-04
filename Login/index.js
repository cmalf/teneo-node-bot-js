"use strict";

/**
########################################################
#                                                      #
#   CODE  : Teneo Node Bot v1.2 (Exstension v2.0.0)    #
#   NodeJs: v23.6.1                                    #
#   Author: Furqonflynn (cmalf)                        #
#   TG    : https://t.me/furqonflynn                   #
#   GH    : https://github.com/cmalf                   #
#                                                      #
########################################################
*/
/**
 * This code is open-source and welcomes contributions! 
 * 
 * If you'd like to add features or improve this code, please follow these steps:
 * 1. Fork this repository to your own GitHub account.
 * 2. Make your changes in your forked repository.
 * 3. Submit a pull request to the original repository. 
 * 
 * This allows me to review your contributions and ensure the codebase maintains high quality. 
 * 
 * Let's work together to improve this project!
 * 
 * P.S. Remember to always respect the original author's work and avoid plagiarism. 
 * Let's build a community of ethical and collaborative developers.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { connect } = require("puppeteer-real-browser");
const clickAndWaitPlugin = require("puppeteer-extra-plugin-click-and-wait")();
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

const { config } = require('./config');
const { accountLists } = require('./accounts');

const Colors = {
  Gold: "\x1b[38;5;220m",
  Red: "\x1b[31m",
  Teal: "\x1b[38;5;51m",
  Green: "\x1b[32m",
  Neon: "\x1b[38;5;198m",
  Blue: "\x1b[34m",
  Magenta: "\x1b[95m",
  Dim: "\x1b[2m",
  RESET: "\x1b[0m"
};

const DATA_FILE = path.join(__dirname, 'DataAllAccount.js');

async function initDataAllAccountFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initialContent = `const DataAllAccount = [];\n\nmodule.exports = { DataAllAccount };\n`;
      fs.writeFileSync(DATA_FILE, initialContent, 'utf8');
      console.log(`${Colors.Neon}]> ${Colors.Green}DataAllAccount.js file created with default content.${Colors.RESET}`);
    }
  } catch (error) {
    console.error(`${Colors.Red}Error initializing wallet data file:${Colors.RESET} ${error.message}`);
    throw error;
  }
}

const maskEmail = (email) => {
  if (typeof email !== 'string') {
    throw new Error('Invalid input: email must be a string');
  }
  
  const [username, domain] = email.split('@');
  
  if (!username || !domain) {
    throw new Error('Invalid email format');
  }
  if (username.length < 4 || domain.length < 4) {
    return email;
  }

  const maskedUsername = username.slice(0, 2) + ':::' + username.slice(-2);
  const maskedDomain = domain.slice(0, 2) + ':::' + domain.slice(-2);
  return `${maskedUsername}@${maskedDomain}`;
};

function CoderMark() {
  console.log(`
╭━━━╮╱╱╱╱╱╱╱╱╱╱╱╱╱╭━━━┳╮
┃╭━━╯╱╱╱╱╱╱╱╱╱╱╱╱╱┃╭━━┫┃${Colors.Green}
┃╰━━┳╮╭┳━┳━━┳━━┳━╮┃╰━━┫┃╭╮╱╭┳━╮╭━╮
┃╭━━┫┃┃┃╭┫╭╮┃╭╮┃╭╮┫╭━━┫┃┃┃╱┃┃╭╮┫╭╮╮${Colors.Blue}
┃┃╱╱┃╰╯┃┃┃╰╯┃╰╯┃┃┃┃┃╱╱┃╰┫╰━╯┃┃┃┃┃┃┃
╰╯╱╱╰━━┻╯╰━╯┣━━┻╯╰┻╯╱╱╰━┻━╮╭┻╯╰┻╯╰╯${Colors.RESET}
╱╱╱╱╱╱╱╱╱╱╱┃┃╱╱╱╱╱╱╱╱╱╱╭━╯┃${Colors.Blue}{${Colors.Neon}cmalf${Colors.Blue}}${Colors.RESET}
╱╱╱╱╱╱╱╱╱╱╱╰╯╱╱╱╱╱╱╱╱╱╱╰━━╯
\n${Colors.RESET}Teneo Auto Login Bot ${Colors.Blue}{ ${Colors.Neon}JS${Colors.Blue} }${Colors.RESET}
    \n${Colors.Green}${'―'.repeat(50)}
    \n${Colors.Gold}[+]${Colors.RESET} DM : ${Colors.Teal}https://t.me/furqonflynn
    \n${Colors.Gold}[+]${Colors.RESET} GH : ${Colors.Teal}https://github.com/cmalf/
    \n${Colors.Green}${'―'.repeat(50)}
    \n${Colors.Gold}]-> ${Colors.Blue}{ ${Colors.RESET}TENEO Extension${Colors.Neon} v2.0.0${Colors.Blue} } ${Colors.RESET}
    \n${Colors.Gold}]-> ${Colors.Blue}{ ${Colors.RESET}Turnstile CF Bypass${Colors.Neon} Free${Colors.Blue} } ${Colors.RESET}
    \n${Colors.Gold}]-> ${Colors.Blue}{ ${Colors.RESET}BOT${Colors.Neon} v1.0.0${Colors.Blue} } ${Colors.RESET}
    \n${Colors.Green}${'―'.repeat(50)}
    `);
}

class ProxyError extends Error {
  constructor(message, proxy) {
    super(message);
    this.name = "ProxyError";
    this.proxy = proxy;
  }
}

function loadProxies() {
  try {
    const content = fs.readFileSync(config.PROXY_FILE, 'utf8');
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch (error) {
    console.error('Error loading proxies:', error.message);
    return [];
  }
}

function getRandomProxy(proxies) {
  if (!proxies.length) return null;
  return proxies[Math.floor(Math.random() * proxies.length)];
}

async function createProxyAgent(proxy) {
  if (!proxy) {
    throw new ProxyError("Proxy URL is required", proxy);
  }
  try {
    if (proxy.startsWith("http://") || proxy.startsWith("https://")) {
      return new HttpsProxyAgent(proxy);
    }
    if (proxy.startsWith("socks://") || proxy.startsWith("socks5://")) {
      return new SocksProxyAgent(proxy);
    }
    throw new ProxyError(`Unsupported proxy protocol: ${proxy}`, proxy);
  } catch (error) {
    if (error instanceof ProxyError) {
      throw error;
    }
    throw new ProxyError(`Failed to create proxy agent: ${error.message}`, proxy);
  }
}

function parseProxyURL(proxyUrl) {
  try {
    const urlObj = new URL(proxyUrl);
    const proxyConfig = {
      host: urlObj.hostname,
      port: parseInt(urlObj.port, 10)
    };
    if (urlObj.username) {
      proxyConfig.username = urlObj.username;
    }
    if (urlObj.password) {
      proxyConfig.password = urlObj.password;
    }
    return proxyConfig;
  } catch (error) {
    console.error("Failed to parse proxy URL:", error.message);
    return null;
  }
}

// Utility function to introduce delays (ms)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


async function saveAccountData(newAccountData) {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      initDataAllAccountFile();
    }
    let currentData = [];
    if (fs.existsSync(DATA_FILE)) {
      // Clear require cache to get fresh data
      delete require.cache[require.resolve(DATA_FILE)];
      const { DataAllAccount } = require(DATA_FILE);
      if (Array.isArray(DataAllAccount)) {
        currentData = DataAllAccount;
      }
    }
    if (Array.isArray(newAccountData)) {
      newAccountData.forEach(account => {
        currentData.push(account);
      });
    } else {
      currentData.push(newAccountData);
    }
    const fileContent = `const DataAllAccount = ${JSON.stringify(currentData, null, 2)};\n\nmodule.exports = { DataAllAccount };`;
    await fs.promises.writeFile(DATA_FILE, fileContent, 'utf-8');
    console.log(`${Colors.Neon}]> ${Colors.Teal}Data Token has been saved to the DataAllAccount.js file.${Colors.RESET}`);
  } catch (error) {
    console.error(`${Colors.Red}Error saving account data: ${error.message}${Colors.RESET}`);
  }
}

async function performLogin(account) {
  const proxies = loadProxies();
  const randomProxy = getRandomProxy(proxies);
  const selectedProxy = randomProxy;
  const proxyConfig = selectedProxy ? parseProxyURL(selectedProxy) : null;

  let proxyAgent;
  try {
    proxyAgent = await createProxyAgent(selectedProxy);
  } catch (error) {
    console.error("Error creating proxy agent:", error.message);
    throw error;
  }

  const instance = axios.create({
    httpAgent: proxyAgent,
    httpsAgent: proxyAgent,
    proxy: false,
    timeout: 30000
  });

  let browser, page;
  try {
    const connection = await connect({
      args: [],
      turnstile: true,
      headless: false,
      customConfig: {},
      connectOption: {
        defaultViewport: null,
      },
      proxy: proxyConfig,
      plugins: [clickAndWaitPlugin],
    });
    page = connection.page;
    browser = connection.browser;
  } catch (error) {
    console.error(`${Colors.Red}Error connecting to browser: ${error.message}${Colors.RESET}`);
    throw error;
  }

  try {
    await page.goto("https://dashboard.teneo.pro/auth", { waitUntil: "domcontentloaded" });
    
    //poll for turnstile token every 8 seconds.
    console.log(`${Colors.Neon}]> ${Colors.Gold}Waiting for Cloudflare Turnstile token...${Colors.RESET}`);
    const tokenHandle = await page.waitForFunction(() => {
      const input = document.querySelector('input[name="cf-turnstile-response"]');
      return input && input.value ? input.value : false;
    }, { polling: 8000, timeout: config.MaxCF_Solve_Wait || 300000 });
    const token = await tokenHandle.jsonValue();
    
    if (!token) {
      console.error(`${Colors.Neon}]> ${Colors.Red}Token not found on the page for account: ${Colors.Teal}${maskEmail(account.email)}${Colors.RESET}`);
      throw new Error(`${Colors.Neon}]> ${Colors.Red}Failed to retrieve turnstile token${Colors.RESET}`);
    }

    const payload = {
      email: account.email,
      password: account.password,
      turnstileToken: token
    };

    const loginResponse = await instance.post('https://auth.teneo.pro/api/login', payload, {
      headers: {
        'x-api-key': config.ApiKey,
        'Content-Type': 'application/json',
        'user-agent': config.Useragent
      },
    });
    
    const access_token = loginResponse.data && loginResponse.data.access_token;
    if (access_token) {
      console.log(`${Colors.Neon}]> ${Colors.Green}Login successful for ${Colors.Teal}${maskEmail(account.email)}${Colors.RESET}`);
      console.log(`${Colors.Neon}]> ${Colors.RESET}cf-turnstile-response token: ${Colors.Dim}${Colors.Teal}${token}${Colors.RESET}`);
      console.log(`${Colors.Neon}]> ${Colors.RESET}token-Login-response: ${Colors.Dim}${Colors.Blue}${access_token}${Colors.RESET}`);
      await saveAccountData({ email: account.email, access_token });
    } else {
      console.error(`${Colors.Neon}]> ${Colors.Red}Login failed for ${Colors.Teal}${maskEmail(account.email)}${Colors.Red} due to missing access token in response.${Colors.RESET}`);
      throw new Error(`${Colors.Neon}]> ${Colors.Red}Missing access_token in response ${Colors.RESET}`);
    }

    return { email: account.email, access_token };
  } catch (error) {
    console.error(`An error occurred during login for ${maskEmail(account.email)}:`, error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function loginWithRetry(account, maxRetries = 5) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      console.log(`${Colors.Neon}]> ${Colors.Gold}Attempt ${attempt} for account ${Colors.Teal}${maskEmail(account.email)}${Colors.RESET}`);
      const result = await performLogin(account);
      return result;
    } catch (error) {
      console.error(`${Colors.Red}Attempt ${attempt} failed for ${maskEmail(account.email)}: ${error.message}${Colors.RESET}`);
      if (attempt < maxRetries) {
        console.log(`${Colors.Neon}]> ${Colors.Gold}Retrying login for ${Colors.Teal}${maskEmail(account.email)}${Colors.RESET}`);
        await delay(5000); // delay 5 seconds before retrying
      }
    }
  }
  throw new Error(`All ${maxRetries} login attempts failed for account ${maskEmail(account.email)}`);
}

async function main() {

  initDataAllAccountFile();

  const results = [];
  for (let i = 0; i < accountLists.length; i++) {
    const account = accountLists[i];
    try {
      console.log(`${Colors.Neon}]> ${Colors.Gold}Processing account ${Colors.RESET}${i + 1}${Colors.Gold} of ${Colors.RESET}${accountLists.length}: ${Colors.Teal}${maskEmail(account.email)}${Colors.RESET}`);
      // Use retry logic when attempting login
      const result = await loginWithRetry(account, 5);
      results.push(result);
    } catch (error) {
      console.error(`Error processing account ${maskEmail(account.email)}: ${Colors.Red}${error.message}${Colors.RESET}`);
    }
    // Delay between account processing if not the last account
    if (i < accountLists.length - 1) {
      console.log(`${Colors.Neon}]> ${Colors.Gold}Waiting for ${config.Timers} seconds before processing next account...${Colors.RESET}`);
      await delay(config.Timers * 1000);
    }
  }

  // Save all successful account login data
  if (results.length > 0) {
    await saveAccountData(results);
  } else {
    console.log(`${Colors.Neon}]> ${Colors.Gold}No account data to save.`);
  }
}

console.clear();
CoderMark();
main().catch(error => {
  console.error(`${Colors.Gold}An unexpected error occurred in main(). ${Colors.Red}${error.message}${Colors.RESET}`);
  process.exit(1);
});
