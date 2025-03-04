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
const pino = require('pino');
const pretty = require('pino-pretty');
const fs = require('fs').promises;
const path = require('path');
const WebSocket = require('ws');
const axios = require('axios');
const { DateTime } = require('luxon');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const readline = require('readline');
const { DataAllAccount } = require('./DataAllAccount');

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
        this.wita = 'Asia/Makassar'; // Adjust for Your Time Zone (e.g., 'Asia/Makassar' in Bali, Indonesia)
        this.apiKey = 'OwAG3kib1ivOJG4Y0OCZ8lJETa6ypvsDtGmdhcjB';
        this.loginUrl = 'https://auth.teneo.pro/api/login';
        this.userUrl = 'https://auth.teneo.pro/api/user';
        this.websocketUrl = 'secure.ws.teneo.pro';
        this.activeConnections = new Map();
        this.CoderMarkPrinted = false;
        this.version = 'v0.2';

        this.initializeLogger();

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Run all accounts using current session
        TeneoBot.prototype.runWithCurrentSession = async () => {
            console.clear();
            this.CoderMark();
            this.log(`${cl.am}]> ${cl.yl}Proxy Connection Mode Enabled!\n\n${cl.yl}]-> ${cl.am}Run All Accounts Using Current Session! ${cl.rt}\n`);
            try {
                const dataPath = path.join(__dirname, 'DataAllAccount.js');
                const { DataAllAccount } = require(dataPath);
                const proxies = await this.validateAccountsAndProxies();

                if (!DataAllAccount || !Array.isArray(DataAllAccount)) {
                    this.log(`${cl.am}]> ${cl.rd}No saved session data found or invalid format`);
                    return;
                }

                for (let i = 0; i < DataAllAccount.length; i++) {
                    const accountData = DataAllAccount[i];
                    const proxy = proxies[i].trim();
                    const account = DataAllAccount.find(acc => acc.email === accountData.email);

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

        this.setupEventHandlers();
        this.startTimeUpdate();
    }

    initializeLogger() {
        const getTranslateTime = () => {
            return `SYS:${DateTime.now().setZone(this.wita).toFormat('MM/dd/yyyy HH:mm:ss Z')}`;
        };

        this.logger = pino(pretty({
            colorize: true,
            translateTime: getTranslateTime(),
            ignore: 'pid,hostname'
        }));

        // Update logger configuration every second
        this.updateLogger = () => {
            this.logger = pino(pretty({
                colorize: true,
                translateTime: getTranslateTime(),
                ignore: 'pid,hostname'
            }));
        };
    }

    startTimeUpdate() {
        setInterval(() => {
            this.updateLogger();
        }, 1000);
    }

    setupEventHandlers() {
        process.on('SIGINT', () => {
            console.log(`${cl.am}]> ${cl.rd}Exiting program with Blessing...`);
            process.exit(0);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.log(`${cl.am}]> ${cl.rd}Unhandled Rejection at:${cl.rt}`, promise, `${cl.rd}reason:${cl.rt}`, reason);
        });

        process.on('uncaughtException', (error) => {
            console.log(`${cl.am}]> ${cl.rd}Uncaught Exception:${cl.rt}`, error);
            process.exit(1);
        });
    }

    log(message, level = 'info', meta = {}) {
        this.logger[level]({
            ...meta,
            msg: message,
            timestamp: DateTime.now().setZone(this.wita).toFormat('MM/dd/yyyy HH:mm:ss Z')
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
\n${cl.rt}${cl.gb} Teneo Node Bot ${cl.gl}JS ${cl.bl}v1.2 ${cl.rt}
    \n${cl.gr}--------------------------------------
    \n${cl.yl}[+]${cl.rt} DM : ${cl.bl}https://t.me/furqonflynn
    \n${cl.yl}[+]${cl.rt} GH : ${cl.bl}https://github.com/cmalf/
    \n${cl.gr}--------------------------------------
    \n${cl.yl}]-> ${cl.am}{ ${cl.rt}Teneo Extension${cl.bl} v2.0.0${cl.am} } ${cl.rt}
    \n${cl.gr}--------------------------------------${cl.rt}
            `);
            this.CoderMarkPrinted = true;
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

            if (DataAllAccount.length !== proxies.length) {
                this.log(`${cl.rt}---------------------------------------------------`);
                this.log(`${cl.am}]> ${cl.rt}Mismatch: ${cl.rt}${DataAllAccount.length} ${cl.br}accounts ${cl.rt}but ${cl.br}${proxies.length} proxies. ${cl.rd}Exiting...`, 'error');
                this.log(`${cl.rt}---------------------------------------------------\n`);
                process.exit(1);
            }
            this.log(`${cl.rt}---------------------------------------------------`);
            this.log(`${cl.am}]> ${cl.rt}Validation ${cl.gl}successful${cl.rt}: ${DataAllAccount.length} ${cl.br}accounts ${cl.rt}and ${proxies.length} ${cl.br}proxies.`);
            this.log(`${cl.rt}---------------------------------------------------\n`);
            return proxies;
        } catch (error) {
            this.log(`${cl.am}]> ${cl.rd} Error reading proxy file: ${error.message}`, 'error');
            process.exit(1);
        }
    }

    async reconnectWebSocket(account, access_token, proxy, ws) {
        const maxRetries = 5;
        const baseDelay = 15000;
        const maxDelay = 300000;
        let retryCount = 0;
        let currentProxy = proxy;

        const cleanup = () => {
            if (ws) {
                try {
                    if (ws.pingInterval) clearInterval(ws.pingInterval);
                    ws.removeAllListeners();
                    ws.terminate();
                } catch (err) {
                    this.log(`${cl.am}]> ${cl.rd}Cleanup error: ${err.message}`, 'error');
                }
            }
        };

        const calculateDelay = (attempt) => {
            const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            const jitter = Math.random() * 1000;
            return exponentialDelay + jitter;
        };

        const reconnect = async () => {
            try {
                cleanup();

                if (retryCount >= maxRetries) {
                    throw new Error(`${cl.am}]> ${cl.rd}Maximum reconnection attempts reached for ${this.hideEmail(account.email)}`);
                }

                this.log(`${cl.am}]> ${cl.yl}Attempting reconnection ${cl.rt}for ${this.hideEmail(account.email)} (attempt ${retryCount + 1})`);
                const newWs = await this.setupWebSocket(account, access_token, currentProxy);
                
                this.activeConnections.delete(account.email);
                this.activeConnections.set(account.email, newWs);

                retryCount = 0;
                return newWs;
            } catch (error) {
                retryCount++;
                this.log(`${cl.am}]> ${cl.rd}Reconnection failed ${cl.rt}for ${this.hideEmail(account.email)}: ${cl.rd}${error.message}`, 'error');

                if (retryCount < maxRetries) {
                    const delay = calculateDelay(retryCount);
                    this.log(`${cl.am}]> ${cl.yl}Waiting ${delay/1000} seconds before next retry`, 'warn');
                    return new Promise((resolve) => {
                        setTimeout(() => resolve(reconnect()), delay);
                    });
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
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 AtContent/95.5.5462.5",
        ];

        return new Promise((resolve, reject) => {
            const wsUrl = `wss://${this.websocketUrl}/websocket?accessToken=${encodeURIComponent(access_token)}&version=${encodeURIComponent(this.version)}`;
            
            this.getProxyAgent(proxy).then(agent => {
                const wsOptions = {
                    agent,
                    headers: {
                        'Origin': 'chrome-extension://emcclcoaglgcpoognfiggmhnhgabppkm',
                        'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)]
                    },
                    handshakeTimeout: 30000,
                    followRedirects: true,
                    rejectUnauthorized: false
                };

                const ws = new WebSocket(wsUrl, wsOptions);
                ws._retryCount = 0;
                ws._maxRetries = 3;
                ws._access_token = access_token;
                ws._proxy = proxy;

                let connectionTimeoutId = setTimeout(() => {
                    ws.terminate();
                    reject(new Error('WebSocket connection timeout'));
                }, wsOptions.handshakeTimeout);

                ws.on('open', () => {
                    clearTimeout(connectionTimeoutId);
                    this.log(`${cl.am}]> ${cl.gl}WebSocket connected ${cl.rt}for ${this.hideEmail(account.email)}`);
                    ws._retryCount = 0;

                    ws.pingInterval = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: "PING" }));
                        }
                    }, 10000);

                    resolve(ws);
                });

                ws.on('error', (error) => {
                    clearTimeout(connectionTimeoutId);
                    reject(error);
                });

                this.setupMessageHandler(ws, account);
            }).catch(reject);
        });
    }

    async setupMessageHandler(ws, account) {
        ws.on('message', async (data) => {
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

                    case "Invalid authentication token. Please log in again.":
                        this.log(`${baseLogStr} ${cl.rd} Invalid authentication token. Please log in again.`);
                        ws.terminate();
                        break;

                    default:
                        this.log(`${baseLogStr} - Received message: ${JSON.stringify(message)}`);
                }
            } catch (error) {
                this.log(`${cl.am}]> ${cl.rd}Error parsing message ${cl.rt}for ${this.hideEmail(account.email)}: ${cl.rd}${error.message}`, 'error');
            }
        });

        ws.on('close', async () => {
            this.log(`${cl.am}]> ${cl.rd}WebSocket closed ${cl.rt}for ${this.hideEmail(account.email)}`, 'warn');
            await this.handleWebSocketError(account, ws._access_token, ws._proxy, ws);
        });
    }

    async handleWebSocketError(account, access_token, proxy, ws) {
        if (ws) {
            clearInterval(ws.pingInterval);
            ws.removeAllListeners();
            try {
                ws.terminate();
            } catch (error) {
                // Ignore termination errors
            }
        }
        
        if (!ws._retryCount || ws._retryCount < ws._maxRetries) {
            ws._retryCount = (ws._retryCount || 0) + 1;
            this.log(`${cl.am}]> ${cl.yl}Attempting reconnection for ${this.hideEmail(account.email)} (attempt ${ws._retryCount})`);
            
            try {
                const newWs = await this.setupWebSocket(account, access_token, proxy);
                this.activeConnections.set(account.email, newWs);
            } catch (error) {
                this.log(`${cl.am}]> ${cl.rd}Failed to reconnect ${cl.rt}${this.hideEmail(account.email)}: ${cl.rd}${error.message}`, 'error');
                if (ws._retryCount >= ws._maxRetries) {
                    await this.moveFailedAccountToError(account, proxy);
                    this.activeConnections.delete(account.email);
                }
            }
        } else {
            this.activeConnections.delete(account.email);
        }
    }

    async start() {
        const menuOptions = [
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

