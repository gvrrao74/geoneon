const canvas = document.getElementById("gameCanvas");
        const ctx = canvas.getContext("2d");
        const menu = document.getElementById("menu");
        const pBar = document.getElementById("progressBar");
        const pFill = document.getElementById("pFill");
        const pText = document.getElementById("progressText");

        canvas.width = 800; canvas.height = 400;

        let BASE_SPEED = 5.2; 
        const GRAVITY = 0.65;
        const JUMP = -11.8;
        const PAD_BOOST = -16.5; 
        const SIZE = 40; 
        const GROUND = 340;

        const forwardPart = [
            0,0,0,0,0,0,0,0,0,0, 
            2,0,0,0,3,0,0,       
            0,0,0,2,0,0,0,       
            1,1,1,1,0,0,0,0,3,0, 
            0,0,0,0,2,2,0,0,     
            1,1,1,1,0,0,3,0,0,0, 
            2,0,0,0,0,0,2,0,0,0, 
            1,1,1,1,1,1,0,0,0,0, 
            0,0,0,2,0,0,0,0,0,0
        ];

        const gauntletPattern = [
            ...forwardPart,
            0,3,2,2,2,1,1,1,1,0,0,3,0,2,2,0,0,0,0,0,3,2,2,0,0,1,1,1,0,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,3,2,2,
            0,0,0,0,0,1,2,1,2,1,2,2,1,2,0,0,3,0,1,2,2,2,2,2,1,0,3,0,5
        ];

        function getGauntletLevel() {
            let map = [...gauntletPattern];
            let highs = [];
            map.forEach((type, idx) => { if (type === 1) highs.push({idx: idx, y: 280}); });
            return { id: 3, map, highs };
        }

        const levels = [
            { id: 0, map: [0,0,0,0,0,2,0,0,0,1,1,0,0,2,0,0,2,0,0,1,1,1,0,0,2,0,0,2,0,0,0,0,0,5], highs: [{idx:9,y:280},{idx:10,y:280},{idx:19,y:280},{idx:20,y:280},{idx:21,y:280}] },
            { id: 1, map: [0,0,0,0,2,0,1,1,0,0,2,0,0,1,1,1,0,2,0,1,1,0,2,0,1,1,0,2,0,0,2,0,0,0,0,5], highs: [{idx:6,y:280},{idx:7,y:280},{idx:13,y:280},{idx:14,y:240},{idx:15,y:200},{idx:19,y:280},{idx:20,y:280},{idx:24,y:280},{idx:25,y:280}] },
            { id: 2, map: [0,0,0,0,2,0,0,0,2,0,0,0,2,0,0,1,1,0,0,1,1,0,0,1,1,0,0,2,0,0,0,2,0,0,0,0,1,1,1,1,1,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0,2,0,0,2,0,0,0,0,2,2,0,0,0,5], highs: [{idx:15,y:280},{idx:16,y:280},{idx:19,y:240},{idx:20,y:240},{idx:23,y:200},{idx:24,y:200},{idx:32,y:200},{idx:33,y:200},{idx:34,y:200},{idx:35,y:200},{idx:36,y:200},{idx:37,y:200},{idx:38,y:200},{idx:39,y:200},{idx:40,y:200},{idx:44,y:260},{idx:45,y:260},{idx:46,y:260},{idx:47,y:260},{idx:52,y:310},{idx:53,y:310},{idx:54,y:310},{idx:55,y:310}] },
            getGauntletLevel()
        ];

        let curIdx = 0, curLvl = null, isHolding = false;
        let state = { p: { x: 50, y: 310, w: 30, h: 30, dy: 0, ground: false, rot: 0 }, trail: [], camX: 0, dead: false, win: false, active: false, dir: 1 };

        function stopAllMusic() {
            ["menuMusic", "levelMusic0", "levelMusic1", "levelMusic2", "levelMusic3"].forEach(id => {
                const a = document.getElementById(id); if(a) { a.pause(); a.currentTime = 0; }
            });
        }

        function playMusic(id) {
            stopAllMusic();
            const a = document.getElementById(id); if(a) a.play().catch(() => {});
        }

        function updateScores() {
            levels.forEach(l => {
                const s = localStorage.getItem(`dash_best_${l.id}`) || 0;
                const el = document.getElementById(`best-${l.id}`); if(el) el.innerText = `Best: ${s}%`;
            });
        }

        function startGame(i) {
            curIdx = i; curLvl = levels[i]; state.active = true;
            menu.style.display = "none"; pBar.style.display = "block"; pText.style.display = "block";
            BASE_SPEED = (i === 3) ? 6.5 : 5.2;
            playMusic(`levelMusic${i}`); 
            reset(); requestAnimationFrame(loop);
        }

        function reset() {
            state.p = { x: 50, y: GROUND - 30, w: 30, h: 30, dy: 0, ground: false, rot: 0 };
            state.trail = []; state.camX = 0; state.dead = false; state.win = false; state.dir = 1;
        }

        function update() {
            if (!state.active || state.dead || state.win) return;
            let p = state.p;
            if (isHolding && p.ground) { p.dy = JUMP; p.ground = false; }
            p.dy += GRAVITY; p.y += p.dy; p.x += (BASE_SPEED * state.dir);
            state.camX = p.x - 150;
            state.trail.unshift({x: p.x, y: p.y, rot: p.rot});
            if (state.trail.length > 10) state.trail.pop();
            
            let pct = Math.min(Math.floor((p.x / ((curLvl.map.length - 1) * SIZE)) * 100), 100);
            pFill.style.width = pct + "%"; pText.innerText = pct + "%";

            let onGround = false;
            if (p.y + p.h >= GROUND) { p.y = GROUND - p.h; p.dy = 0; onGround = true; }

            let startIdx = Math.max(0, Math.floor(p.x / SIZE) - 5);
            let endIdx = Math.min(curLvl.map.length, startIdx + 12);

            for (let i = startIdx; i < endIdx; i++) {
                let type = curLvl.map[i];
                if (type === 0) continue;
                let ox = i * SIZE, oy = GROUND - SIZE, h = curLvl.highs.find(obj => obj.idx === i);
                if (h) oy = h.y;
                
                if (type === 5 && p.x + p.w >= ox) {
                    state.win = true; save(100); 
                    setTimeout(() => { 
                        state.active = false; menu.style.display = "block"; 
                        updateScores(); playMusic("menuMusic");
                    }, 3500);
                    return;
                }

                let pad = (type === 2) ? 14 : 2;
                if (p.x + pad < ox + SIZE && p.x + p.w - pad > ox && p.y + pad < oy + SIZE && p.y + p.h - pad > oy) {
                    if (type === 1) { 
                        if (p.dy >= 0 && (p.y + p.h) - p.dy <= oy + 15) { p.y = oy - p.h; p.dy = 0; onGround = true; }
                        else die(pct);
                    } 
                    else if (type === 2) die(pct);
                    else if (type === 3) { p.dy = PAD_BOOST; p.ground = false; }
                }
            }
            p.ground = onGround;
            if (!p.ground) p.rot += (6 * state.dir); else p.rot = Math.round(p.rot / 90) * 90;
        }

        function save(v) { const b = localStorage.getItem(`dash_best_${curIdx}`) || 0; if (v > b) localStorage.setItem(`dash_best_${curIdx}`, v); }
        function die(pct) { save(pct); state.dead = true; setTimeout(reset, 450); }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!state.active) return;
            ctx.save(); ctx.translate(-state.camX, 0);
            ctx.strokeStyle = "#00ffcc"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(state.camX, GROUND); ctx.lineTo(state.camX+canvas.width, GROUND); ctx.stroke();
            
            let drawStart = Math.floor(state.camX / SIZE) - 5;
            let drawEnd = drawStart + Math.ceil(canvas.width / SIZE) + 10;
            
            for(let i = drawStart; i < drawEnd; i++) {
                let type = curLvl.map[i];
                if (!type || type === 0) continue;
                let ox = i * SIZE, oy = GROUND - SIZE, h = curLvl.highs.find(obj => obj.idx === i);
                if (h) oy = h.y;
                if (type === 1) { ctx.fillStyle = "#003366"; ctx.fillRect(ox, oy, SIZE, SIZE); ctx.strokeStyle = "#00ffff"; ctx.strokeRect(ox, oy, SIZE, SIZE); }
                else if (type === 2) { ctx.fillStyle = "#ff1144"; ctx.beginPath(); ctx.moveTo(ox+8, oy+SIZE); ctx.lineTo(ox+SIZE/2, oy+8); ctx.lineTo(ox+SIZE-8, oy+SIZE); ctx.fill(); }
                else if (type === 3) { 
                    ctx.fillStyle = "#ffff00"; ctx.fillRect(ox + 5, oy + SIZE - 10, SIZE - 10, 10);
                    ctx.strokeStyle = "white"; ctx.strokeRect(ox + 5, oy + SIZE - 10, SIZE - 10, 10);
                }
                else if (type === 4) { 
                    ctx.fillStyle = "#aa00ff"; ctx.beginPath(); ctx.ellipse(ox + SIZE/2, 200, 20, 150, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = "white"; ctx.stroke();
                }
                else if (type === 5) { ctx.fillStyle = "#00ff00"; ctx.fillRect(ox, 0, 30, GROUND); }
            }

            let pColor = (curIdx === 3) ? "#ff1144" : "#00ffcc";
            state.trail.forEach((t, i) => { ctx.fillStyle = (curIdx === 3) ? `rgba(255, 17, 68, ${0.15 - i/60})` : `rgba(0, 255, 204, ${0.15 - i/60})`; ctx.fillRect(t.x, t.y, 30, 30); });
            ctx.save(); ctx.translate(state.p.x+15, state.p.y+15); ctx.rotate(state.p.rot*Math.PI/180);
            ctx.fillStyle = pColor; ctx.fillRect(-15, -15, 30, 30); ctx.strokeStyle = "white"; ctx.strokeRect(-15, -15, 30, 30); ctx.restore();
            
            ctx.restore();
            
            if (state.win) { 
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0); 
                ctx.fillStyle = "white"; 
                ctx.font = "bold 50px Arial"; 
                ctx.textAlign = "center"; 
                ctx.shadowBlur = 10; ctx.shadowColor = "#00ffcc";
                ctx.fillText("LEVEL COMPLETE!", canvas.width / 2, 200); 
                ctx.restore();
            }
        }

        function loop() { update(); draw(); if (state.active) requestAnimationFrame(loop); }
        window.addEventListener("keydown", (e) => { if (e.code === "Space") isHolding = true; });
        window.addEventListener("keyup", (e) => { if (e.code === "Space") isHolding = false; });
        canvas.addEventListener("mousedown", () => isHolding = true); window.addEventListener("mouseup", () => isHolding = false);
        window.addEventListener("mousedown", () => { if(!state.active && document.getElementById("menuMusic").paused) playMusic("menuMusic"); }, {once: true});
        updateScores();