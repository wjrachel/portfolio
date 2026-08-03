const fs = require('fs');
const path = require('path');

// 文章根目录
const ARTICLES_DIR = path.join(__dirname, '../AI行业观察');
const INSIGHTS_HTML = path.join(__dirname, '../insights.html');

// 标签映射
const TAG_MAPPING = {
    '国产模型': ['国产模型', '调用量', '腾讯混元', 'DeepSeek', 'Kimi', 'Qwen', '通义千问', '豆包', '华为', '昇腾'],
    '竞争格局': ['竞争格局', 'Anthropic', 'OpenAI', 'ChatGPT', '份额', '格局', '三巨头', '垄断'],
    'Agentic AI': ['Agentic', 'Agent', 'Claude', '智能体', '部署公司', 'Spark', 'Agent落地'],
    '大模型商业化': ['商业化', '付费', '收费', '定价', '变现', 'ROI', '成本', '利润'],
    '企业落地': ['企业', '落地', '部署', 'B端', '客户'],
    '算力': ['算力', 'GPU', '芯片', 'HBM', 'NPU', '存储', '超算', '太空算力', '算力电'],
    '监管合规': ['监管', '合规', '治理', 'EU AI Act', '法律', '数据', 'ZDR'],
    '开源生态': ['开源', '开放权重', '生态', '社区'],
    '金融AI': ['金融', '财务', '财税', '银行', '保险', 'IPO', '融资', '估值'],
    'SaaS': ['SaaS', 'GitLab', 'Copilot', '订阅', '按量计费'],
    '价格战': ['价格战', '降价', '定价', '峰谷', 'token价格'],
    'AI芯片': ['英伟达', '黄仁勋', 'Vera Rubin', '芯片', 'PC芯片', '联发科'],
    '推理范式': ['推理', '广度优先', 'MoE', '稀疏注意力', 'MiMo', '千tokens'],
    'AI治理': ['治理', 'WAIC', '中美欧', '三足鼎立', '监管框架']
};

// 自动推断标签
function inferTags(content, title) {
    const tags = new Set();
    const text = (title + ' ' + content).toLowerCase();
    
    for (const [tag, keywords] of Object.entries(TAG_MAPPING)) {
        for (const keyword of keywords) {
            if (text.includes(keyword.toLowerCase())) {
                tags.add(tag);
                break;
            }
        }
    }
    
    // 默认标签
    if (tags.size === 0) {
        tags.add('AI行业观察');
    }
    
    return Array.from(tags).slice(0, 3);
}

