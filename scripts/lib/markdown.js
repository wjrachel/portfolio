// 共享 Markdown → HTML 转换器
// 供 build-insights.js / build-cases.js 复用，保证两处渲染一致

// 将 Markdown 正文转换为 HTML
// 支持：表格 / 无序列表(-、+) / 有序列表(1、2. 数字前缀) / 标题 / 粗体 / 斜体 / 链接 / 引用 / 分隔线 / 段落
// 额外：剥离 HTML 注释，内联 HTML（如 <font>）原样保留
function markdownToHTML(markdown) {
    let md = String(markdown || '');

    // 0. 剥离 HTML 注释（如语雀导出的 OCR 图片注释）
    md = md.replace(/<!--[\s\S]*?-->/g, '');

    // 1. 解析表格（必须在其他替换之前）
    md = md.replace(
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

    // 2. 列表项转换（在粗体替换之前，因为 `- **key**：value` 中的 ** 需要保留给正则匹配）
    //    - 无序：`- ` 或 `+ ` 开头
    //    - 有序：`1、` / `1. ` / `1、` 数字前缀（ol 用 class 哨兵标记，稍后包裹为 <ol>）
    md = md
        .replace(/^[-+]\s+\*\*([^*]+)\*\*[：:]\s*/gm, '<li><strong>$1</strong>：')
        .replace(/^[-+]\s+/gm, '<li>')
        .replace(/^(\d+)[、.]\s*(.+)$/gm, '<li class="ol-item">$2');

    // 2.5 合并列表项之间的空行，使带空行分隔的连续 <li> 能正确包裹进同一个 <ul>/<ol>
    md = md.replace(/\n\s*\n(?=<li)/g, '\n');

    // 3. 包裹连续列表项为 <ul> 或 <ol>
    md = md.replace(
        /((?:<li[^>]*>.*\n?)+)/g,
        (listMatch) => {
            const isOl = listMatch.includes('class="ol-item"');
            const tag = isOl ? 'ol' : 'ul';
            return `<${tag}>\n` + listMatch.replace(/ class="ol-item"/g, '') + `</${tag}>\n`;
        }
    );

    // 4. 标题
    let html = md
        .replace(/^###\s+([^\n]+)/gm, '<h3>$1</h3>')
        .replace(/^##\s+([^\n]+)/gm, '<h2>$1</h2>')
        .replace(/^#\s+([^\n]+)/gm, '<h1>$1</h1>');

    // 5. 粗体/斜体（现在列表项中的 ** 已被替换为 <strong>，不会受影响）
    html = html
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>');

    // 6. 链接 [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // 7. 引用块
    html = html.replace(/^>\s*(.*)$/gm, '<blockquote>$1</blockquote>');

    // 8. 分隔线
    html = html.replace(/^---+$/gm, '<hr>');

    // 9. 段落处理：将连续的纯文本行包裹在 <p> 中
    let lines = html.split('\n');
    let result = [];
    let textBuffer = [];

    const isHTMLLine = (line) => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        // 只将块级 HTML 标签识别为非文本行，内联标签（strong/em/a/font）仍需包裹 <p>
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

module.exports = { markdownToHTML };
