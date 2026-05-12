const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

// 支持环境变量覆盖配置 (无环境变量时使用默认值)
const CONCURRENCY = parseInt(process.env.SIGNER_CONCURRENCY, 10) || 2;
const MAX_REQUESTS_BEFORE_DEATH = parseInt(process.env.SIGNER_MAX_REQUESTS, 10) || 0; // 0=永不自杀
const EVALUATE_TIMEOUT_MS = parseInt(process.env.SIGNER_EVAL_TIMEOUT, 10) || 15000;
const SIGNER_VERSION = process.env.SIGNER_VERSION || 'browser_hook_v16';

let requestCount = 0;
let isShuttingDown = false;
let isRecycling = false; // 温和回收模式：排空队列后重建 contexts

let contextPool = []; 
let availableWorkers = []; 
let taskQueue = []; 

let topBrowser = null;

async function initSandbox() {
    console.log(`[System] 正在启动独立 Context 多核防爆引擎 (并发度: ${CONCURRENCY})...`);
    topBrowser = await chromium.launch({ 
        headless: true,
        args: ['--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox']
    }); 
    
    for (let i = 0; i < CONCURRENCY; i++) {
        const context = await topBrowser.newContext();
        const page = await context.newPage();

        // 统一路由：同时处理 HTML 清洗 + JS __g 暴露注入
        await page.route('**/*', async route => {
            const url = route.request().url();
            
            // JS 拦截：将模块 1514 的局部 var __g 暴露到 window
            if (/\.app\.[a-f0-9]+\.js/i.test(url)) {
                const response = await route.fetch();
                let jsCode = await response.text();
                
                // [V16 P2 修复]：多模式容错匹配 __g 定义点
                // 模式 1: 逗号分隔 var 列表 ",__g={" (当前打包形态)
                // 模式 2: 独立声明 "var __g=" / "let __g=" / "const __g="
                // 模式 3: 带空格的逗号形态 ", __g =" 
                let hooked = false;
                
                if (jsCode.includes('__g._encrypt')) {
                    // 广谱正则：匹配 __g 的赋值点，不论是逗号分隔还是独立声明
                    const patterns = [
                        { re: /,\s*__g\s*=\s*\{/,       replace: (m) => m.replace(/__g\s*=/, '__g=window.__g=') },
                        { re: /(var|let|const)\s+__g\s*=/, replace: (m) => m.replace(/__g\s*=/, '__g=window.__g=') },
                    ];
                    
                    for (const p of patterns) {
                        if (p.re.test(jsCode)) {
                            jsCode = jsCode.replace(p.re, p.replace);
                            console.log(`[Hook] __g 暴露注入成功 (${url.substring(url.lastIndexOf('/') + 1)})`);
                            hooked = true;
                            break;
                        }
                    }
                    
                    if (!hooked) {
                        console.warn(`[Hook Warning] 检测到 __g._encrypt 但未能匹配赋值模式，签名可能失败`);
                    }
                }
                
                await route.fulfill({ response, body: jsCode });
                return;
            }
            
            // HTML 拦截：清除 SRI integrity 和 CSP
            if (url.includes('www.zhihu.com') && (url.endsWith('.html') || url.endsWith('/') || url === 'https://www.zhihu.com')) {
                const response = await route.fetch();
                let html = await response.text();
                html = html.replace(/integrity="[^"]+"/g, '');
                html = html.replace(/<meta[^>]+Content-Security-Policy[^>]+>/ig, '');
                await route.fulfill({ response, body: html });
                return;
            }
            
            await route.continue();
        });

        await page.goto('https://www.zhihu.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // 等待 window.__g._encrypt 就绪
        try {
            await page.waitForFunction(() => {
                return typeof window.__g !== 'undefined' && typeof window.__g._encrypt === 'function';
            }, { timeout: 20000 });
            
            // 注入辅助函数到 window：md5 + path 提取
            await page.evaluate(() => {
                // 内联 md5 实现（RFC 1321），完全不依赖知乎内部模块
                window.__md5 = function(string) {
                    function md5cycle(x, k) {
                        var a = x[0], b = x[1], c = x[2], d = x[3];
                        a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586);
                        c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
                        a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426);
                        c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
                        a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417);
                        c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
                        a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101);
                        c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
                        a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632);
                        c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
                        a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083);
                        c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
                        a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690);
                        c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
                        a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
                        c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
                        a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463);
                        c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
                        a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353);
                        c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
                        a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222);
                        c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
                        a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835);
                        c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
                        a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415);
                        c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
                        a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606);
                        c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
                        a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744);
                        c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
                        a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379);
                        c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
                        x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
                    }
                    function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
                    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
                    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
                    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
                    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
                    function md51(s) {
                        var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
                        for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i)));
                        s = s.substring(i - 64);
                        var tail = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
                        for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
                        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
                        if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
                        tail[14] = n * 8;
                        md5cycle(state, tail);
                        return state;
                    }
                    function md5blk(s) {
                        var md5blks = [], i;
                        for (i = 0; i < 64; i += 4) md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i+1) << 8) + (s.charCodeAt(i+2) << 16) + (s.charCodeAt(i+3) << 24);
                        return md5blks;
                    }
                    var hex_chr = '0123456789abcdef'.split('');
                    function rhex(n) {
                        var s = '', j = 0;
                        for (; j < 4; j++) s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
                        return s;
                    }
                    function hex(x) { for (var i = 0; i < x.length; i++) x[i] = rhex(x[i]); return x.join(''); }
                    function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
                    return hex(md51(string));
                };
                
                // 复刻模块 18543 的 mR 函数：提取 URL 的 pathname+search 部分
                window.__myPathExtract = function(url) {
                    try {
                        const u = new URL(url, 'https://www.zhihu.com');
                        return u.pathname + u.search;
                    } catch(e) { return url; }
                };
                window.__mySignReady = true;
            });
            
            console.log(`[System] 节点 ${i} __g._encrypt 捕获成功！`);
            let worker = { context, page };
            contextPool.push(worker);
            availableWorkers.push(worker); 
        } catch (e) {
            console.error(`[Fatal] 节点 ${i} 预热失败！__g._encrypt 未能就绪。强制自杀。`);
            if (topBrowser) await topBrowser.close().catch(()=>{});
            process.exit(1);
        }
    }
    console.log(`[System] ${CONCURRENCY} 个独立沙盒引擎就绪，RPC 在线。`);
}

