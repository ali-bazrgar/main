document.addEventListener('DOMContentLoaded', () => {
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const TAU = Math.PI * 2;

    /* ---------- Full-page interactive network background ---------- */
    const canvas = document.createElement('canvas');
    canvas.id = 'background-network';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });
    let width = 1;
    let height = 1;
    let dpr = 1;
    let nodes = [];
    let lastTime = performance.now();

    const pointer = {
        x: window.innerWidth * .5,
        y: window.innerHeight * .42,
        targetX: window.innerWidth * .5,
        targetY: window.innerHeight * .42,
        active: false
    };

    function makeNodes() {
        const count = Math.max(38, Math.min(92, Math.floor((width * height) / 15000)));
        nodes = Array.from({ length: count }, (_, index) => {
            const depth = .45 + Math.random() * .65;
            return {
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - .5) * (.06 + depth * .06),
                vy: (Math.random() - .5) * (.06 + depth * .06),
                depth,
                radius: index % 11 === 0 ? 2.4 + depth : 1.05 + depth * 1.15,
                phase: Math.random() * TAU,
                pulsePhase: Math.random() * TAU
            };
        });
    }

    function resize() {
        width = Math.max(1, window.innerWidth);
        height = Math.max(1, window.innerHeight);
        dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        makeNodes();
        render(0);
    }

    function setPointer(event) {
        pointer.targetX = event.clientX;
        pointer.targetY = event.clientY;
        pointer.active = event.pointerType !== 'touch';
    }

    window.addEventListener('pointermove', setPointer, { passive: true });
    window.addEventListener('pointerdown', setPointer, { passive: true });
    window.addEventListener('pointerup', () => {
        if (window.matchMedia('(pointer: coarse)').matches) pointer.active = false;
    }, { passive: true });
    window.addEventListener('blur', () => { pointer.active = false; }, { passive: true });
    window.addEventListener('resize', resize, { passive: true });

    function drawSignalArc(time, index) {
        const cx = width * (.52 + (pointer.x / width - .5) * .025 * index);
        const cy = height * (.45 + (pointer.y / height - .5) * .018 * index);
        const rx = Math.min(width, height) * (.28 + index * .09);
        const ry = rx * (.42 + index * .05);

        ctx.beginPath();
        ctx.ellipse(
            cx,
            cy,
            rx,
            ry,
            time * .000025 * (index % 2 ? -1 : 1),
            index * .55,
            Math.PI * 1.75 + index * .2
        );
        ctx.strokeStyle = 'rgba(183,255,74,' + (0.022 + index * .008) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function render(time) {
        ctx.clearRect(0, 0, width, height);

        const parallaxX = ((pointer.x / width) - .5) * 20;
        const parallaxY = ((pointer.y / height) - .5) * 14;

        const glow = ctx.createRadialGradient(
            pointer.x,
            pointer.y,
            0,
            pointer.x,
            pointer.y,
            Math.min(width, height) * .34
        );
        glow.addColorStop(0, 'rgba(183,255,74,.055)');
        glow.addColorStop(.5, 'rgba(183,255,74,.014)');
        glow.addColorStop(1, 'rgba(183,255,74,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < 3; i++) drawSignalArc(time, i);

        const points = nodes.map(node => ({
            x: node.x + parallaxX * node.depth,
            y: node.y + parallaxY * node.depth
        }));

        for (let i = 0; i < nodes.length; i++) {
            const a = points[i];

            for (let j = i + 1; j < nodes.length; j++) {
                const b = points[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distance = Math.hypot(dx, dy);
                if (distance > 165) continue;

                const alpha = Math.pow(1 - distance / 165, 1.55) * .16;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = 'rgba(183,255,74,' + alpha.toFixed(3) + ')';
                ctx.lineWidth = distance < 72 ? .85 : .5;
                ctx.stroke();

                if ((i * 17 + j * 31) % 23 === 0) {
                    const progress = (time * .000045 * (i % 2 ? 1 : -1) + nodes[i].pulsePhase / TAU) % 1;
                    const p = progress < 0 ? progress + 1 : progress;
                    const sx = a.x + (b.x - a.x) * p;
                    const sy = a.y + (b.y - a.y) * p;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 1.15, 0, TAU);
                    ctx.fillStyle = 'rgba(199,255,112,.48)';
                    ctx.fill();
                }
            }
        }

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const point = points[i];
            const near = Math.hypot(point.x - pointer.x, point.y - pointer.y);
            const active = pointer.active && near < 125;
            const pulse = 1 + Math.sin(time * .0011 + node.phase) * .1;

            if (active) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 9 + Math.max(0, 1 - near / 125) * 12, 0, TAU);
                ctx.strokeStyle = 'rgba(183,255,74,.13)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.arc(point.x, point.y, node.radius * pulse, 0, TAU);
            ctx.fillStyle = active ? '#c7ff70' : 'rgba(198,211,220,' + (.34 + node.depth * .34) + ')';
            ctx.shadowColor = 'rgba(183,255,74,.5)';
            ctx.shadowBlur = active ? 15 : 5;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        if (pointer.active) {
            const cursorRadius = 6 + Math.sin(time * .004) * 1.4;
            ctx.beginPath();
            ctx.arc(pointer.x, pointer.y, cursorRadius, 0, TAU);
            ctx.strokeStyle = 'rgba(183,255,74,.24)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    function animate(time) {
        const dt = Math.min(32, time - lastTime);
        lastTime = time;
        const step = dt / 16.67;

        pointer.x += (pointer.targetX - pointer.x) * .075;
        pointer.y += (pointer.targetY - pointer.y) * .075;

        for (const node of nodes) {
            node.vx += Math.sin(time * .00017 + node.phase) * .00016 * node.depth;
            node.vy += Math.cos(time * .00014 + node.phase) * .00016 * node.depth;

            if (pointer.active) {
                const dx = node.x - pointer.x;
                const dy = node.y - pointer.y;
                const distance = Math.hypot(dx, dy);
                const radius = 240;

                if (distance > .001 && distance < radius) {
                    const strength = Math.pow(1 - distance / radius, 2) * .42 * node.depth;
                    node.vx += (dx / distance) * strength * .008;
                    node.vy += (dy / distance) * strength * .008;
                }
            }

            node.vx *= Math.pow(.992, step);
            node.vy *= Math.pow(.992, step);
            node.x += node.vx * step;
            node.y += node.vy * step;

            if (node.x < -30) node.x = width + 30;
            if (node.x > width + 30) node.x = -30;
            if (node.y < -30) node.y = height + 30;
            if (node.y > height + 30) node.y = -30;
        }

        render(time);
        requestAnimationFrame(animate);
    }

    resize();
    if (!reducedMotion.matches) {
        requestAnimationFrame(animate);
    }

    /* ---------- English / Persian language switcher ---------- */
    const translations = {
        en: {
            navFocus: 'Focus',
            navWork: 'Work',
            navContact: 'Contact',
            heroEyebrow: 'COMPUTER ENGINEERING · NETWORKING · AI · SYSTEMS',
            heroTitleLead: 'Exploring',
            heroTitleAccent: 'useful technology.',
            heroText: 'I’m Ali Bazrgar, a final-semester computer engineering student interested in networking, infrastructure, local AI, embedded systems, and practical web applications.',
            domainLabel: 'PERSONAL PORTFOLIO',
            heroFocusButton: 'My interests',
            metaBased: 'Based in',
            metaBasedValue: 'Tehran, Iran',
            metaStatus: 'Status',
            metaStatusValue: 'Final-semester B.Sc.',
            metaFocus: 'Focus',
            metaFocusValue: 'Networking · Systems · AI',
            focusEyebrow: 'FOCUS',
            focusTitle: 'Where I’m putting my attention.',
            focusNetworkingTitle: 'Networking',
            focusNetworkingText: 'Computer networks, infrastructure, MikroTik, Cisco, remote access, and hands-on lab work.',
            focusAiTitle: 'Artificial Intelligence',
            focusAiText: 'Local LLMs, model deployment, AI-assisted tools, and practical applications of generative AI.',
            focusSystemsTitle: 'Systems',
            focusSystemsText: 'Windows, Linux, servers, self-hosting, DNS, Cloudflare, and connecting services into useful systems.',
            focusWebTitle: 'Web Applications',
            focusWebText: 'Building clean, practical products and turning ideas into working web experiences.',
            workEyebrow: 'ONE PROJECT',
            workTitle: 'Something I’ve built.',
            projectText: 'A practical language-learning web app with AI-assisted features and study tools, built as a progressive web application.',
            projectLink: 'Visit WordLens',
            aboutEyebrow: 'ABOUT',
            aboutTitle: 'Learning by building.',
            aboutText: 'I like understanding how things work by building and experimenting with them. I’m particularly interested in practical environments where networking, infrastructure, and AI meet.',
            contactEyebrow: 'CONTACT',
            contactTitle: 'Let’s connect.',
            contactText: 'For internships, junior opportunities, collaborations, or technical projects.',
            emailButton: 'Email',
            sourceLink: 'Source ↗',
            languageAria: 'Switch to Persian',
            brandAria: 'Ali Bazrgar home',
            domainAria: 'Open Ali Bazrgar personal portfolio',
            title: 'Ali Bazrgar — Computer Engineering',
            description: 'Ali Bazrgar — Computer Engineering student interested in networking, AI, systems, and practical software.'
        },
        fa: {
            navFocus: 'حوزه‌های مورد علاقه',
            navWork: 'پروژه',
            navContact: 'ارتباط',
            heroEyebrow: 'مهندسی کامپیوتر · شبکه · هوش مصنوعی · سیستم‌ها',
            heroTitleLead: 'کاوش در',
            heroTitleAccent: 'فناوری‌های کاربردی.',
            heroText: 'من علی بذرگر، دانشجوی ترم آخر مهندسی کامپیوتر هستم و به شبکه، زیرساخت، هوش مصنوعی محلی، سیستم‌های تعبیه‌شده و اپلیکیشن‌های وب کاربردی علاقه‌مندم.',
            domainLabel: 'پرتفولیوی شخصی',
            heroFocusButton: 'حوزه‌های مورد علاقه',
            metaBased: 'محل فعالیت',
            metaBasedValue: 'تهران، ایران',
            metaStatus: 'وضعیت',
            metaStatusValue: 'دانشجوی ترم آخر کارشناسی',
            metaFocus: 'تمرکز',
            metaFocusValue: 'شبکه · سیستم‌ها · هوش مصنوعی',
            focusEyebrow: 'حوزه‌های مورد علاقه',
            focusTitle: 'حوزه‌هایی که روی آن‌ها تمرکز دارم.',
            focusNetworkingTitle: 'شبکه',
            focusNetworkingText: 'شبکه‌های کامپیوتری، زیرساخت، MikroTik، Cisco، دسترسی از راه دور و کار عملی در محیط آزمایشگاهی.',
            focusAiTitle: 'هوش مصنوعی',
            focusAiText: 'مدل‌های زبانی محلی، استقرار مدل، ابزارهای مبتنی بر هوش مصنوعی و کاربردهای عملی هوش مصنوعی مولد.',
            focusSystemsTitle: 'سیستم‌ها',
            focusSystemsText: 'Windows، Linux، سرورها، خودمیزبانی، DNS، Cloudflare و اتصال سرویس‌ها برای ساخت سیستم‌های کاربردی.',
            focusWebTitle: 'اپلیکیشن‌های وب',
            focusWebText: 'ساخت محصولات تمیز و کاربردی و تبدیل ایده‌ها به تجربه‌های وب قابل استفاده.',
            workEyebrow: 'یک پروژه',
            workTitle: 'چیزی که ساخته‌ام.',
            projectText: 'یک اپلیکیشن وب کاربردی برای یادگیری زبان با قابلیت‌های مبتنی بر هوش مصنوعی و ابزارهای مطالعه که به‌صورت یک PWA ساخته شده است.',
            projectLink: 'مشاهده WordLens',
            aboutEyebrow: 'درباره من',
            aboutTitle: 'یادگیری با ساختن.',
            aboutText: 'دوست دارم با ساختن و آزمایش‌کردن، سازوکار چیزها را بهتر درک کنم. به‌خصوص به محیط‌های عملی علاقه دارم که در آن‌ها شبکه، زیرساخت و هوش مصنوعی به هم می‌رسند.',
            contactEyebrow: 'ارتباط',
            contactTitle: 'در ارتباط باشیم.',
            contactText: 'برای کارآموزی، فرصت‌های شغلی جونیور، همکاری یا پروژه‌های فنی.',
            emailButton: 'ایمیل',
            sourceLink: 'کد منبع ↗',
            languageAria: 'تغییر به زبان انگلیسی',
            brandAria: 'صفحه اصلی علی بذرگر',
            domainAria: 'باز کردن پرتفولیوی شخصی علی بذرگر',
            title: 'علی بذرگر — مهندسی کامپیوتر',
            description: 'علی بذرگر — دانشجوی مهندسی کامپیوتر با تمرکز بر شبکه، هوش مصنوعی، سیستم‌ها و نرم‌افزارهای کاربردی.'
        }
    };

    const header = document.querySelector('.site-header');
    const nav = document.querySelector('.nav');
    const toggle = document.createElement('button');
    const headerActions = document.createElement('div');

    toggle.id = 'language-toggle';
    toggle.className = 'language-toggle';
    toggle.type = 'button';

    headerActions.className = 'header-actions';
    nav.replaceWith(headerActions);
    headerActions.append(toggle, nav);

    const setText = (selector, key, language) => {
        const element = document.querySelector(selector);
        if (element) element.textContent = translations[language][key];
    };

    function applyLanguage(language) {
        const t = translations[language];
        const isPersian = language === 'fa';

        document.documentElement.lang = language;
        document.documentElement.dir = isPersian ? 'rtl' : 'ltr';
        document.title = t.title;

        const description = document.getElementById('meta-description');
        if (description) description.setAttribute('content', t.description);

        toggle.textContent = isPersian ? 'EN' : 'FA';
        toggle.setAttribute('aria-label', t.languageAria);
        nav.setAttribute('aria-label', isPersian ? 'ناوبری اصلی' : 'Primary navigation');

        const brand = document.querySelector('.brand');
        if (brand) brand.setAttribute('aria-label', t.brandAria);

        const domain = document.querySelector('.hero-domain a');
        if (domain) domain.setAttribute('aria-label', t.domainAria);

        setText('.nav a[href="#focus"]', 'navFocus', language);
        setText('.nav a[href="#work"]', 'navWork', language);
        setText('.nav a[href="#contact"]', 'navContact', language);

        setText('.hero .eyebrow', 'heroEyebrow', language);

        const h1 = document.querySelector('.hero h1');
        if (h1) {
            h1.innerHTML = '<span>' + t.heroTitleLead + '</span><br><span>' + t.heroTitleAccent + '</span>';
        }

        setText('.hero-text', 'heroText', language);
        setText('.domain-label', 'domainLabel', language);

        const heroButton = document.querySelector('.hero-actions .button-primary');
        if (heroButton) heroButton.firstChild.textContent = t.heroFocusButton + ' ';

        setText('.meta-line:nth-child(1) span', 'metaBased', language);
        setText('.meta-line:nth-child(1) strong', 'metaBasedValue', language);
        setText('.meta-line:nth-child(2) span', 'metaStatus', language);
        setText('.meta-line:nth-child(2) strong', 'metaStatusValue', language);
        setText('.meta-line:nth-child(3) span', 'metaFocus', language);
        setText('.meta-line:nth-child(3) strong', 'metaFocusValue', language);

        setText('#focus .eyebrow', 'focusEyebrow', language);
        setText('#focus h2', 'focusTitle', language);

        const focusCards = document.querySelectorAll('.focus-card');
        const focusKeys = [
            ['focusNetworkingTitle', 'focusNetworkingText'],
            ['focusAiTitle', 'focusAiText'],
            ['focusSystemsTitle', 'focusSystemsText'],
            ['focusWebTitle', 'focusWebText']
        ];
        focusCards.forEach((card, index) => {
            const keys = focusKeys[index];
            if (!keys) return;
            const title = card.querySelector('h3');
            const text = card.querySelector('p');
            if (title) title.textContent = t[keys[0]];
            if (text) text.textContent = t[keys[1]];
        });

        setText('#work .eyebrow', 'workEyebrow', language);
        setText('#work h2', 'workTitle', language);
        setText('.project-content p', 'projectText', language);
        setText('.project-link span', 'projectLink', language);

        setText('.about-section .eyebrow', 'aboutEyebrow', language);
        setText('.about-section h2', 'aboutTitle', language);
        setText('.about-lead', 'aboutText', language);

        setText('#contact .eyebrow', 'contactEyebrow', language);
        setText('#contact h2', 'contactTitle', language);
        setText('.contact-card > p:not(.eyebrow)', 'contactText', language);
        setText('.contact-actions .button-primary span:first-child', 'emailButton', language);
        setText('.site-footer a', 'sourceLink', language);
    }

    toggle.addEventListener('click', () => {
        const next = document.documentElement.lang === 'fa' ? 'en' : 'fa';
        localStorage.setItem('portfolio-language', next);
        applyLanguage(next);
    });

    const savedLanguage = localStorage.getItem('portfolio-language');
    applyLanguage(savedLanguage === 'fa' ? 'fa' : 'en');
});
