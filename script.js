document.addEventListener('DOMContentLoaded', () => {
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    const stage = document.getElementById('network-art');
    const canvas = document.getElementById('network-canvas');
    if (!stage || !canvas) return;

    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const TAU = Math.PI * 2;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let dragged = null;
    let lastTime = performance.now();
    const pointer = { x: 0, y: 0, active: false, down: false };

    function makeNodes() {
        const count = Math.max(22, Math.min(34, Math.floor((width * height) / 17000)));
        nodes = Array.from({ length: count }, (_, i) => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - .5) * .18,
            vy: (Math.random() - .5) * .18,
            radius: i % 7 === 0 ? 2.7 : 1.6 + Math.random() * 1.1,
            phase: Math.random() * TAU
        }));
    }

    function resize() {
        const rect = stage.getBoundingClientRect();
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        makeNodes();
        draw(0);
    }

    function pointerPosition(event) {
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function closestNode(x, y) {
        let best = null;
        let bestDistance = 28;
        for (const node of nodes) {
            const dx = node.x - x;
            const dy = node.y - y;
            const distance = Math.hypot(dx, dy);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = node;
            }
        }
        return best;
    }

    function onPointerMove(event) {
        const pos = pointerPosition(event);
        pointer.x = pos.x;
        pointer.y = pos.y;
        pointer.active = true;

        if (dragged) {
            dragged.x = pos.x;
            dragged.y = pos.y;
            dragged.vx = 0;
            dragged.vy = 0;
        }
    }

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerenter', () => { pointer.active = true; });
    canvas.addEventListener('pointerleave', () => {
        if (!pointer.down) pointer.active = false;
    });

    canvas.addEventListener('pointerdown', (event) => {
        const pos = pointerPosition(event);
        pointer.x = pos.x;
        pointer.y = pos.y;
        pointer.active = true;
        pointer.down = true;
        dragged = closestNode(pos.x, pos.y);
        if (dragged) {
            canvas.setPointerCapture(event.pointerId);
            dragged.x = pos.x;
            dragged.y = pos.y;
        }
    });

    function releasePointer(event) {
        pointer.down = false;
        dragged = null;
        try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
    }

    canvas.addEventListener('pointerup', releasePointer);
    canvas.addEventListener('pointercancel', releasePointer);

    function draw(time) {
        ctx.clearRect(0, 0, width, height);

        const nodesForLines = nodes;
        for (let i = 0; i < nodesForLines.length; i++) {
            const a = nodesForLines[i];

            for (let j = i + 1; j < nodesForLines.length; j++) {
                const b = nodesForLines[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distance = Math.hypot(dx, dy);
                if (distance > 145) continue;

                const alpha = (1 - distance / 145) * 0.17;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = 'rgba(183,255,74,' + alpha.toFixed(3) + ')';
                ctx.lineWidth = distance < 80 ? 0.9 : 0.55;
                ctx.stroke();
            }
        }

        // A subtle orbital ring keeps the center of the visualization visually anchored.
        const cx = width * .5;
        const cy = height * .5;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(width, height) * .18, 0, TAU);
        ctx.strokeStyle = 'rgba(183,255,74,.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        for (const node of nodesForLines) {
            const pulse = 1 + Math.sin(time * .0008 + node.phase) * .12;
            const activeDistance = Math.hypot(node.x - pointer.x, node.y - pointer.y);
            const active = pointer.active && activeDistance < 100;

            if (active) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, 9 + (1 - activeDistance / 100) * 8, 0, TAU);
                ctx.strokeStyle = 'rgba(183,255,74,.12)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius * pulse, 0, TAU);
            ctx.fillStyle = active ? '#c7ff70' : 'rgba(198,211,220,.74)';
            ctx.shadowColor = 'rgba(183,255,74,.55)';
            ctx.shadowBlur = active ? 13 : 5;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        if (pointer.active) {
            ctx.beginPath();
            ctx.arc(pointer.x, pointer.y, 3.5, 0, TAU);
            ctx.fillStyle = 'rgba(183,255,74,.7)';
            ctx.fill();
        }
    }

    function animate(time) {
        const dt = Math.min(32, time - lastTime);
        lastTime = time;
        const step = dt / 16.67;

        for (const node of nodes) {
            if (node === dragged) continue;

            if (pointer.active) {
                const dx = pointer.x - node.x;
                const dy = pointer.y - node.y;
                const distance = Math.hypot(dx, dy);
                if (distance > 0.001 && distance < 180) {
                    const influence = (1 - distance / 180) * .025;
                    node.vx += (dx / distance) * influence;
                    node.vy += (dy / distance) * influence;
                }
            }

            node.vx *= Math.pow(.995, step);
            node.vy *= Math.pow(.995, step);
            node.x += node.vx * step;
            node.y += node.vy * step;

            if (node.x < -20) node.x = width + 20;
            if (node.x > width + 20) node.x = -20;
            if (node.y < -20) node.y = height + 20;
            if (node.y > height + 20) node.y = -20;
        }

        draw(time);
        requestAnimationFrame(animate);
    }

    new ResizeObserver(resize).observe(stage);
    window.addEventListener('resize', resize, { passive: true });
    resize();

    if (reduceMotion.matches) {
        draw(0);
    } else {
        requestAnimationFrame(animate);
    }
});