// processQueue 调用点统一加 .catch() 防止 unhandledRejection
async function processQueue() {
    if (taskQueue.length === 0 || availableWorkers.length === 0) return;
    
    if (isShuttingDown) {
        while(taskQueue.length > 0) {
            let task = taskQueue.shift();
            task.reject(new Error("RPC 引擎轮回清洗中，请触发 Retry 机制"));
        }
        return;
    }

    const worker = availableWorkers.pop(); 
    const { url, dc0, resolve, reject } = taskQueue.shift();

    try {
        requestCount++;
        const shouldDie = requestCount >= MAX_REQUESTS_BEFORE_DEATH;
        if (shouldDie && !isShuttingDown) {
            isShuttingDown = true;
            console.error("[System] 达到 TTL 极限，进入优雅退出流程...");
            
            setTimeout(async () => {
                console.error("[Fatal] 优雅退出超时 (5s)，执行 browser.close() 后退出。");
                if (topBrowser) await topBrowser.close().catch(()=>{});
                process.exit(0);
            }, 5000);
        }

        let timeoutId;
        // [V16] 在浏览器端直接复刻模块 88545 的 eb() 签名逻辑
        // 签名公式: encrypt(md5( [zse93, path, dc0, xZst81].filter(Boolean).join("+") ))
        // zse93 = "101_3.0" (appId=101, encryptor version=3.0, platform=Web)
        // path = url 的 pathname+search
        // 最终输出: "2.0_" + signature
        const evaluatePromise = worker.page.evaluate(({ targetUrl, targetDc0 }) => {
            if (typeof window.__g === 'undefined' || typeof window.__g._encrypt !== 'function') {
                throw new Error("Hook未生效: window.__g._encrypt 不可用");
            }
            if (typeof window.__md5 !== 'function') {
                throw new Error("Hook未生效: md5 未注入");
            }
            
            // 复刻模块 18543.mR: 提取 path
            const path = window.__myPathExtract(targetUrl);
            
            // 组装 source（复刻模块 88545 的 eb 函数）
            // zse93 = $8(Web=3, version="3.0", appId="101") → "101_3_3.0"
            const zse93 = "101_3_3.0";
            const source = [zse93, path, targetDc0].filter(Boolean).join("+");
            
            // 签名链路（复刻模块 88545 + 93823 + 1514）：
            // 1. md5(source) → 32 位十六进制摘要
            // 2. __g._encrypt(encodeURIComponent(md5_hex)) → SM4 加密签名
            const md5Hex = window.__md5(source);
            const signature = window.__g._encrypt(encodeURIComponent(md5Hex));
            
            return "2.0_" + signature;
        }, { targetUrl: url, targetDc0: dc0 });

        const timeoutPromise = new Promise((_, rej) => {
            timeoutId = setTimeout(() => rej(new Error("Evaluate 达到硬超时极限")), EVALUATE_TIMEOUT_MS);
        });

        const finalSignature = await Promise.race([evaluatePromise, timeoutPromise]);
        clearTimeout(timeoutId);
        resolve(finalSignature); 
        
        availableWorkers.push(worker); 

        if (isShuttingDown && availableWorkers.length === contextPool.length) {
            console.log("[System] 节点池全数归还，执行 browser.close() 后安全退出。");
            if (topBrowser) await topBrowser.close().catch(()=>{});
            process.exit(0);
        } else {
            processQueue().catch(e => console.error('[processQueue error]', e)); 
        }

    } catch (e) {
        reject(e); 
        if (e.message.includes("硬超时") || e.message.includes("Hook未生效")) {
             console.error("[Fatal] 严重超时或沙盒被摧毁，执行 browser.close() 后退出...");
             if (topBrowser) await topBrowser.close().catch(()=>{});
             process.exit(1); 
        } else {
             availableWorkers.push(worker);
             processQueue().catch(e => console.error('[processQueue error]', e)); 
        }
    }
}

