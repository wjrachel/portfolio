// 动态加载HTML组件
async function loadComponent(selector, file) {
    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        const target = document.querySelector(selector);
        if (target) {
            target.innerHTML = html;
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error loading component ${file}:`, error);
        return false;
    }
}

// 加载所有组件
async function loadAllComponents() {
    const components = [
        { selector: '#nav-placeholder', file: 'components/nav.html' },
    ];
    
    await Promise.all(
        components.map(c => loadComponent(c.selector, c.file))
    );
}

// 页面加载完成后加载组件
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllComponents);
} else {
    loadAllComponents();
}