// 提取摘要
function extractSummary(content) {
    const cleanText = (text) => text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^[-*]\s+/gm, '')
        .replace(/\|[^|]+\|/g, '')
        .replace(/\n{2,}/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // 找到事件段落
    const eventMatch = content.match(/##?\s*[一二三四五六七八九十]*、?\s*事件[\s\S]*?(?=\n##|\n---|\n$)/);
    if (eventMatch) {
        let eventText = eventMatch[0].replace(/##?\s*[一二三四五六七八九十]*、?\s*事件[^\n]*\n?/, '').trim();
        eventText = eventText.replace(/^>\s*来源[^\n]*\n?/gm, '').trim();
        eventText = cleanText(eventText);
        if (eventText.length > 30) {
            return eventText.slice(0, 150) + (eventText.length > 150 ? '...' : '');
        }
    }
    
    // 找到触发事件
    const triggerMatch = content.match(/\*\*触发[^*]+\*\*[：:]\s*([^\n]+)/);
    if (triggerMatch && triggerMatch[1]) {
        return cleanText(triggerMatch[1]).slice(0, 150);
    }
    
    // 找到事件粗体
    const boldEventMatch = content.match(/\*\*事件\*\*[：:]\s*([^\n]+)/);
    if (boldEventMatch && boldEventMatch[1]) {
        return cleanText(boldEventMatch[1]);
    }
    
    // 否则取前150字
    const cleanContent = content
        .replace(/^#[^\n]+\n/, '')
        .replace(/\*\*[^\*]+\*\*[：:]\s*/g, '')
        .replace(/^---+$/gm, '')
        .replace(/^##?\s*[^\n]+\n/gm, '');
    
    return cleanText(cleanContent).slice(0, 150) + (cleanText(cleanContent).length > 150 ? '...' : '');
}

// 转换 Markdown 为 HTML
function markdownToHTML(markdown) {
    // 1. 解析表格（必须在其他替换之前）
    markdown = markdown.replace(
        /((?:\|.+\|\n?)+)/g,
        (tableMatch) => {
            const lines = tableMatch.trim().split('\n').filter(l => l.trim());
            if (lines.length < 2) return tableMatch;
            
            const hasSeparator = lines[1].match(/^\|[\s\-|:]+\|$/);
            if (!hasSeparator) return tableMatch;
            
            const headerCells = lines[0].split('|').slice(1, -1).map(c => c.trim());
            const bodyRows = lines.slice(2);
            
            let html = '<table>\n  <thead><tr>';
            headerCells.forEach(c => { html += `<th>${c}</th>`; });
            html += '</tr></thead>\n  <tbody>\n';
            
            bodyRows.forEach(row => {
                const cells = row.split('|').slice(1, -1).map(c => c.trim());
                html += '    <tr>';
                cells.forEach(c => { html += `<td>${c}</td>`; });
                html += '</tr>\n';
            });
            
            html += '  </tbody>\n</table>';
            return html;
        }
    );
    
    // 2. 列表项转换（必须在粗体替换之前，因为 - **key**：value 中的 ** 需要保留给正则匹配）
    markdown = markdown
        .replace(/^- \*\*([^*]+)\*\*[：:]\s*/gm, '<li><strong>$1</strong>：')
        .replace(/^- \s*/gm, '<li>');
    
    // 3. 包裹连续列表项为 <ul>
    markdown = markdown.replace(
        /((?:<li>.*\n?)+)/g,
        (listMatch) => {
            return '<ul>\n' + listMatch + '</ul>\n';
        }
    );
    
    // 4. 标题
    let html = markdown
        .replace(/^###\s+([^\n]+)/gm, '<h3>$1</h3>')
        .replace(/^##\s+([^\n]+)/gm, '<h2>$1</h2>')
        .replace(/^#\s+([^\n]+)/gm, '<h1>$1</h1>');
    
    // 5. 加粗/斜体（现在列表项中的 ** 已被替换为 <strong>，不会受影响）
    html = html
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // 6. 引用块
    html = html.replace(/^>\s*(.*)$/gm, '<blockquote>$1</blockquote>');
    
    // 7. 分隔线
    html = html.replace(/^---+$/gm, '<hr>');
    
    // 8. 段落处理：将连续的纯文本行包裹在 <p> 中
    let lines = html.split('\n');
    let result = [];
    let textBuffer = [];
    
    const isHTMLLine = (line) => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        // 只将块级 HTML 标签识别为非文本行，内联标签（strong/em）仍需包裹 <p>
        return /^<\/?\s*(h[1-6]|table|thead|tbody|tfoot|tr|th|td|ul|ol|li|blockquote|hr|p|div)/i.test(trimmed);
    };
    
    const flushTextBuffer = () => {
        if (textBuffer.length > 0) {
            const text = textBuffer.join('\n').trim();
            if (text) {
                result.push('<p>' + text + '</p>');
            }
            textBuffer = [];
        }
    };
    
    for (const line of lines) {
        if (!line.trim()) {
            flushTextBuffer();
            continue;
        }
        if (isHTMLLine(line)) {
            flushTextBuffer();
            result.push(line);
        } else {
            textBuffer.push(line);
        }
    }
    flushTextBuffer();
    
    return result.join('\n');
}

// 解析日期
function parseDate(content, file) {
    // 格式1：**日期：** 2026年7月21日
    const cnDateMatch = content.match(/\*\*日期\*\*[：:]\s*(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (cnDateMatch) {
        return `${cnDateMatch[1]}-${String(cnDateMatch[2]).padStart(2, '0')}-${String(cnDateMatch[3]).padStart(2, '0')}`;
    }
    
    // 格式2：**日期：** 2026-07-21
    const isoDateMatch = content.match(/\*\*日期\*\*[：:]\s*(\d{4}-\d{2}-\d{2})/);
    if (isoDateMatch) {
        return isoDateMatch[1];
    }
    
    // 格式3：2026年7月21日 （单独一行）
    const cnDateMatch2 = content.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/m);
    if (cnDateMatch2) {
        return `${cnDateMatch2[1]}-${String(cnDateMatch2[2]).padStart(2, '0')}-${String(cnDateMatch2[3]).padStart(2, '0')}`;
    }
    
    // 从文件名提取
    const fileDateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    if (fileDateMatch) {
        return fileDateMatch[1];
    }
    
    return '2026-01-01';
}

// 读取所有文章
function readArticles() {
    const articles = [];
    const months = fs.readdirSync(ARTICLES_DIR).filter(f => fs.statSync(path.join(ARTICLES_DIR, f)).isDirectory());
    
    months.forEach(month => {
        const monthDir = path.join(ARTICLES_DIR, month);
        const files = fs.readdirSync(monthDir).filter(f => f.endsWith('.md'));
        
        files.forEach(file => {
            const filePath = path.join(monthDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            
            // 提取标题
            const titleMatch = content.match(/^#\s+([^\n]+)/);
            const title = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');
            
            const date = parseDate(content, file);
            const summary = extractSummary(content);
            const tags = inferTags(content, title);
            
            // 转换正文（去掉标题、日期、事件行等元信息后的部分）
            let body = content
                .replace(/^#[^\n]+\n/, '')
                .replace(/\*\*日期\*\*[：:][^\n]+\n/g, '')
                .replace(/^\d{4}年\d{1,2}月\d{1,2}日\s*\n/m, '')
                .replace(/\*\*事件\*\*[：:][^\n]+\n/g, '')
                .replace(/\*\*触发[^*]+\*\*[：:][^\n]+\n/g, '')
                .replace(/\*\*来源[^*]*\*\*[：:][^\n]+\n/g, '')
                .replace(/^\s*>\s*来源[^\n]*\n?/gm, '')
                .trim();
            
            const htmlBody = markdownToHTML(body);
            const id = file.replace('.md', '');
            
            articles.push({ id, title, date, summary, tags, body: htmlBody });
        });
    });
    
    articles.sort((a, b) => new Date(b.date) - new Date(a.date));
    return articles;
}

// 生成时间线 HTML
function generateTimelineHTML(articles) {
    let html = '';
    articles.forEach((article, index) => {
        const delay = index % 6;
        const delayClass = delay > 0 ? ` reveal-d${delay}` : '';
        html += `            <a href="#" class="article-item reveal${delayClass}" onclick="showArticle('${article.id}'); return false;">
                <span class="article-dot"></span>
                <span class="article-date">${article.date}</span>
                <div class="article-content">
                    <h2 class="article-title">${article.title}</h2>
                    <p class="article-summary">${article.summary}</p>
                    <div class="article-tags">
                        ${article.tags.map(tag => `<span class="article-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </a>\n`;
    });
    return html;
}

// 生成详情页 HTML
function generateDetailHTML(articles) {
    let html = '';
    articles.forEach(article => {
        html += `        <article id="article-${article.id}" class="article-detail">
            <a href="#" class="back-link" onclick="goBack(); return false;" style="display:inline-flex; margin-bottom:24px;">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                返回行业洞察分析
            </a>
            <div class="detail-header">
                <p class="detail-date">${article.date}</p>
                <h1 class="detail-title">${article.title}</h1>
                <div class="article-tags">
                    ${article.tags.map(tag => `<span class="article-tag">${tag}</span>`).join('')}
                </div>
            </div>
            <div class="detail-content">
                <p>${article.summary}</p>
                ${article.body}
            </div>
        </article>\n\n`;
    });
    return html;
}

// 主函数
function main() {
    console.log('📖 读取所有文章...');
    const articles = readArticles();
    console.log(`✅ 找到 ${articles.length} 篇文章`);
    
    console.log('📝 读取现有 insights.html...');
    let html = fs.readFileSync(INSIGHTS_HTML, 'utf-8');
    
    console.log('🔄 生成新的时间线...');
    const timelineHtml = generateTimelineHTML(articles);
    
    console.log('🔄 生成新的详情页...');
    const detailsHtml = generateDetailHTML(articles);
    
    console.log('✏️ 更新文件...');
    
    // 替换时间线：用 indexOf 精确定位，避免正则问题
    const timelineMarkerStart = '<main class="article-timeline">';
    const timelineMarkerEnd = '</main>';
    const tStart = html.indexOf(timelineMarkerStart);
    const tEnd = html.indexOf(timelineMarkerEnd, tStart);
    
    if (tStart === -1 || tEnd === -1) {
        console.error('❌ 找不到时间线区域标记！');
        process.exit(1);
    }
    
    html = html.slice(0, tStart) + timelineMarkerStart + '\n' + timelineHtml + '        ' + timelineMarkerEnd + html.slice(tEnd + timelineMarkerEnd.length);
    
    // 替换详情区域：从 </main> 之后到 footer 之前
    const detailStart = html.indexOf(timelineMarkerEnd, tStart) + timelineMarkerEnd.length;
    const footerMarker = '        <footer>';
    const footerPos = html.indexOf(footerMarker, detailStart);
    
    if (footerPos === -1) {
        console.error('❌ 找不到 footer 标记！');
        process.exit(1);
    }
    
    html = html.slice(0, detailStart) + '\n\n' + detailsHtml + html.slice(footerPos);
    
    fs.writeFileSync(INSIGHTS_HTML + '.backup', fs.readFileSync(INSIGHTS_HTML));
    fs.writeFileSync(INSIGHTS_HTML, html);
    
    console.log('\n✅ 更新完成！');
    console.log('\n📋 文章列表（按时间倒序）：');
    articles.forEach((article, i) => {
        console.log(`${i + 1}. [${article.date}] ${article.title} | 标签：${article.tags.join(', ')}`);
    });
    console.log(`\n📍 总文章数：${articles.length} 篇`);
}

main();
