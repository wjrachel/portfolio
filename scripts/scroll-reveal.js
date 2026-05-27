// 滚动显示动画
const scrollReveal = {
    init() {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        
        document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scrollReveal.init());
} else {
    scrollReveal.init();
}
