/**
########################################################
#                                                      #
#   CODE  : Teneo Node Bot v1.1 (Exstension v2.0.0)    #
#   NodeJs: v22.9.0                                    #
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
const pino = require('pino');
const pretty = require('pino-pretty');
const fs = require('fs').promises;
const path = require('path');
const WebSocket = require('ws');
const axios = require('axios');
const {
    DateTime
} = require('luxon');
const {
    HttpsProxyAgent
} = require('https-proxy-agent');
const {
    SocksProxyAgent
} = require('socks-proxy-agent');
const readline = require('readline');
const {
    accountLists
} = require('./accounts.js');

const cl = {
    bl: '\x1b[38;5;27m',
    gl: '\x1b[38;5;46m',
    gr: '\x1b[32m',
    gb: '\x1b[4m',
    br: '\x1b[34m',
    st: '\x1b[9m',
    yl: '\x1b[33m',
    am: '\x1b[38;5;198m',
    rd: '\x1b[31m',
    ug: '\x1b[38;5;165m',
    rt: '\x1b[0m'
};

class TeneoBot {
    constructor() {
        this.wita = 'Asia/Makassar'; // "Adjust for Your Time Zone (e.g., 'Asia/Makassar' in Bali, Indonesia)"
        this.apiKey = 'OwAG3kib1ivOJG4Y0OCZ8lJETa6ypvsDtGmdhcjA';
        this.loginUrl = 'https://auth.teneo.pro/api/login';
        this.userUrl = 'https://auth.teneo.pro/api/user';
        this.websocketUrl = 'secure.ws.teneo.pro';
        this.activeConnections = new Map();
        this.CoderMarkPrinted = false;
        this.proxyBackupList = [];
        this.maxProxyRetries = 3;
        this.version = 'v0.2';

        this.logger = pino(pretty({
            colorize: true,
            translateTime: `SYS:${DateTime.now().setZone(this.wita).toFormat('MM/dd/yyyy HH:mm:ss Z')}`,
            ignore: 'pid,hostname'
        }));

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        TeneoBot.prototype.runWithCurrentSession = async () => {
            console.clear();
            this.CoderMark();
            this.log(`${cl.am}]> ${cl.yl}Proxy Connection Mode Enabled!\n\n${cl.yl}]-> ${cl.am}Run All Accounts Using Current Session! ${cl.rt}\n`);
            try {
                const dataPath = path.join(__dirname, 'DataAllAccount.js');
                const {
                    DataAllAccount
                } = require(dataPath);
                const proxies = await this.validateAccountsAndProxies();

                if (!DataAllAccount || !Array.isArray(DataAllAccount)) {
                    this.log(`${cl.am}]> ${cl.rd}No saved session data found or invalid format`);
                    return;
                }

                for (let i = 0; i < DataAllAccount.length; i++) {
                    const accountData = DataAllAccount[i];
                    const proxy = proxies[i].trim();
                    const account = accountLists.find(acc => acc.email === accountData.email);

                    if (!account) {
                        this.log(`${cl.am}]> ${cl.bl}Account ${cl.rt}${this.hideEmail(accountData.email)} ${cl.rd}not found in account list`, 'error');
                        continue;
                    }

                    try {
                        const proxyIP = await this.getProxyIP(proxy);
                        this.log(
                            `${cl.am}]> ${cl.bl}Account ${cl.rt}${this.hideEmail(accountData.email)} ${cl.yl}Connecting..` +
                            `${cl.rt} With ProxyIP ${cl.bl}${proxyIP}`
                        );

                        const ws = await this.setupWebSocket(account, accountData.access_token, proxy);
                        this.activeConnections.set(accountData.email, ws);

                    } catch (error) {
                        this.log(`${cl.am}]> ${cl.rd}Error reconnecting account ${cl.rt}${this.hideEmail(accountData.email)}: ${cl.am}${error.message}`, 'error');
                    }
                }
            } catch (error) {
                this.log(`${cl.am}]> ${cl.rd}Error loading saved session data: ${error.message}`, 'error');
                process.exit(1);
            }
        };

        TeneoBot.prototype.cleanupWebSocket = function(email) {
            if (this.activeConnections.has(email)) {
                const ws = this.activeConnections.get(email);
                ws.close();
                this.activeConnections.delete(email);
                this.log(`${cl.am}]> ${cl.rd}WebSocket connection closed for ${cl.rt}${this.hideEmail(email)}`, 'info');
            }
        };

        TeneoBot.prototype.logError = function(error, context) {
            this.log(`${cl.am}]> ${cl.rd}Error occurred: ${error.message} in ${context}`, 'error');
        };

        process.on('SIGINT', () => {
            console.log(`${cl.am}]> ${cl.rd}Exiting program with Blessing...`, 'error');
            process.exit(0);
        });
        process.on('unhandledRejection', (reason, promise) => {
            console.log(`${cl.am}]> ${cl.red}Unhandled Rejection at:${cl.rt}`, promise, `${cl.red}reason:${cl.rt}`, reason);
        });

        process.on('uncaughtException', (error) => {
            console.log(`${cl.am}]> ${cl.red}Uncaught Exception:${cl.rt}`, error);
            process.exit(1);
        });
    }

    log(message, level = 'info', meta = {}) {
        this.logger[level]({
            ...meta,
            msg: message
        });
    }

    CoderMark() {
        if (!this.CoderMarkPrinted) {
            console.log(`
╭━━━╮╱╱╱╱╱╱╱╱╱╱╱╱╱╭━━━┳╮
┃╭━━╯╱╱╱╱╱╱╱╱╱╱╱╱╱┃╭━━┫┃${cl.gr}
┃╰━━┳╮╭┳━┳━━┳━━┳━╮┃╰━━┫┃╭╮╱╭┳━╮╭━╮
┃╭━━┫┃┃┃╭┫╭╮┃╭╮┃╭╮┫╭━━┫┃┃┃╱┃┃╭╮┫╭╮╮${cl.br}
┃┃╱╱┃╰╯┃┃┃╰╯┃╰╯┃┃┃┃┃╱╱┃╰┫╰━╯┃┃┃┃┃┃┃
╰╯╱╱╰━━┻╯╰━╮┣━━┻╯╰┻╯╱╱╰━┻━╮╭┻╯╰┻╯╰╯${cl.rt}
╱╱╱╱╱╱╱╱╱╱╱┃┃╱╱╱╱╱╱╱╱╱╱╱╭━╯┃${cl.am}{${cl.rt}cmalf${cl.am}}${cl.rt}
╱╱╱╱╱╱╱╱╱╱╱╰╯╱╱╱╱╱╱╱╱╱╱╱╰━━╯
\n${cl.rt}${cl.gb} Teneo Node Bot ${cl.gl}JS ${cl.bl}v1.1 ${cl.rt}
    \n${cl.gr}--------------------------------------
    \n${cl.yl}[+]${cl.rt} DM : ${cl.bl}https://t.me/furqonflynn
    \n${cl.yl}[+]${cl.rt} GH : ${cl.bl}https://github.com/cmalf/
    \n${cl.gr}--------------------------------------
    \n${cl.yl}]-> ${cl.am}{ ${cl.rt}Teneo Extension${cl.bl} v2.0.0${cl.am} } ${cl.rt}
    \n${cl.gr}--------------------------------------${cl.rt}
            `);
            this.CoderMarkPrinted = false;
        }
    }

    hideEmail(email) {
        if (!email || !email.includes('@')) {
            return email;
        }

        const [local, domain] = email.split('@');
        const domainParts = domain.split('.');
        const tld = domainParts[domainParts.length - 1];
        const hideDomain = '*'.repeat(domain.length - tld.length - 1) + '.' + tld;
        const hideLocal = local.slice(0, 3) + '*'.repeat(Math.max(local.length - 6, 3)) + local.slice(-3);

        return `${hideLocal}@${hideDomain}`;
    }

    async getProxyAgent(proxy) {
        if (!proxy) {
            return undefined;
        }

        if (proxy.startsWith('http://') || proxy.startsWith('https://')) {
            return new HttpsProxyAgent(proxy);
        } else if (proxy.startsWith('socks://') || proxy.startsWith('socks5://')) {
            return new SocksProxyAgent(proxy);
        }

        throw new Error(`${cl.am}]> ${cl.rd}Unsupported proxy protocol: ${proxy}`);
    }

    async getProxyIP(proxy) {
        const agent = await this.getProxyAgent(proxy);
        try {
            const response = await axios.get('https://ipinfo.io/json', {
                httpsAgent: agent,
                timeout: 10000
            });
            const Ipinfo = response.data.ip;
            return Ipinfo.replace(/(\d+\.\d+\.\d+)\.(\d+)/, '$1.***');
        } catch (error) {
            this.log(`${cl.am}]> ${cl.rd}Error getting proxy IP: ${error.message}`, 'error');
            return null;
        }
    }

    async validateAccountsAndProxies() {
        const proxyFilePath = path.join(__dirname, 'proxy.txt');

        try {
            const proxyContent = await fs.readFile(proxyFilePath, 'utf-8');
            const proxies = proxyContent.split('\n').filter(Boolean);

            if (accountLists.length !== proxies.length) {
                this.log(`${cl.rt}---------------------------------------------------`);
                this.log(`${cl.am}]> ${cl.rt}Mismatch: ${cl.rt}${accountLists.length} ${cl.br}accounts ${cl.rt}but ${cl.br}${proxies.length} proxies. ${cl.rd}Exiting...`, 'error');
                this.log(`${cl.rt}---------------------------------------------------\n`);
                process.exit(1);
            }
            this.log(`${cl.rt}---------------------------------------------------`);
            this.log(`${cl.am}]> ${cl.rt}Validation ${cl.gl}successful${cl.rt}: ${accountLists.length} ${cl.br}accounts ${cl.rt}and ${proxies.length} ${cl.br}proxies.`);
            this.log(`${cl.rt}---------------------------------------------------\n`);
            return proxies;
        } catch (error) {
            this.log(`${cl.am}]> ${cl.rd} Error reading proxy file: ${error.message}`, 'error');
            process.exit(1);
        }
    }

    async login(account, proxy, retries = 3) {
        const agent = await this.getProxyAgent(proxy);

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const loginResponse = await axios.post(this.loginUrl, {
                    email: account.email,
                    password: account.password
                }, {
                    headers: {
                        'x-api-key': this.apiKey
                    },
                    httpsAgent: agent,
                    timeout: 30000
                });

                const access_token = loginResponse.data.access_token;

                const userResponse = await axios.get(this.userUrl, {
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'x-api-key': this.apiKey
                    },
                    httpsAgent: agent
                });

                const userId = userResponse.data.id;
                const proxyIP = await this.getProxyIP(proxy);

                return {
                    access_token,
                    userId,
                    proxyIP
                };
            } catch (error) {
                if (attempt === retries) {
                    throw error;
                }
                this.log(`${cl.am}]> ${cl.yl} Retry attempt ${attempt} ${cl.rt}for ${this.hideEmail(account.email)}`, 'warn');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    async loadProxyBackups() {
        try {
            const backupContent = await fs.readFile(path.join(__dirname, 'proxybackup.txt'), 'utf-8');
            this.proxyBackupList = backupContent.split('\n').filter(Boolean).map(proxy => proxy.trim());
            this.log(`${cl.am}]> ${cl.yl}Loaded ${cl.rt}${this.proxyBackupList.length} backup proxies`);
        } catch (error) {
            this.log(`${cl.am}]> ${cl.rd}Failed to load proxy backups: ${error.message}`, 'error');
            this.proxyBackupList = [];
        }
    }

    getNextBackupProxy() {
        return this.proxyBackupList.length > 0 ? this.proxyBackupList.shift() : null;
    }

    async reconnectWebSocket(account, access_token, proxy, ws) {
        const maxRetries = 5;
        const baseDelay = 15000; // 15 seconds base delay
        const maxDelay = 300000; // 5 minutes maximum delay
        let retryCount = 0;
        let currentProxy = proxy;

        const cleanup = () => {
            if (ws) {
                try {
                    clearInterval(ws.pingInterval);
                    ws.removeAllListeners();
                    ws.terminate();
                } catch (err) {
                    this.log(`${cl.am}]> ${cl.rd}Cleanup error: ${err.message}`, 'error');
                }
            }
        };

        const calculateDelay = (attempt) => {
            // Exponential backoff with jitter
            const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
            return exponentialDelay + jitter;
        };

        const reconnect = async () => {
            try {
                cleanup();

                if (retryCount >= maxRetries) {
                    const backupProxy = this.getNextBackupProxy();
                    if (backupProxy) {
                        this.log(`${cl.am}]> ${cl.yl}Switching to backup proxy ${cl.rt}for ${this.hideEmail(account.email)}`, 'warn');
                        currentProxy = backupProxy;
                        retryCount = 0;
                    } else {
                        throw new Error(`${cl.am}]> ${cl.rd}No more backup proxies available`);
                    }
                }

                this.log(`${cl.am}]> ${cl.yl}Attempting reconnection ${cl.rt}for ${this.hideEmail(account.email)} (attempt ${retryCount + 1})`);

                const newWs = await this.setupWebSocket(account, access_token, currentProxy);

                // Ensure old connection is removed before setting new one
                this.activeConnections.delete(account.email);
                this.activeConnections.set(account.email, newWs);

                retryCount = 0;
                return newWs;
            } catch (error) {
                retryCount++;
                this.log(`${cl.am}]> ${cl.rd}Reconnection failed ${cl.rt}for ${this.hideEmail(account.email)}: ${cl.rd}${error.message}`, 'error');

                if (retryCount < maxRetries || this.proxyBackupList.length > 0) {
                    const delay = calculateDelay(retryCount);
                    this.log(`${cl.am}]> ${cl.yl}Waiting ${delay/1000} seconds before next retry`, 'warn');

                    await new Promise((resolve, reject) => {
                        const timeoutId = setTimeout(() => {
                            clearTimeout(timeoutId);
                            resolve();
                        }, delay);
                    });

                    return reconnect();
                }
                throw error;
            }
        };

        return reconnect();
    }

    async setupWebSocket(account, access_token, proxy) {
        const userAgents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Edge/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Edge/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Edge/120.0.0.0",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.3",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/114.0.0.",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.3",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.3",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 AtContent/95.5.5462.5",
        ];
    
        const wsUrl = `wss://${this.websocketUrl}/websocket?accessToken=${encodeURIComponent(access_token)}&version=${encodeURIComponent(this.version)}`;
        const agent = await this.getProxyAgent(proxy);
        
        const wsOptions = {
            agent,
            headers: {
                'Origin': 'chrome-extension://emcclcoaglgcpoognfiggmhnhgabppkm',
                'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
                'Upgrade': 'websocket',
                'Connection': 'Upgrade',
                'Sec-WebSocket-Version': '13',
                'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits'
            },
            handshakeTimeout: 30000,
            maxPayload: 1024 * 1024,
            followRedirects: true,
            perMessageDeflate: {
                clientNoContextTakeover: true,
                serverNoContextTakeover: true,
                clientMaxWindowBits: 10,
                concurrencyLimit: 10
            }
        };

        const ws = new WebSocket(wsUrl, wsOptions);

        // Set up a connection timeout
        const connectionTimeout = setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
                ws.terminate();
                throw new Error('WebSocket connection timeout');
            }
        }, wsOptions.handshakeTimeout);

        ws.on('open', () => {
            clearTimeout(connectionTimeout);
            this.log(`${cl.am}]> ${cl.gl}WebSocket connected ${cl.rt}for ${this.hideEmail(account.email)}`);

            ws.pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "PING"
                    }));
                }
            }, 10000);
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                const email = this.hideEmail(account.email);
                const baseLogStr = `${cl.am}]> ${cl.rt}${email}`;
                const pointsStr = `${cl.am}${message.pointsToday} ${cl.rt}points today, ${cl.am}${message.pointsTotal} ${cl.rt}total points`;

                switch (message.message) {
                    case "Connected successfully":
                        this.log(`${baseLogStr} ${cl.gl}- Connected: ${pointsStr}`);
                        break;
                        
                    case "Pulse from server":
                        const heartbeatsStr = message.heartbeats ? `, ${cl.am}${message.heartbeats} ${cl.rt}heartbeats` : '';
                        this.log(`${baseLogStr} ${cl.bl}- Pulse: ${pointsStr}${heartbeatsStr}`);
                        break;

                    default:
                        // Optional: Log unknown message types for debugging
                        this.log(`${baseLogStr} - Received message: ${JSON.stringify(message)}`);
                }
            } catch (error) {
                this.log(`${cl.am}]> ${cl.rd}Error parsing message ${cl.rt}for ${this.hideEmail(account.email)}: ${cl.rd}${error.message}`, 'error');
            }
        });

        ws.on('error', async (error) => {
            this.log(`${cl.am}]> ${cl.rd}WebSocket error ${cl.rt}for ${this.hideEmail(account.email)}: ${cl.rd}${error.message}`, 'error');
            await this.handleWebSocketError(account, access_token, proxy, ws);
        });

        ws.on('close', async () => {
            this.log(`${cl.am}]> ${cl.rd}WebSocket closed ${cl.rt}for ${this.hideEmail(account.email)}`, 'warn');
            await this.handleWebSocketError(account, access_token, proxy, ws);
        });

        return ws;
    }

    async handleWebSocketError(account, access_token, proxy, ws) {
        this.cleanupWebSocket(account.email);
        try {
            const newWs = await this.reconnectWebSocket(account, access_token, proxy, ws);
            this.activeConnections.set(account.email, newWs);
        } catch (error) {
            this.log(`Failed to reconnect ${this.hideEmail(account.email)}: ${error.message}`, 'error');
        }
    }

    async saveAccountData(accountData) {
        const filePath = path.join(__dirname, 'DataAllAccount.js');
        const fileContent = `const DataAllAccount = ${JSON.stringify(accountData, null, 2)};\n\nmodule.exports = { DataAllAccount };`;
        await fs.writeFile(filePath, fileContent, 'utf-8');
    }

    async LoginAllAccounts() {
        console.clear();
        this.CoderMark();
        this.log(`${cl.yl}Login To All Accounts With Proxy Connection Mode Enabled!\n\n${cl.rt}`);

        const MAX_RETRIES = 3;
        const CONCURRENT_LOGINS = 5;
        const RETRY_DELAY = 2000;

        const proxies = await this.validateAccountsAndProxies();
        const accountData = [];

        const loginWithRetry = async (account, proxy, retryCount = 0) => {
            try {
                const {
                    access_token,
                    userId,
                    proxyIP
                } = await this.login(account, proxy);
                accountData.push({
                    email: account.email,
                    userId,
                    access_token
                });
                this.log(`${cl.am}]> ${cl.bl}Account ${cl.rt}${this.hideEmail(account.email)} ${cl.gl}Login Success ${cl.rt}With ProxyIP ${cl.br}${proxyIP}`);
                return true;
            } catch (error) {
                if (retryCount < MAX_RETRIES) {
                    this.log(`${cl.am}]> ${cl.yl}Retrying login for ${cl.rt}${this.hideEmail(account.email)} (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    return loginWithRetry(account, proxy, retryCount + 1);
                }
                this.log(`${cl.am}]> ${cl.rd}Error with account ${cl.rt}${this.hideEmail(account.email)}: ${cl.rd}${error.message}`, 'error');
                return false;
            }
        };

        const processAccountBatch = async (startIndex) => {
            const batch = [];
            for (let i = 0; i < CONCURRENT_LOGINS && startIndex + i < accountLists.length; i++) {
                const account = accountLists[startIndex + i];
                const proxy = proxies[startIndex + i].trim();
                batch.push(loginWithRetry(account, proxy));
            }
            return Promise.all(batch);
        };

        for (let i = 0; i < accountLists.length; i += CONCURRENT_LOGINS) {
            await processAccountBatch(i);
        }

        await this.saveAccountData(accountData);
        await console.clear();
        await this.CoderMark();
        await this.runWithCurrentSession();
    }

    async runSingleAccount() {
        console.clear();
        this.CoderMark();
        this.log(`${cl.yl}Direct Connection Mode Enabled!\n\n${cl.yl}]-> ${cl.gr}Please, Login To Your Account!\n${cl.rt}`);
        const email = await new Promise(resolve => {
            this.rl.question(`Enter email: `, resolve);
        });
        const password = await new Promise(resolve => {
            this.rl.question(`Enter password: `, resolve);
        });

        try {
            const account = {
                email,
                password
            };
            const {
                access_token,
                userId
            } = await this.login(account, null);

            const accountData = [{
                email,
                userId,
                access_token
            }];

            await this.saveAccountData(accountData);

            const ws = await this.setupWebSocket(account, access_token, null);
            this.activeConnections.set(email, ws);

        } catch (error) {
            this.log(`${cl.am}]> ${cl.rd}Error with single account: ${error.message}`, 'error');
        }
    }

    async start() {
        const menuOptions = [{
                label: `Run And Login To All Accounts ${cl.gl}(with proxy)${cl.rt}`,
                action: this.LoginAllAccounts.bind(this)
            },
            {
                label: `Run Single Account ${cl.am}(Direct Connection)${cl.rt}`,
                action: this.runSingleAccount.bind(this)
            },
            {
                label: `Run All Account with ${cl.bl}Current${cl.rt} Session ${cl.gl}(with proxy)${cl.rt}`,
                action: this.runWithCurrentSession.bind(this)
            },
            {
                label: `${cl.rd}Exit${cl.rt}`,
                action: () => {
                    this.log(`${cl.am}]> ${cl.rd}Exiting program with Blessing...`, 'warn');
                    this.rl.close();
                    process.exit(0);
                }
            }
        ];

        const displayMenu = async () => {
            console.clear();
            this.CoderMark();
            console.log(`\n${cl.yl}Menu Options:\n${cl.rt}`);
            menuOptions.forEach((option, index) => {
                console.log(`${cl.yl}${index + 1}. ${cl.rt}${option.label}`);
            });

            const answer = await new Promise(resolve => {
                this.rl.question(`\n${cl.rt}Select an option: ${cl.rt}`, resolve);
            });

            const selectedOption = menuOptions[parseInt(answer) - 1];
            if (selectedOption) {
                await selectedOption.action();
            } else {
                this.log(`Invalid option, please try again.`, 'error');
                await displayMenu();
            }
        };

        await displayMenu();
    }
}

const bot = new TeneoBot();
bot.start();
