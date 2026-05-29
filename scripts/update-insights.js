const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, '../AI行业观察');
const INSIGHTS_HTML = path.join(__dirname, '../insights.html');

function readAllArticles() {
    const articles = [];
    const months = fs.readdirSync(ARTICLES_DIR).filter(f => fs.statSync(path.join(ARTICLES_DIR, f)).isDirectory());
    
    months.forEach(month => {
        const monthDir = path.join(ARTICLES_DIR, month);
        const files = fs.readdirSync(monthDir).filter(f => f.endsWith('.md'));
        
        files.forEach(file => {
            const filePath = path.join(monthDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            
            const titleMatch = content.match(/^#\s+(.+)/);
            const title = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');
            
            const dateMatch = content.match(/\*\*日期\*\*[：:]\s*(\d{4}-\d{2}-\d{2})/);
            let date = '';
            if (dateMatch) {
                date = dateMatch[1];
            } else {
                const fileDateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
                date = fileDateMatch ? fileDateMatch[1] : month + '-01';
            }
            
            const tagMatch = content.match(/\*\*标签\*\*[：:]\s*(.+)/);
            const tags = tagMatch ? tagMatch[1].split(/[,，、]/).map(t => t.trim()).filter(t => t) : ['AI行业观察'];
            
            const summaryMatch = content.match(/文章摘要[：:]\s*([^\n]+)/);
            let summary = '';
            if (summaryMatch) {
                summary = summaryMatch[1].trim();
            } else {
                const cleanContent = content.replace(/^#[^\n]+\n/, '').replace(/\*\*[^\*]+\*\*[：:]\s*/g, '').trim();
                summary = cleanContent.slice(0, 150) + (cleanContent.length > 150 ? '...' : '');
            }
            
            let body = content.replace(/^#[^\n]+\n/, '');
            body = body.replace(/\*\*日期\*\*[：:][^\n]+\n/, '');
            body = body.replace(/\*\*标签\*\*[：:][^\n]+\n/, '');
            body = body.replace(/文章摘要[：:][^\n]+\n/, '');
            body = body.trim();
            
            body = body.replace(/^###\s+(.+)/gm, '<h3>$1</h3>')
                       .replace(/^##\s+(.+)/gm, '<h2>$1</h2>')
                       .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                       .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                       .replace(/^- \*\*([^*]+)\*\*[：:]\s*/gm, '<li><strong>$1</strong>：')
                       .replace(/^- \s*/gm, '<li>')
                       .replace(/\n\n/g, '</p>\n<p>');
            
            const id = file.replace('.md', '');
            
            articles.push({ id, title, date, summary, tags: tags.slice(0, 3), body });
        });
    });
    
    articles.sort((a, b) => new Date(b.date) - new Date(a.date));
    return articles;
}

function generateTimeline(articles) {
    let html = '';
    articles.forEach((article, index) => {
        const delay = index % 6;
        html += `            <a href="#" class="article-item reveal${delay > 0 ? ` reveal-d${delay}` : ''}" onclick="showArticle('${article.id}'); return false;">
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

function generateDetails(articles) {
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

function main() {
    console.log('📖 读取所有文章...');
    const articles = readAllArticles();
    console.log(`✅ 找到 ${articles.length} 篇文章`);
    
    console.log('📝 读取现有 insights.html...');
    let html = fs.readFileSync(INSIGHTS_HTML, 'utf-8');
    
    console.log('🔄 生成新的时间线...');
    const timelineHtml = generateTimeline(articles);
    
    console.log('🔄 生成新的详情页...');
    const detailsHtml = generateDetails(articles);
    
    console.log('✏️ 更新文件...');
    const newHtml = html.replace(
        /<main class="article-timeline">[\s\S]*?<\/main>/,
        `<main class="article-timeline">\n${timelineHtml}        </main>`
    ).replace(
        /<article id="article-"[^>]+class="article-detail">[\s\S]*?(?=\s*<footer>)/,
        detailsHtml
    );
    
    fs.writeFileSync(INSIGHTS_HTML + '.backup', fs.readFileSync(INSIGHTS_HTML));
    fs.writeFileSync(INSIGHTS_HTML, newHtml);
    
    console.log('\n✅ 更新完成！');
    console.log('\n📋 文章列表（按时间倒序）：');
    articles.forEach((article, i) => {
        console.log(`${i + 1}. [${article.date}] ${article.title}`);
    });
    console.log(`\n📍 总文章数：${articles.length} 篇`);
}

main();
