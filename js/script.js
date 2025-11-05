// Safari兼容性：在脚本最开始就设置滚动位置和禁用滚动恢复
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// 立即执行，不等待DOMContentLoaded
(function() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    if (document.body) {
        document.body.scrollTop = 0;
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    // Safari特别处理：确保滚动位置在顶部
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Safari兼容性：禁用滚动恢复
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    
    // 添加调试信息
    console.log('页面加载开始');
    
    const logo = document.getElementById('logoBlur');
    const PNG_SRC = 'assets/whiteLogo.png';                // ← 改成你的 PNG 路径

    if (!logo) return;

    let swapped = false;
    let contentShown = false; // 防止重复显示内容
    let logoStaticCreated = false; // 防止重复创建logo-static
    const onAnimEnd = (e) => {
    // 只接受自身的 logoDrop 动画
    if (swapped) return;
    if (e.target !== logo) return;
    if (e.animationName !== 'logoDrop') return;
    doSwap('animationend');
};

    // 动画结束触发一次
    logo.addEventListener('animationend', onAnimEnd, { once: true });

    // 兜底：2.5s 后若还没切换就强制切
    const fallback = setTimeout(() => {
    if (!swapped) doSwap('fallback');
}, 2500);



    // 兜底：如果动画没有正常触发，确保内容最终会显示
    setTimeout(() => {
    if (!contentShown) {
        console.log('兜底机制：强制显示页面内容');
        showPageContent();
    }
}, 800); // 提前到800ms，确保在logo动画一半时开始显示

    // 强制清理机制：确保dots和logo-blur不会永久存在
    setTimeout(() => {
    const dots = document.querySelectorAll('.logo-blur .dot');
    const logoBlur = document.getElementById('logoBlur');
    if (dots.length > 0 || logoBlur) {
        console.log('强制清理dots和logo-blur:', dots.length);
        dots.forEach(dot => dot.remove());
        if (logoBlur) {
            logoBlur.remove();
        }
    }
}, 3000); // 3秒后强制清理所有dots和logo-blur

    // 强制恢复滚动机制：确保页面一定会恢复滚动
    setTimeout(() => {
    if (!document.body.classList.contains('ready')) {
        console.log('强制恢复滚动：添加ready类');
        document.body.classList.add('ready');
        showPageContent();
    }
}, 2000); // 2秒后强制恢复滚动

    // 页面可见性变化时也清理dots和logo-blur
    document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('页面重新可见');
        const dots = document.querySelectorAll('.logo-blur .dot');
        const logoBlur = document.getElementById('logoBlur');
        if (dots.length > 0 || logoBlur) {
            console.log('页面重新可见，清理dots和logo-blur:', dots.length);
            dots.forEach(dot => dot.remove());
            if (logoBlur) {
                logoBlur.remove();
            }
        }
        
        // 确保页面恢复滚动
        if (!document.body.classList.contains('ready')) {
            console.log('页面重新可见时强制恢复滚动');
            document.body.classList.add('ready');
            showPageContent();
        }
        
        // 确保页面回到顶部
        window.scrollTo(0, 0);
    }
});

    // Safari兼容性：防止页面刷新时滚动位置变化
    window.addEventListener('beforeunload', () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    });

    // Safari兼容性：页面加载完成后确保在顶部
    window.addEventListener('load', () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    });

    // Safari兼容性：页面显示时（包括从后退按钮返回）确保在顶部
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            // 页面是从缓存中恢复的
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }
    });

    // 创建logo-static的函数
    async function createLogoStatic() {
        if (logoStaticCreated) return;
        logoStaticCreated = true;
        
        const rect = logo.getBoundingClientRect();
        
        // 预加载 PNG 并解码（确保能显示）
        const img = new Image();
        img.src = PNG_SRC;
        img.alt = '';
        img.className = 'logo-static';
        img.style.width = rect.width*1.25 + 'px';   // 与当前两圆视觉宽一致
        // 设置PNG为固定定位，在header中居中
        img.style.position = 'fixed';
        // 根据屏幕尺寸设置top值
        const isMobile = window.innerWidth <= 600;
        img.style.top = isMobile ? '32px' : '36px'; // 移动端header高度64px，桌面端72px
        img.style.left = '50%';
        img.style.transform = 'translate(calc(-50%-3px), -50%)'; // CSS会覆盖这个，所以这里保持默认
        img.style.zIndex = '1001'; // 确保在header之上
        img.style.opacity = '0'; // 初始透明
        img.style.transition = 'opacity 0.5s ease'; // 添加淡入动画
        
        try { 
            if (img.decode) await img.decode(); 
        } catch(e){ 
            /* 某些浏览器不支持 decode */ 
        }

        // 插入到页面
        document.body.appendChild(img);
        
        // 立即开始淡入，与dots淡出同时进行
        setTimeout(() => {
            img.style.opacity = '1';
        }, 0);
        
        // 添加窗口大小变化时的响应式处理
        const updateLogoPosition = () => {
            const isMobile = window.innerWidth <= 600;
            img.style.top = isMobile ? '32px' : '36px';
        };
        
        window.addEventListener('resize', updateLogoPosition);
    }

    async function doSwap(reason){
    if (swapped) return;           // 双重保险
    swapped = true;
    clearTimeout(fallback);
    logo.removeEventListener('animationend', onAnimEnd);

    // 1) 冻结容器尺寸，避免圆被移除时宽度塌陷导致不居中
    const rect = logo.getBoundingClientRect();
    logo.style.width  = rect.width + 'px';
    logo.style.height = rect.height + 'px';
    logo.style.position = logo.style.position || 'absolute'; // 你本来就是 absolute，这里只是兜底

    // 2) 如果logo-static还没创建，现在创建它
    if (!logoStaticCreated) {
        await createLogoStatic();
        
        // 同时开始淡出dots
        const dots = [...logo.querySelectorAll('.dot')];
        dots.forEach(d => d.classList.add('fade-out'));
        
        // 延迟清理dots，让淡出时间更长，与logo-static重叠
        setTimeout(() => {
            dots.forEach(d => {
                if (d.parentNode) {
                    d.remove();
                }
            });
        }, 1200); // 延长淡出时间，与logo-static有更多重叠
    }

    // 3) 清理logo-blur容器
    setTimeout(() => {
        if (!logo.classList.contains('is-static')) {
            logo.classList.add('is-static');
        }
        // 如果logo-blur还存在，也清理掉
        if (logo && logo.parentNode) {
            logo.remove();
        }
    }, 500);

    // 在logo动画进行到一半时开始显示内容和logo-static
    setTimeout(async () => {
    if (!contentShown) {
        showPageContent();
    }
    
    // 提前创建logo-static，在drop动画还没完全完成时出现
    if (!swapped && !logoStaticCreated) {
        await createLogoStatic();
        
        // 同时开始淡出dots
        const dots = [...logo.querySelectorAll('.dot')];
        dots.forEach(d => d.classList.add('fade-out'));
        
        // 延迟清理dots，让淡出时间更长，与logo-static重叠
        setTimeout(() => {
            dots.forEach(d => {
                if (d.parentNode) {
                    d.remove();
                }
            });
        }, 1200); // 延长淡出时间，与logo-static有更多重叠
    }
}, 600); // logo动画1200ms的一半，让渐入动画与logo动画重叠
}

    // 显示页面内容的函数
    function showPageContent() {
    if (contentShown) return; // 防止重复调用
    contentShown = true;
    
    console.log('开始显示页面内容...');
    
    const header = document.querySelector('.site-header');
    const heroCopy = document.querySelector('.hero-copy');
    const scrollIndicator = document.querySelector('.scroll-indicator');

    console.log('页面元素状态:', { header, heroCopy, scrollIndicator });

    // 添加show类来触发淡入动画
    if (header) {
    header.classList.add('show');
    console.log('Header显示动画已触发');
}
    if (heroCopy) {
    heroCopy.classList.add('show');
    console.log('Hero内容显示动画已触发');
}
    if (scrollIndicator) {
    scrollIndicator.classList.add('show');
    console.log('滚动指示器显示动画已触发');
}

    // 添加ready类，恢复正常滚动
    document.body.classList.add('ready');
    console.log('Ready类已添加，页面滚动已恢复');
    
    // Safari兼容性：确保页面在顶部
    setTimeout(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        console.log('页面已滚动到顶部');
    }, 0);
}

    // 可手动在控制台调用 window.forceSwap() 验证
    window.forceSwap = () => doSwap('manual');
    
    // 可手动在控制台调用 window.forceScroll() 强制恢复滚动
    window.forceScroll = () => {
        console.log('手动强制恢复滚动');
        document.body.classList.add('ready');
        showPageContent();
        window.scrollTo(0, 0);
    };
});

    // 滚动到情绪记录页面的函数
    function scrollToMoodSection() {
    document.getElementById('step-section').scrollIntoView({
        behavior: 'smooth'
    });
}

    // Typing动画效果
    function startTypingAnimation() {
    const typingText = document.getElementById('typingText');
    const submitButton = document.querySelector('.submit-mood-button');
    const inputArea = document.querySelector('.input-area');
    const texts = [
    '今天心情有点复杂...',
    '工作压力让我感到疲惫',
    '但看到夕阳还是很美',
    '想要好好休息一下',
    '明天会更好的',
    '内心充满了希望'
    ];

    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let isClickable = false; // 标记是否可以点击

    function typeText() {
    const currentText = texts[textIndex];

    if (isDeleting) {
    // 删除文字
    typingText.textContent = currentText.substring(0, charIndex - 1);
    charIndex--;

    // 开始删除时，移除hover效果
    if (charIndex === currentText.length - 1) {
    submitButton.classList.remove('typing-complete');
}
} else {
    // 添加文字
    typingText.textContent = currentText.substring(0, charIndex + 1);
    charIndex++;
}

    let typeSpeed = isDeleting ? 100 : 180; // 删除比输入快

    if (!isDeleting && charIndex === currentText.length) {
    // 文字输入完成，显示hover效果，等待2秒后开始删除
    submitButton.classList.add('typing-complete');
    isClickable = true; // 文字输入完成后可以点击
    typeSpeed = 3000;
    isDeleting = true;
} else if (isDeleting && charIndex === 0) {
    // 文字删除完成，切换到下一个文本
    isDeleting = false;
    isClickable = false; // 删除过程中不可点击
    textIndex = (textIndex + 1) % texts.length;
    typeSpeed = 1000;
}

    setTimeout(typeText, typeSpeed);
}

    // 点击事件处理
    function handleInputAreaClick() {
    if (!isClickable) return;
    
    // 设置对应的图片为主图
    if (window.setMainSlideByTextIndex) {
        window.setMainSlideByTextIndex(textIndex);
    }
    
    // 跳转到下一屏（图片滑动区域）
    const imageSliderSection = document.getElementById('image-slider');
    if (imageSliderSection) {
        imageSliderSection.scrollIntoView({
            behavior: 'smooth'
        });
    }
    
    // 添加点击效果
    inputArea.style.transform = 'scale(0.95)';
    setTimeout(() => {
        inputArea.style.transform = 'scale(1)';
    }, 150);
    }
    
    // 添加点击事件监听器
    if (inputArea) {
        inputArea.addEventListener('click', handleInputAreaClick);
        inputArea.style.cursor = 'pointer';
    }

    // 延迟2秒后开始typing动画
    setTimeout(typeText, 2000);
}

    // 页面加载完成后启动typing动画
    document.addEventListener('DOMContentLoaded', () => {
    startTypingAnimation();
    initImageSlider();
});


    function initImageSlider() {
    const slides = document.querySelectorAll('.slide');
    let currentIndex = 0;
    
    // 文本到图片的映射关系（6句话对应6张图）
    const textToImageMapping = {
        0: 0, // '今天心情有点复杂...' -> slide1.jpg
        1: 1, // '工作压力让我感到疲惫' -> slide2.jpg
        2: 2, // '但看到夕阳还是很美' -> slide3.jpg
        3: 3, // '想要好好休息一下' -> slide4.jpg
        4: 4, // '明天会更好的' -> slide5.jpg
        5: 5  // '内心充满了希望' -> slide6.jpg
    };

    function getMetrics() {
    // 用当前主图宽度（或任意一张的宽度）作为基准
    const sample = document.querySelector('.main-slide') || document.querySelector('.slide');
    const w = sample ? sample.offsetWidth : 200;   // 容错
    return {
    SLOT: w * 0.9,   // 每个卡槽≈主图宽度的 0.9 倍
    GAP:  w * 0.25,  // 中心到第一槽≈主图宽度的 0.25 倍
};
}

    function signedOffset(index, n) {
    let d = (index - currentIndex) % n;
    if (d < 0) d += n;
    if (d > Math.floor(n / 2)) d -= n;
    return d; // 右为正、左为负：..., -2, -1, 0, 1, 2, ...
}

    function applyLayout() {
    const { SLOT, GAP } = getMetrics();
    const n = slides.length;

    slides.forEach((slide, index) => {
    slide.classList.remove('main-slide', 'medium-slide', 'small-slide', 'active');
    const off = signedOffset(index, n);

    if (off === 0) {
    slide.classList.add('main-slide', 'active');
    slide.style.left = '50%';
    slide.style.top = '50%';
    slide.style.transform = 'translate(-50%, -50%)';
    slide.style.opacity = '1';
} else if (Math.abs(off) === 1) {
    // 左右第一张图片使用 medium-slide
    slide.classList.add('medium-slide');
    const dist = Math.abs(off) * SLOT + GAP;
    const sign = off > 0 ? '+' : '-';
    slide.style.left = `calc(50% ${sign} ${dist}px)`;
    slide.style.top = '50%';
    slide.style.transform = 'translate(-50%, -50%)';
    slide.style.opacity = '0.85';
} else {
    // 其他图片使用 small-slide
    slide.classList.add('small-slide');
    const dist = Math.abs(off) * SLOT + GAP;
    const sign = off > 0 ? '+' : '-';
    slide.style.left = `calc(50% ${sign} ${dist}px)`;
    slide.style.top = '50%';
    slide.style.transform = 'translate(-50%, -50%)';
    slide.style.opacity = Math.abs(off) <= 2 ? '0.7' : '0';
}
});
}

    function nextSlide() {
    currentIndex = (currentIndex + 1) % slides.length;
    applyLayout();
    }
    
    // 设置特定图片为主图
    function setMainSlide(imageIndex) {
    if (imageIndex >= 0 && imageIndex < slides.length) {
        currentIndex = imageIndex;
        applyLayout();
    }
    }
    
    // 根据文本索引设置对应的图片为主图
    function setMainSlideByTextIndex(textIndex) {
    const imageIndex = textToImageMapping[textIndex];
    if (imageIndex !== undefined) {
        setMainSlide(imageIndex);
    }
    }

    applyLayout();
    const timer = setInterval(nextSlide, 3000);

    // 关键：窗口尺寸变化时重算，保证 3:4 + 间距都自适应
    window.addEventListener('resize', applyLayout);
    
    // 暴露函数到全局，供其他模块使用
    window.setMainSlideByTextIndex = setMainSlideByTextIndex;
}

    /* ============== 页面元素浮现动画 ============== */
    function initFadeInAnimations() {
        // 创建 Intersection Observer 来检测元素进入视口
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('show');
                    // 一旦显示就不再观察，避免重复触发
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1, // 当元素10%可见时触发
            rootMargin: '0px 0px -50px 0px' // 提前50px触发
        });

        // 观察所有需要动画的元素
        const fadeElements = document.querySelectorAll('.fade-in-element');
        fadeElements.forEach(element => {
            observer.observe(element);
        });
    }

    /* ============== 配置 ============== */
    const TOTAL_IMAGES = 16;                 // 一共有多少张图
    const CORNER_IMAGES = 0;                 // 角落补充图片数量
    const IMG_PREFIX   = 'assets/image';     // 路径前缀（不含编号和后缀）
    const IMG_EXT      = '.webp';             // 后缀名
    const DEBUG_LAYOUT = false;              // 打开后在控制台打印布局参数
    
    // 手机端卡片数量配置
    const MOBILE_MAX_CARDS = 12;             // 手机端最大卡片数量
    const DESKTOP_MAX_CARDS = 16;            // 桌面端最大卡片数量

    /* ============== 生成 .card ============== */
    function populateScatterImagesFixed(total, {
    prefix = IMG_PREFIX,
    ext = IMG_EXT,
    start = 1
} = {}) {
    const stage = document.getElementById('scatterStage');
    if (!stage) return;

    stage.innerHTML = '';
    const frag = document.createDocumentFragment();

    // 根据屏幕尺寸确定实际使用的卡片数量
    const isMobile = window.innerWidth <= 680;
    const actualTotal = isMobile ? Math.min(total, MOBILE_MAX_CARDS) : Math.min(total, DESKTOP_MAX_CARDS);
    
    // 如果是手机端，随机选择图片
    let imageIndices = [];
    if (isMobile) {
        // 生成随机索引数组
        const allIndices = Array.from({length: total}, (_, i) => i + start);
        imageIndices = allIndices.sort(() => Math.random() - 0.5).slice(0, actualTotal);
    } else {
        // 桌面端按顺序使用
        imageIndices = Array.from({length: actualTotal}, (_, i) => i + start);
    }

    // 生成常规图片
    for (let i = 0; i < actualTotal; i++) {
    const card = document.createElement('div');
    card.className = 'card';
    const img = document.createElement('img');
    img.src = `${prefix}${imageIndices[i]}${ext}`;
    img.alt = `image${imageIndices[i]}`;
    img.loading = 'lazy';
    img.draggable = false;
    card.appendChild(img);
    frag.appendChild(card);
}

    // 生成角落补充图片（使用最后2张图片）
    for (let i = 0; i < CORNER_IMAGES; i++) {
    const card = document.createElement('div');
    card.className = 'card corner-card';
    const img = document.createElement('img');
    img.src = `${prefix}${total + i + 1}${ext}`;  // 修正：应该是 total + i + 1
    img.alt = `corner${i + 1}`;
    img.loading = 'lazy';
    img.draggable = false;
    card.appendChild(img);
    frag.appendChild(card);
}

    stage.appendChild(frag);
}

    /* ============== 手机端卡片飘动动画 ============== */
    function initMobileCardFloating() {
        const cards = Array.from(document.querySelectorAll('.card'));
        const isMobile = window.innerWidth <= 680;
        
        // 只在手机端启用飘动动画
        if (!isMobile) return;
        
        // 清除之前的动画
        cards.forEach(card => {
            if (card._floatAnimation) {
                cancelAnimationFrame(card._floatAnimation);
            }
        });
        
        cards.forEach((card, index) => {
            // 为每个卡片设置不同的飘动参数
            const floatConfig = {
                amplitude: 6, // 手机端飘动幅度
                speed: 0.3 + (index % 3) * 0.15, // 飘动速度
                phase: (index * 0.8) % (Math.PI * 2), // 相位偏移
                direction: index % 2 === 0 ? 1 : -1 // 飘动方向
            };
            
            // 创建飘动动画
            function floatAnimation() {
                const time = Date.now() * 0.001; // 转换为秒
                const offsetX = Math.sin(time * floatConfig.speed + floatConfig.phase) * floatConfig.amplitude * floatConfig.direction;
                const offsetY = Math.cos(time * floatConfig.speed * 0.8 + floatConfig.phase) * floatConfig.amplitude * 0.7;
                
                // 获取当前的基础变换（去除之前的飘动偏移）
                let currentTransform = card.style.transform || 'translate(-50%, -50%) scale(1)';
                
                // 移除之前的飘动偏移
                currentTransform = currentTransform.replace(/translate\([^)]*\)/g, '');
                
                // 添加新的飘动偏移
                card.style.transform = currentTransform + ` translate(${offsetX}px, ${offsetY}px)`;
                
                card._floatAnimation = requestAnimationFrame(floatAnimation);
            }
            
            // 开始飘动动画
            floatAnimation();
        });
    }

    /* ============== 手机端自动放大动画 ============== */
    function initMobileAutoScale() {
        const stage = document.getElementById('scatterStage');
        const cards = Array.from(stage.querySelectorAll('.card'));
        const isMobile = window.innerWidth <= 680;
        
        if (!isMobile) return;
        
        // 清除之前的定时器
        if (stage._autoScaleTimer) {
            clearTimeout(stage._autoScaleTimer);
        }
        
        let currentIndex = 0;
        const scaleDuration = 2500; // 每个卡片放大持续时间
        const pauseDuration = 1500; // 暂停时间
        
        function autoScaleAnimation() {
            if (cards.length === 0) return;
            
            // 重置所有卡片
            cards.forEach(card => {
                card.classList.remove('is-top');
                // 只移除缩放，保留飘动偏移
                let currentTransform = card.style.transform || 'translate(-50%, -50%) scale(1)';
                currentTransform = currentTransform.replace(/scale\([^)]*\)/g, 'scale(1)');
                card.style.transform = currentTransform;
                card.style.filter = 'brightness(1)';
            });
            
            // 放大当前卡片
            const currentCard = cards[currentIndex];
            if (currentCard) {
                currentCard.classList.add('is-top');
                // 只更新缩放，保留飘动偏移
                let currentTransform = currentCard.style.transform || 'translate(-50%, -50%) scale(1)';
                currentTransform = currentTransform.replace(/scale\([^)]*\)/g, 'scale(1.5)');
                currentCard.style.transform = currentTransform;
                currentCard.style.filter = 'brightness(1.1)';
            }
            
            // 移动到下一个卡片
            currentIndex = (currentIndex + 1) % cards.length;
            
            // 设置下次动画
            stage._autoScaleTimer = setTimeout(autoScaleAnimation, scaleDuration + pauseDuration);
        }
        
        // 延迟开始，让页面先加载完成
        stage._autoScaleTimer = setTimeout(autoScaleAnimation, 3000);
    }


    /* ============== 初始化斜网格 ============== */
    function initScatter() {
    const stage = document.getElementById('scatterStage');
    let cards = Array.from(stage.querySelectorAll('.card'));

    /* —— 响应式：列数 / 边距 / 倾斜角 / 密度 / 交错 —— */
    function gridConfig() {
    const w = stage.clientWidth;

    if (w < 520) {
    return {
    cols: 2,           // 手机端减少列数
    mx: 5, my: 8,      // 增加边距
    angleDeg: 0,       // 手机端不使用倾斜
    suK: 1.8,         // 增加间距
    svK: 1.8,         // 增加间距
    stagger: false,    // 手机端不使用交错
    useRandomLayout: true  // 手机端使用随机布局
};
}
    if (w < 920) {
    return {
    cols: 3,           // 中等屏幕使用3列
    mx: 3, my: 6,
    angleDeg: -1,
    suK: 2.2,
    svK: 2.2,
    stagger: true,
    useRandomLayout: false
};
}
    return {
    cols: 4,
    mx: 0, my: 0,
    angleDeg: 0,
    suK: 3,
    svK: 3,
    stagger: true,
    useRandomLayout: false
};
}

    /* 悬停放大逻辑 */
    const radius = () =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--radius')) || 200;
    const hoverBoostVar = () =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hover-boost')) || 0.5;
    function maxScale() { return 1 + hoverBoostVar(); }

    function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

    function applyScaleFrom(targetCard) {
    const c0 = centerOf(targetCard);
    const R = radius();
    const A = hoverBoostVar();

    cards.forEach(c => c.classList.remove('is-top'));
    targetCard.classList.add('is-top');

    cards.forEach(card => {
    const c1 = centerOf(card);
    const d  = Math.hypot(c1.x - c0.x, c1.y - c0.y);
    const w  = Math.max(0, 1 - d / R);
    const s  = 1 + A * w;
    card.style.transform = `translate(-50%, -50%) scale(${s.toFixed(3)})`;
    card.style.filter = `brightness(${(0.95 + 0.1 * w).toFixed(3)})`;
});
}

    function resetScale() {
    cards.forEach(card => {
    card.style.transform = 'translate(-50%, -50%) scale(1)';
    card.style.filter = 'brightness(1)';
    card.classList.remove('is-top');
    });
    }

    /* —— 手机端随机布局算法 —— */
    function layoutRandom() {
    const { width: stageW, height: stageH } = stage.getBoundingClientRect();
    const n = cards.length;
    if (n === 0) return;

    // 获取卡片尺寸
    const sample = cards[0]?.getBoundingClientRect();
    const cardW = sample?.width || 80;
    const cardH = sample?.height || 107;

    // 设置安全边距
    const marginX = cardW * 0.8;
    const marginY = cardH * 0.8;
    const usableW = stageW - marginX * 2;
    const usableH = stageH - marginY * 2;

    // 使用Poisson disk sampling算法生成更均匀的随机分布
    const positions = [];
    const minDistance = Math.max(cardW, cardH) * 1.2; // 增加最小距离
    const cellSize = minDistance / Math.sqrt(2);
    const gridCols = Math.floor(usableW / cellSize);
    const gridRows = Math.floor(usableH / cellSize);
    const grid = Array(gridCols * gridRows).fill(null);
    
    // 候选点列表
    const activeList = [];
    
    // 添加第一个随机点
    const firstX = marginX + Math.random() * usableW;
    const firstY = marginY + Math.random() * usableH;
    positions.push({ x: firstX, y: firstY });
    activeList.push({ x: firstX, y: firstY });
    
    const gridX = Math.floor((firstX - marginX) / cellSize);
    const gridY = Math.floor((firstY - marginY) / cellSize);
    grid[gridY * gridCols + gridX] = { x: firstX, y: firstY };

    // 生成其他点
    while (activeList.length > 0 && positions.length < n) {
        const randomIndex = Math.floor(Math.random() * activeList.length);
        const point = activeList[randomIndex];
        let found = false;

        // 尝试生成新点
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const distance = minDistance + Math.random() * minDistance;
            const newX = point.x + Math.cos(angle) * distance;
            const newY = point.y + Math.sin(angle) * distance;

            // 检查边界
            if (newX < marginX || newX >= stageW - marginX || 
                newY < marginY || newY >= stageH - marginY) {
                continue;
            }

            // 检查网格
            const newGridX = Math.floor((newX - marginX) / cellSize);
            const newGridY = Math.floor((newY - marginY) / cellSize);
            
            if (newGridX < 0 || newGridX >= gridCols || 
                newGridY < 0 || newGridY >= gridRows) {
                continue;
            }

            // 检查是否与现有点太近
            let valid = true;
            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                    const checkX = newGridX + dx;
                    const checkY = newGridY + dy;
                    if (checkX >= 0 && checkX < gridCols && 
                        checkY >= 0 && checkY < gridRows) {
                        const existing = grid[checkY * gridCols + checkX];
                        if (existing) {
                            const dist = Math.sqrt((newX - existing.x) ** 2 + (newY - existing.y) ** 2);
                            if (dist < minDistance) {
                                valid = false;
                                break;
                            }
                        }
                    }
                }
                if (!valid) break;
            }

            if (valid) {
                positions.push({ x: newX, y: newY });
                activeList.push({ x: newX, y: newY });
                grid[newGridY * gridCols + newGridX] = { x: newX, y: newY };
                found = true;
                break;
            }
        }

        if (!found) {
            activeList.splice(randomIndex, 1);
        }
    }

    // 如果生成的点不够，用简单随机方法补充
    while (positions.length < n) {
        let attempts = 0;
        let x, y;
        
        do {
            x = marginX + Math.random() * usableW;
            y = marginY + Math.random() * usableH;
            attempts++;
        } while (attempts < 50 && positions.some(pos => {
            const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
            return distance < minDistance * 0.8;
        }));

        positions.push({ x, y });
    }

    // 应用位置到卡片
    for (let i = 0; i < n; i++) {
        const card = cards[i];
        const pos = positions[i];
        card.style.left = (pos.x / stageW) * 100 + '%';
        card.style.top = (pos.y / stageH) * 100 + '%';
        if (!card.classList.contains('is-top')) {
            card.style.transform = 'translate(-50%, -50%) scale(1)';
            card.style.filter = 'brightness(1)';
        }
    }
    }

    /* —— 核心布局：斜网格均匀铺满，含保护 —— */
    function layout() {
    // 重新抓一次卡片（图片插入/懒加载后）
    cards = Array.from(stage.querySelectorAll('.card'));
    const n = cards.length;
    if (n === 0) return;

    const { cols, mx, my, angleDeg, suK, svK, stagger, useRandomLayout } = gridConfig();
    
    // 手机端使用随机布局
    if (useRandomLayout) {
        layoutRandom();
        return;
    }

    // 舞台尺寸
    const { width: stageW, height: stageH } = stage.getBoundingClientRect();
    const cx = stageW / 2, cy = stageH / 2;

    // 卡片尺寸（取第一张）
    const sample = cards[0]?.getBoundingClientRect();
    const cardW = sample?.width  || 160;
    const cardH = sample?.height || 213;

    // 可用矩形（扣掉边距）
    const usableW = stageW * (100 - mx * 2) / 100;
    const usableH = stageH * (100 - my * 2) / 100;
    const startX  = (stageW - usableW) / 2;
    const startY  = (stageH - usableH) / 2;

    // 行数 & 最后一行个数
    const rows      = Math.ceil(n / cols);
    const lastCount = n - cols * (rows - 1) || cols;

    // 角度与坐标变换
    const theta = angleDeg * Math.PI / 180;
    const cosT = Math.cos(theta), sinT = Math.sin(theta);
    const uvToXY = (u, v) => {
    // 添加随机偏移让布局更散乱
    const randomOffsetX = (Math.random() - 0.5) * 100-50; // -30 到 +30 的随机偏移
    const randomOffsetY = (Math.random() - 0.5) * 80; // -20 到 +20 的随机偏移
    
    return {
    x: cx + u * cosT - v * sinT + randomOffsetX,
    y: cy + u * sinT + v * cosT + randomOffsetY
    };
    };

    // ===== 安全边界（考虑悬停放大） =====
    const hoverBoostVar = () =>
    parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue('--hover-boost')) || 0.5;

    // 估算单元格尺寸，限制最大放大倍数，避免边缘被夹没
    const estRows = rows;
    const cellW   = Math.max(1, usableW / Math.max(1, cols));
    const cellH   = Math.max(1, usableH / Math.max(1, estRows));
    const maxBoostByCell = Math.max(
    0,
    Math.min(cellW / Math.max(1, cardW) - 1, cellH / Math.max(1, cardH) - 1)
    );
    const boostUsed = Math.min(hoverBoostVar(), maxBoostByCell);
    const s = 1 + boostUsed;

    const safeHalfW = (cardW * s) / 2;
    const safeHalfH = (cardH * s) / 2;

    // 目标可用尺寸（扣掉安全边界）
    const usableW2 = Math.max(1, usableW - 2 * safeHalfW);
    const usableH2 = Math.max(1, usableH - 2 * safeHalfH);

    // ===== 解线性方程，分别拟合 su/sv（让旋转后宽/高都贴合可用区）=====
    // 以“满行cols、满行rows”的半宽/半高先解步距
    const halfCols = (cols - 1) / 2;
    const halfRows = (rows - 1) / 2;

    // W = a*su + b*sv, H = c*su + d*sv
    const a = 2 * halfCols * cosT;
    const b = 2 * halfRows * sinT;
    const c = 2 * halfCols * sinT;
    const d = 2 * halfRows * cosT;

    let suSol, svSol;
    const det = a * d - b * c;

    if (Math.abs(det) > 1e-6) {
    suSol = (usableW2 * d - b * usableH2) / det;
    svSol = (a * usableH2 - usableW2 * c) / det;
    } else {
    // 退化角度时，回退到等比拟合
    const su0 = cardW * suK;
    const sv0 = cardH * svK;
    const U = halfCols * su0, V = halfRows * sv0;
    const boxW0 = 2 * (U * cosT + V * sinT);
    const boxH0 = 2 * (U * sinT + V * cosT);
    const fitX = usableW2 / Math.max(1, boxW0);
    const fitY = usableH2 / Math.max(1, boxH0);
    const fit  = (fitX > 0 && fitY > 0) ? Math.min(fitX, fitY) : 0.01;
    suSol = su0 * fit;
    svSol = sv0 * fit;
    }

    // ===== 步距保护：按“投影尺寸 + 余量”避免初始交叠（B 的一部分）=====
    const cosA = Math.abs(Math.cos(theta));
    const sinA = Math.abs(Math.sin(theta));
    const projU = cardW * cosA + cardH * sinA; // 卡片沿斜轴的占用
    const projV = cardW * sinA + cardH * cosA; // 卡片沿法向的占用
    const PAD = 0.12; // 初始缝隙比例（10%~18% 自行微调）

    const suMin = projU * (1 + PAD);
    const svMin = projV * (1 + PAD);
    const suMax = usableW2;
    const svMax = usableH2;

    let su = Math.min(Math.max(suSol, suMin), suMax);
    let sv = Math.min(Math.max(svSol, svMin), svMax);

    // （C）整体留一点余量，避免刚好贴满后被硬夹
    su *= 0.985;
    sv *= 0.985;

    // 轻微回拉到期望比例（保持 suK:svK 的视觉关系）
    const ratioTarget = (cardW * suK) / Math.max(1, cardH * svK);
    const ratioNow    = su / Math.max(1, sv);
    su *= (ratioTarget / Math.max(1e-6, ratioNow)) ** 0.12;

    // ===== 软边界参数（B 的主体）=====
    const innerPadX = projU * 0.55; // 0.4~0.7 可调
    const innerPadY = projV * 0.55;

    const minX = startX + safeHalfW + innerPadX;
    const maxX = startX + usableW - safeHalfW - innerPadX;
    const minY = startY + safeHalfH + innerPadY;
    const maxY = startY + usableH - safeHalfH - innerPadY;

    // ===== 生成点位（A：逐行列数，最后一行只放剩余并居中）=====
    let idx = 0;
    const regularCards = n - CORNER_IMAGES; // 常规卡片数量

    for (let r = 0; r < rows; r++) {
    const colCount    = (r === rows - 1) ? lastCount : cols;
    const halfColsRow = (colCount - 1) / 2;
    const rowOffsetU  = stagger && (r % 2) ? su * 0.5 : 0;

    for (let c = 0; c < colCount; c++) {
    if (idx >= regularCards) break;

    const u = (c - halfColsRow) * su + rowOffsetU;
    const v = (r - (rows - 1) / 2) * sv;

    let { x, y } = uvToXY(u, v);

    // 软边界回弹（而非硬 clamp 到极值）
    x = (x < minX) ? (minX + 0.5 * (x - minX)) :
    (x > maxX) ? (maxX + 0.5 * (x - maxX)) : x;
    y = (y < minY) ? (minY + 0.5 * (y - minY)) :
    (y > maxY) ? (maxY + 0.5 * (y - maxY)) : y;

    const card = cards[idx++];
    card.style.left = (x / stageW) * 100 + '%';
    card.style.top  = (y / stageH) * 100 + '%';
    if (!card.classList.contains('is-top')) {
    card.style.transform = 'translate(-50%, -50%) scale(1)';
    card.style.filter = 'brightness(1)';
    }
    }
    }

    // ===== 添加角落补充卡片 =====
    if (idx < cards.length) {
    // 左下角卡片
    if (idx < cards.length) {
    const cornerCard1 = cards[idx++];
    const cornerX1 = startX + safeHalfW + innerPadX * 0.3; // 更靠近左下角
    const cornerY1 = startY + usableH - safeHalfH - innerPadY * 0.3;
    cornerCard1.style.left = (cornerX1 / stageW) * 100 + '%';
    cornerCard1.style.top = (cornerY1 / stageH) * 100 + '%';
    if (!cornerCard1.classList.contains('is-top')) {
    cornerCard1.style.transform = 'translate(-50%, -50%) scale(1)';
    cornerCard1.style.filter = 'brightness(1)';
    }
    }

    // 右上角卡片
    if (idx < cards.length) {
    const cornerCard2 = cards[idx++];
    const cornerX2 = startX + usableW - safeHalfW - innerPadX * 0.3; // 更靠近右上角
    const cornerY2 = startY + safeHalfH + innerPadY * 0.3;
    cornerCard2.style.left = (cornerX2 / stageW) * 100 + '%';
    cornerCard2.style.top = (cornerY2 / stageH) * 100 + '%';
    if (!cornerCard2.classList.contains('is-top')) {
    cornerCard2.style.transform = 'translate(-50%, -50%) scale(1)';
    cornerCard2.style.filter = 'brightness(1)';
    }
    }
    }

    // （可选）打开调试看数值
    if (typeof DEBUG_LAYOUT !== 'undefined' && DEBUG_LAYOUT) {
    console.table({cols, rows, lastCount, angleDeg, su, sv, projU, projV,
    usableW2, usableH2, innerPadX, innerPadY});
    }
    }


    // 首次布局：等一帧，确保有尺寸；再等图片解码后复排一次
    requestAnimationFrame(() => {
    layout();
    const imgs = Array.from(stage.querySelectorAll('img'));
    Promise.allSettled(imgs.map(img => img.decode?.() ?? Promise.resolve()))
    .finally(() => { layout(); });
    });

    // 悬停联动 - 只在桌面端启用
    if (window.innerWidth > 680) {
        stage.addEventListener('mouseleave', resetScale);
        stage.addEventListener('mousemove', (e) => {
            // 命中哪张就联动哪张
            const el = e.target.closest('.card');
            if (el) applyScaleFrom(el);
        });
    }

    // 视口变化时重排
    window.addEventListener('resize', () => {
    // 重新生成卡片（因为手机端和桌面端卡片数量不同）
    const isMobile = window.innerWidth <= 680;
    const actualTotal = isMobile ? Math.min(TOTAL_IMAGES, MOBILE_MAX_CARDS) : Math.min(TOTAL_IMAGES, DESKTOP_MAX_CARDS);
    populateScatterImagesFixed(actualTotal, { prefix: IMG_PREFIX, ext: IMG_EXT });
    
    // 重新初始化布局
    setTimeout(() => {
        layout();
        
        // 根据屏幕尺寸决定是否启用悬停交互
        if (isMobile) {
            // 手机端：移除悬停交互，重置所有卡片
            stage.removeEventListener('mouseleave', resetScale);
            stage.removeEventListener('mousemove', stage._mouseMoveHandler);
            resetScale();
        } else {
            // 桌面端：启用悬停交互
            stage.addEventListener('mouseleave', resetScale);
            stage.addEventListener('mousemove', (e) => {
                const el = e.target.closest('.card');
                if (el) applyScaleFrom(el);
            });
            const hovered = cards.find(c => c.matches(':hover'));
            hovered ? applyScaleFrom(hovered) : resetScale();
        }
        
        // 重新初始化手机端动画功能
        initMobileCardFloating();
        initMobileAutoScale();
    }, 100);
    });
    }

    /* ============== 启动：插图 → 初始化 ============== */
    document.addEventListener('DOMContentLoaded', () => {
    populateScatterImagesFixed(TOTAL_IMAGES, { prefix: IMG_PREFIX, ext: IMG_EXT });
    initScatter();
    
    // 初始化手机端卡片飘动动画
    setTimeout(() => {
        initMobileCardFloating();
    }, 1000);
    
    // 初始化手机端自动放大动画
    initMobileAutoScale();



    const navLeft = document.querySelector(".nav-left");
    const infoPage = document.getElementById("info-page");

    function inInfoPage() {
    const rect = infoPage.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    // 当 info-page 有一半以上进入视口时认为在“关于somo”区块
    return rect.top < vh / 2 && rect.bottom > vh / 2;
    }

    function updateNavText() {
    if (inInfoPage()) {
    navLeft.textContent = "回到顶部";
    } else {
    navLeft.textContent = "关于somo";
    }
    }

    // 点击行为：根据当前状态跳转
    navLeft.addEventListener("click", (e) => {
    e.preventDefault();
    
    // 添加点击效果，然后移除
    navLeft.classList.add('clicked');
    setTimeout(() => {
    navLeft.classList.remove('clicked');
    }, 200);
    
    if (inInfoPage()) {
    // 返回顶部
    window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
    // 滚动到 info-page
    infoPage.scrollIntoView({ behavior: "smooth" });
    }
    });

    // 初始化 & 滚动时更新按钮文案
    updateNavText();
    window.addEventListener("scroll", updateNavText);
    
    // 初始化页面元素浮现动画
    initFadeInAnimations();
    });
