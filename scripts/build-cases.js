#!/usr/bin/env node
/**
 * build-cases.js — 从 cases/caseN/case.md 生成 vibe 案例落地页 + 列表数据（单一数据源）
 *
 * 用法：
 *   node scripts/build-cases.js          # 处理所有 cases/caseN/case.md，生成 vibe-case-N.html 与 cases/cases.json
 *   node scripts/build-cases.js --dry    # 只打印处理计划与告警，不写文件
 *
 * 案例 md 规则：
 *   1. 顶部可带 frontmatter（--- 包裹）：
 *        title    页面/列表标题（必填）
 *        date     发布日期，如 2026-05-27（必填）
 *        excerpt  列表摘要（选填，缺省取正文前 80 字）
 *        cover    列表封面（选填，可为 imgNN.webp 或本地已有文件；缺省取第一张图）
 *   2. 正文为普通 Markdown，图片用 ![alt](来源) 引入，三种形式都支持：
 *        - data:image/...;base64,...（语雀「图片内嵌」导出）
 *        - https://...（语雀「远程图片」导出）
 *        - 本地文件名（如 img01.png，相对 case 目录）
 *   3. 构建时会自动把图片统一优化为本地 .webp（最长边 1600 / q82），并把 md 重写为干净可提交版本
 *
 * 依赖：sharp（用于图片转换，npm install --save-dev sharp）
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { markdownToHTML } = require('./lib/markdown.js');

const ROOT = path.join(__dirname, '..');
const CASES_DIR = path.join(ROOT, 'cases');
const TEMPLATE_FILE = path.join(__dirname, 'lib', 'case-template.html');
const BASE_URL = 'https://wjrachel.github.io/portfolio';
const IMG_MAX = 1600;
const IMG_QUALITY = 82;

const DRY = process.argv.slice(2).includes('--dry');
const warnings = [];
const warn = (msg) => { warnings.push(msg); console.warn(`  ⚠️  ${msg}`); };

// ---------- frontmatter ----------
function parseFrontmatter(content) {
    const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) return { meta: {}, body: content };
    const meta = {};
    for (const line of m[1].split('\n')) {
        const kv = line.match(/^([\w-]+):\s*(.*)$/);
        if (kv && kv[1]) meta[kv[1].trim()] = kv[2].trim();
    }
    return { meta, body: content.slice(m[0].length) };
}

// ---------- 图片处理 ----------
function dataUriToBuffer(uri) {
    const m = uri.match(/^data:[^;]+;base64,(.*)$/s);
    return m ? Buffer.from(m[1], 'base64') : null;
}

async function fetchRemote(url) {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

// 处理正文里的所有图片，返回 [新的正文(带 %%%%IMGn%%%% 占位符), 图片清单]
async function processImages(body, caseDir, caseKey) {
    const re = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
    const tokens = [];
    let m;
    while ((m = re.exec(body)) !== null) {
        tokens.push({ alt: m[1], src: m[2] });
    }

    const images = [];
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        const num = String(i + 1).padStart(2, '0');
        const imgFile = `img${num}.webp`;
        const outPath = path.join(caseDir, imgFile);
        let buf = null;

        if (t.src.startsWith('data:')) {
            buf = dataUriToBuffer(t.src);
        } else if (/^https?:\/\//.test(t.src)) {
            try {
                buf = await fetchRemote(t.src);
            } catch (e) {
                warn(`图片下载失败 ${t.src}: ${e.message}`);
            }
        } else {
            const localPath = path.resolve(caseDir, t.src);
            if (fs.existsSync(localPath)) {
                buf = fs.readFileSync(localPath);
            } else {
                warn(`本地图片不存在 ${t.src}（相对 ${caseKey}/ 目录）`);
            }
        }

        if (buf) {
            await sharp(buf)
                .resize({ width: IMG_MAX, height: IMG_MAX, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: IMG_QUALITY })
                .toFile(outPath);
        }
        images.push({ alt: t.alt, file: imgFile, ok: !!buf, src: t.src });
    }

    // 把正文里的 ![alt](src) 替换为占位符，稍后渲染后再换成 <img>
    let md = body;
    tokens.forEach((t, i) => {
        md = md.replace(`![${t.alt}](${t.src})`, `%%%%IMG${i + 1}%%%%`);
    });

    return { md, images };
}

function escapeAttr(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------- 生成落地页 ----------
function buildPage(meta, bodyMd, images, caseKey, caseIndex) {
    let html = markdownToHTML(bodyMd);

    images.forEach((img, i) => {
        const placeholder = `%%%%IMG${i + 1}%%%%`;
        if (html.includes(placeholder)) {
            const alt = escapeAttr(img.alt);
            const tag = `<img loading="lazy" src="cases/${caseKey}/${img.file}" alt="${alt}">`;
            html = html.replaceAll(placeholder, tag);
        }
    });

    const pageFile = `vibe-case-${caseIndex}.html`;
    const coverImage = meta.cover && fs.existsSync(path.join(CASES_DIR, caseKey, meta.cover))
        ? `cases/${caseKey}/${meta.cover}`
        : (images.length ? `cases/${caseKey}/${images[0].file}` : 'assets/avatar.png');

    const template = fs.readFileSync(TEMPLATE_FILE, 'utf-8');
    const title = `${meta.title} | AI产品应用实践`;
    const description = meta.excerpt || (meta.title ? meta.title : '');

    return {
        pageFile,
        html: template
            .replaceAll('{{TITLE}}', escapeAttr(title))
            .replaceAll('{{DESCRIPTION}}', escapeAttr(description))
            .replace('{{OG_URL}}', `${BASE_URL}/${pageFile}`)
            .replace('{{OG_IMAGE}}', `${BASE_URL}/${coverImage}`)
            .replace('{{CASE_TITLE}}', escapeAttr(meta.title || '实践案例'))
            .replace('{{DATE}}', escapeAttr(meta.date || ''))
            .replace('{{BODY}}', html),
        listing: {
            id: `case-${caseIndex}`,
            title: meta.title || '实践案例',
            excerpt: meta.excerpt || '',
            coverImage,
            detailUrl: pageFile,
            createdAt: meta.date || ''
        }
    };
}

// ---------- 主流程 ----------
async function main() {
    if (!fs.existsSync(CASES_DIR)) {
        console.error('❌ 找不到 cases 目录');
        process.exit(1);
    }
    if (!fs.existsSync(TEMPLATE_FILE)) {
        console.error('❌ 找不到模板文件', TEMPLATE_FILE);
        process.exit(1);
    }

    const caseDirs = fs.readdirSync(CASES_DIR)
        .filter(d => /^case\d+$/.test(d))
        .filter(d => fs.readdirSync(path.join(CASES_DIR, d)).some(f => f.endsWith('.md')))
        .sort((a, b) => parseInt(a.replace('case', '')) - parseInt(b.replace('case', '')));

    console.log(`📖 发现 ${caseDirs.length} 个案例目录`);

    const listing = [];
    for (const caseKey of caseDirs) {
        const caseIndex = parseInt(caseKey.replace('case', ''));
        const caseDir = path.join(CASES_DIR, caseKey);
        // 取文件夹内的 md：优先 case.md，否则取第一个 .md（兼容语雀导出的任意命名）
        const mdFile = fs.existsSync(path.join(caseDir, 'case.md'))
            ? path.join(caseDir, 'case.md')
            : path.join(caseDir, fs.readdirSync(caseDir).find(f => f.endsWith('.md')));
        const content = fs.readFileSync(mdFile, 'utf-8');
        const { meta, body } = parseFrontmatter(content);

        console.log(`\n🔨 处理 ${caseKey}（${meta.title || '未命名'}）`);

        if (!meta.title || !meta.date) {
            warn(`${caseKey} 缺少 frontmatter 的 title 或 date`);
        }

        const { md, images } = await processImages(body, caseDir, caseKey);
        images.forEach((img, i) => console.log(`  ${i + 1}. ${img.file}${img.ok ? '' : '（获取失败）'}`));

        const result = buildPage(meta, md, images, caseKey, caseIndex);
        listing.push(result.listing);

        if (!DRY) {
            fs.writeFileSync(path.join(ROOT, result.pageFile), result.html);
            console.log(`  ✅ 生成 ${result.pageFile}（封面 ${result.listing.coverImage}）`);
            // 重写干净的 md：把远程/base64 图片按顺序替换为本地引用（保持正文可读、仓库轻量）
            let imgIdx = 0;
            const cleanMd = content.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt) => {
                imgIdx++;
                return `![${alt}](img${String(imgIdx).padStart(2, '0')}.webp)`;
            });
            fs.writeFileSync(mdFile, cleanMd);
        }
    }

    if (!DRY) {
        fs.writeFileSync(path.join(CASES_DIR, 'cases.json'), JSON.stringify(listing, null, 2));
        console.log(`\n✅ 已写入 cases/cases.json（${listing.length} 个案例）`);
    } else {
        console.log(`\n--dry 模式，未写文件。将生成 ${listing.length} 个页面。`);
    }

    if (warnings.length) console.log(`\n⚠️  ${warnings.length} 条告警（见上）`);
}

main().catch(e => { console.error(e); process.exit(1); });
