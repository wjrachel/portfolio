#!/usr/bin/env python3
import os
import re
import shutil

ARTICLES_DIR = os.path.join(os.path.dirname(__file__), '../AI行业观察')
INSIGHTS_HTML = os.path.join(os.path.dirname(__file__), '../insights.html')

def read_all_articles():
    articles = []
    months = [m for m in os.listdir(ARTICLES_DIR) if os.path.isdir(os.path.join(ARTICLES_DIR, m))]
    
    for month in months:
        month_dir = os.path.join(ARTICLES_DIR, month)
        files = [f for f in os.listdir(month_dir) if f.endswith('.md')]
        
        for file in files:
            file_path = os.path.join(month_dir, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            title_match = re.match(r'^#\s+(.+)', content)
            title = title_match.group(1).strip() if title_match else file.replace('.md', '')
            
            date_match = re.search(r'\*\*日期\*\*[：:]\s*(\d{4}-\d{2}-\d{2})', content)
            if date_match:
                date = date_match.group(1)
            else:
                file_date_match = re.search(r'(\d{4}-\d{2}-\d{2})', file)
                date = file_date_match.group(1) if file_date_match else f"{month}-01"
            
            tag_match = re.search(r'\*\*标签\*\*[：:]\s*(.+)', content)
            tags = [t.strip() for t in re.split(r'[,，、]', tag_match.group(1)) if t.strip()] if tag_match else ['AI行业观察']
            
            summary_match = re.search(r'文章摘要[：:]\s*([^\n]+)', content)
            if summary_match:
                summary = summary_match.group(1).strip()
            else:
                clean_content = re.sub(r'^#[^\n]+\n', '', content)
                clean_content = re.sub(r'\*\*[^\*]+\*\*[：:]\s*', '', clean_content)
                summary = (clean_content.strip()[:150] + '...') if len(clean_content) > 150 else clean_content.strip()
            
            body = re.sub(r'^#[^\n]+\n', '', content)
            body = re.sub(r'\*\*日期\*\*[：:][^\n]+\n', '', body)
            body = re.sub(r'\*\*标签\*\*[：:][^\n]+\n', '', body)
            body = re.sub(r'文章摘要[：:][^\n]+\n', '', body)
            body = body.strip()
            
            body = re.sub(r'^###\s+(.+)', r'<h3>\1</h3>', body, flags=re.MULTILINE)
            body = re.sub(r'^##\s+(.+)', r'<h2>\1</h2>', body, flags=re.MULTILINE)
            body = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', body)
            body = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', body)
            body = re.sub(r'^- \*\*([^*]+)\*\*[：:]\s*', r'<li><strong>\1</strong>：', body, flags=re.MULTILINE)
            body = re.sub(r'^- \s*', r'<li>', body, flags=re.MULTILINE)
            body = body.replace('\n\n', '</p>\n<p>')
            
            article_id = file.replace('.md', '')
            
            articles.append({
                'id': article_id,
                'title': title,
                'date': date,
                'summary': summary,
                'tags': tags[:3],
                'body': body
            })
    
    articles.sort(key=lambda x: x['date'], reverse=True)
    return articles

def generate_timeline(articles):
    html = []
    for i, article in enumerate(articles):
        delay = i % 6
        delay_class = f' reveal-d{delay}' if delay > 0 else ''
        html.append(f'''            <a href="#" class="article-item reveal{delay_class}" onclick="showArticle('{article['id']}'); return false;">
                <span class="article-dot"></span>
                <span class="article-date">{article['date']}</span>
                <div class="article-content">
                    <h2 class="article-title">{article['title']}</h2>
                    <p class="article-summary">{article['summary']}</p>
                    <div class="article-tags">
                        {''.join(f'<span class="article-tag">{tag}</span>' for tag in article['tags'])}
                    </div>
                </div>
            </a>''')
    return '\n'.join(html)

def generate_details(articles):
    html = []
    for article in articles:
        html.append(f'''        <article id="article-{article['id']}" class="article-detail">
            <a href="#" class="back-link" onclick="goBack(); return false;" style="display:inline-flex; margin-bottom:24px;">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                返回行业洞察分析
            </a>
            <div class="detail-header">
                <p class="detail-date">{article['date']}</p>
                <h1 class="detail-title">{article['title']}</h1>
                <div class="article-tags">
                    {''.join(f'<span class="article-tag">{tag}</span>' for tag in article['tags'])}
                </div>
            </div>
            <div class="detail-content">
                <p>{article['summary']}</p>
                {article['body']}
            </div>
        </article>''')
    return '\n'.join(html)

def main():
    print('📖 读取所有文章...')
    articles = read_all_articles()
    print(f'✅ 找到 {len(articles)} 篇文章')
    
    print('📝 读取现有 insights.html...')
    with open(INSIGHTS_HTML, 'r', encoding='utf-8') as f:
        html = f.read()
    
    print('🔄 生成新的时间线...')
    timeline_html = generate_timeline(articles)
    
    print('🔄 生成新的详情页...')
    details_html = generate_details(articles)
    
    print('✏️ 更新文件...')
    html = re.sub(
        r'<main class="article-timeline">[\s\S]*?<\/main>',
        f'<main class="article-timeline">\n{timeline_html}\n        </main>',
        html
    )
    
    html = re.sub(
        r'<article id="article-"[^>]+class="article-detail">[\s\S]*?(?=\s*<footer>)',
        details_html,
        html
    )
    
    shutil.copy(INSIGHTS_HTML, INSIGHTS_HTML + '.backup')
    with open(INSIGHTS_HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print('\n✅ 更新完成！')
    print('\n📋 文章列表（按时间倒序）：')
    for i, article in enumerate(articles, 1):
        print(f'{i}. [{article["date"]}] {article["title"]}')
    print(f'\n📍 总文章数：{len(articles)} 篇')

if __name__ == '__main__':
    main()