const SIGNER_VERSION = 'browser_hook_v16';
let lastCanaryOk = 0;

app.get('/health', (req, res) => {
    res.json({
        ok: !isShuttingDown,
        ready: contextPool.length === CONCURRENCY,
        availableWorkers: availableWorkers.length,
        queueDepth: taskQueue.length,
        totalResolved: requestCount,
        ttlLimit: MAX_REQUESTS_BEFORE_DEATH,
        signer_version: SIGNER_VERSION,
        last_canary_ok: lastCanaryOk
    });
});

// [VNext] Canary 验活端点：用已知 URL 做一次真实签名
app.get('/canary', async (req, res) => {
    if (isShuttingDown || contextPool.length === 0) {
        return res.json({ ok: false, error: '引擎未就绪' });
    }
    const canaryUrl = '/api/v4/questions/1/answers?limit=1&offset=0';
    const canaryDc0 = 'canary_test_dc0_value';
    const t0 = Date.now();

    try {
        const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('canary timeout')), 10000);
            taskQueue.push({
                url: canaryUrl, dc0: canaryDc0,
                resolve: (sig) => { clearTimeout(timeout); resolve(sig); },
                reject: (err) => { clearTimeout(timeout); reject(err); }
            });
            processQueue().catch(reject);
        });

        const latency = Date.now() - t0;
        if (result && typeof result === 'string' && result.startsWith('2.0_')) {
            lastCanaryOk = Math.floor(Date.now() / 1000);
            console.log(`[Canary] 验活成功 (${latency}ms, sig=${result.substring(0, 20)}...)`);
            res.json({ ok: true, signature: result, latency_ms: latency, signer_version: SIGNER_VERSION });
        } else {
            console.warn(`[Canary] 签名格式异常: ${result}`);
            res.json({ ok: false, error: '签名格式异常', signer_version: SIGNER_VERSION });
        }
    } catch (e) {
        const latency = Date.now() - t0;
        console.error(`[Canary] 验活失败 (${latency}ms): ${e.message}`);
        res.json({ ok: false, error: e.message, latency_ms: latency, signer_version: SIGNER_VERSION });
    }
});

app.post('/get_sign', (req, res) => {
    if (isShuttingDown) {
        return res.status(503).json({ error: "节点回收清洗中，请交由 Retry 机制" });
    }
    const { url, dc0 } = req.body;
    if (!url || !dc0 || typeof url !== 'string' || typeof dc0 !== 'string') {
        return res.status(400).json({ error: "非法参数" });
    }
    if (taskQueue.length > 500) {
        return res.status(503).json({ error: "系统满负荷，防崩机制激活" });
    }

    new Promise((resolve, reject) => {
        taskQueue.push({ url, dc0, resolve, reject });
        processQueue().catch(e => console.error('[processQueue error]', e)); 
    })
    .then(signature => res.json({ signature }))
    .catch(error => res.status(500).json({ error: error.message }));
});

initSandbox().then(() => {
    app.listen(3000, () => {
        console.log("🚀 RPC signer 已启动 (port 3000)");
        console.log("[Canary] 执行启动自检...");
        // 启动后自动跑一次 canary 
        setTimeout(async () => {
            try {
                const http = require('http');
                const req = http.get('http://127.0.0.1:3000/canary', (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const result = JSON.parse(data);
                            if (result.ok) {
                                console.log(`[Canary] 启动自检通过 ✓ (version: ${SIGNER_VERSION})`);
                            } else {
                                console.error(`[Canary] 启动自检失败: ${result.error}`);
                            }
                        } catch(e) {
                            console.error(`[Canary] 自检响应解析失败`);
                        }
                    });
                });
                req.on('error', (e) => console.error(`[Canary] 自检请求失败: ${e.message}`));
            } catch(e) {
                console.error(`[Canary] 自检异常: ${e.message}`);
            }
        }, 2000);
    });
}).catch(err => {
    console.error("[Fatal] 引擎初始化失败:", err);
    process.exit(1);
});
