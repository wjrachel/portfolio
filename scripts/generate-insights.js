const fs = require('fs');
const path = require('path');

// 文章目录
const ARTICLES_DIR = path.join(__dirname, '../AI行业观察/2026-05');
const INSIGHTS_HTML = path.join(__dirname, '../insights.html');

// 标签映射
const TAG_MAPPING = {
    '国产模型': ['国产模型', '调用量', '腾讯混元', 'DeepSeek'],
    '竞争格局': ['竞争格局', 'Anthropic', 'OpenAI', 'ChatGPT'],
    'Agentic AI': ['Agentic', 'Agent', 'Claude'],
    '大模型商业化': ['商业化', '付费', '收费'],
    '企业落地': ['企业', '落地'],
    '算力': ['算力', 'GPU', '芯片'],
    '监管合规': ['监管', '合规'],
    '开源生态': ['开源'],
    '金融AI': ['金融', '财务', '财税'],
    'SaaS': ['SaaS', 'GitLab'],
    '价格战': ['价格战', '降价']
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

// 提取摘要（取第一段或前200字）
function extractSummary(content) {
    // 找到事件或第一段
    const eventMatch = content.match(/\*\*事件\*\*[：:]\s*([^\n]+)/);
    if (eventMatch && eventMatch[1]) {
        return eventMatch[1].trim();
    }
    
    // 找到触发新闻
    const triggerMatch = content.match(/\*\*触发新闻\*\*[：:]\s*([^\n]+)/);
    if (triggerMatch && triggerMatch[1]) {
        return triggerMatch[1].trim();
    }
    
    // 否则取前200字
    const cleanContent = content.replace(/^#[^\n]+\n/, '').replace(/\*\*[^\*]+\*\*[：:]\s*/g, '').trim();
    return cleanContent.slice(0, 150) + (cleanContent.length > 150 ? '...' : '');
}

// 转换 Markdown 为 HTML（简单版本）
function markdownToHTML(markdown) {
    let html = markdown
        // 标题
        .replace(/^###\s+([^\n]+)/gm, '<h3>$1</h3>')
        .replace(/^##\s+([^\n]+)/gm, '<h2>$1</h2>')
        .replace(/^#\s+([^\n]+)/gm, '<h1>$1</h1>')
        // 粗体
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // 斜体
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // 列表
        .replace(/^- \*\*([^*]+)\*\*[：:]\s*/gm, '<li><strong>$1</strong>：')
        .replace(/^- \s*/gm, '<li>')
        // 段落
        .replace(/\n\n/g, '</p>\n<p>')
        // 分隔线
        .replace(/^---+$/gm, '<hr>')
        // 引用
        .replace(/^>\s*(.*)$/gm, '<blockquote>$1</blockquote>');
    
    // 处理表格
    html = html.replace(/\|([^\|]+)\|/g, (match) => {
        if (match.includes('---')) return '';
        return match;
    });
    
    return html;
}

// 读取所有文章
function readArticles() {
    const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));
    const articles = [];
    
    for (const file of files) {
        const filePath = path.join(ARTICLES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // 提取标题
        const titleMatch = content.match(/^#\s+([^\n]+)/);
        const title = titleMatch ? titleMatch[1] : '无标题';
        
        // 提取日期
        const dateMatch = content.match(/\*\*日期\*\*[：:]\s*(\d{4})年(\d{1,2})月(\d{1,2})日/);
        let date = '2026-05-01';
        if (dateMatch) {
            date = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}`;
        } else {
            // 从文件名提取
            const fileDateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
            if (fileDateMatch) date = fileDateMatch[1];
        }
        
        const summary = extractSummary(content);
        const tags = inferTags(content, title);
        
        // 转换正文（去掉标题和日期后的部分）
        let body = content.replace(/^#[^\n]+\n/, '');
        body = body.replace(/\*\*日期\*\*[：:][^\n]+\n/, '');
        body = body.replace(/\*\*事件\*\*[：:][^\n]+\n/, '');
        body = body.replace(/\*\*触发新闻\*\*[：:][^\n]+\n/, '');
        body = body.trim();
        
        // 转换为HTML
        const htmlBody = markdownToHTML(body);
        
        // 创建ID
        const id = file.replace('.md', '');
        
        articles.push({
            id,
            title,
            date,
            summary,
            tags,
            body: htmlBody,
            originalBody: body
        });
    }
    
    // 按日期倒序排列
    articles.sort((a, b) => new Date(b.date) - new Date(a.date));
    return articles;
}

// 生成时间线 HTML
function generateTimelineHTML(articles) {
    let html = '';
    articles.forEach((article, index) => {
        const delay = index % 6;
        html += `        <a href="#" class="article-item reveal reveal-d${delay}" onclick="showArticle('${article.id}'); return false;">
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
        </article>\n`;
    });
    return html;
}

// 主函数
function main() {
    console.log('📖 读取文章...');
    const articles = readArticles();
    console.log(`✅ 找到 ${articles.length} 篇文章`);
    
    console.log('📝 读取现有 insights.html...');
    let html = fs.readFileSync(INSIGHTS_HTML, 'utf-8');
    
    // 找到时间线区域并替换
    const timelineStart = html.indexOf('<main class="article-timeline">');
    const timelineEnd = html.indexOf('</main>', timelineStart);
    const newTimeline = generateTimelineHTML(articles);
    
    // 找到详情区域（在 </main> 之后）
    const detailStart = html.indexOf('</main>', timelineEnd) + 7;
    const detailEnd = html.indexOf('    <script>', detailStart);
    const newDetail = generateDetailHTML(articles);
    
    // 替换
    const newHtml = html.slice(0, timelineStart) + 
        '<main class="article-timeline">\n' + 
        newTimeline + 
        '        </main>\n\n' +
        newDetail + 
        html.slice(detailEnd);
    
    console.log('💾 保存文件...');
    fs.writeFileSync(INSIGHTS_HTML, newHtml);
    console.log('✅ 完成！');
    
    // 显示文章列表
    console.log('\n📋 文章列表:');
    articles.forEach((article, i) => {
        console.log(`${i + 1}. [${article.date}] ${article.title}`);
    });
}

main();
