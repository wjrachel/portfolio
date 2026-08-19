// 安全工具：HTML 转义 + 富文本消毒
// 供 vibe.html / vibe-detail.html / vibe-edit.html 使用（需在引用之前加载）

// HTML 转义：用于纯文本字段（标题、摘要、日期、图片路径、id 等）
// 适用场景：插入到 HTML 的文本内容或属性值（data-*、src）时调用
function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 富文本消毒：保留安全标签结构，移除 script/iframe/事件处理器/危险协议
// 适用场景：Quill 编辑器产生的 content 富文本渲染前调用
function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(String(html == null ? '' : html), 'text/html');

    // 移除危险元素
    doc.querySelectorAll('script, iframe, object, embed, form, link, meta, style').forEach(el => el.remove());

    // 移除事件属性与危险协议链接
    doc.querySelectorAll('*').forEach(el => {
        [...el.attributes].forEach(attr => {
            const name = attr.name.toLowerCase();
            const val = attr.value.trim().toLowerCase();
            if (name.startsWith('on')) { el.removeAttribute(attr.name); return; }
            if ((name === 'href' || name === 'src') &&
                (val.startsWith('javascript:') || val.startsWith('data:text/html'))) {
                el.removeAttribute(attr.name);
            }
        });
    });

    return doc.body.innerHTML;
}
