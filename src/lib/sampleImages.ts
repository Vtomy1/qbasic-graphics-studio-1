export interface SampleImage {
  id: string;
  name: string;
  category: string;
  description: string;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'dos-city',
    name: 'DOS Gorillas Skyline',
    category: 'Retro Gaming',
    description: 'Iconic 1991 QBASIC Gorillas midnight cityscape with yellow windows and moonlit clouds.',
    draw: (ctx, w, h) => {
      // Midnight sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#000033');
      skyGrad.addColorStop(0.6, '#001155');
      skyGrad.addColorStop(1, '#113377');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Stars
      ctx.fillStyle = '#FFFFFF';
      const starSeeds = [12, 45, 78, 120, 160, 210, 250, 290, 40, 95, 180, 275];
      for (const s of starSeeds) {
        const sx = (s * 37) % w;
        const sy = (s * 19) % Math.floor(h * 0.45);
        ctx.fillRect(sx, sy, 2, 2);
      }

      // Crescent Moon
      ctx.fillStyle = '#FFFF88';
      ctx.beginPath();
      ctx.arc(w * 0.82, h * 0.22, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#001155';
      ctx.beginPath();
      ctx.arc(w * 0.86, h * 0.2, 20, 0, Math.PI * 2);
      ctx.fill();

      // Buildings
      const buildingWidths = [38, 44, 32, 50, 40, 48, 36, 42, 54];
      const colors = ['#AA0000', '#00AAAA', '#AAAAAA', '#0000AA', '#AA5500', '#555555'];
      let curX = 0;
      let bIdx = 0;

      while (curX < w) {
        const bw = buildingWidths[bIdx % buildingWidths.length];
        const bh = 50 + ((bIdx * 47 + 13) % Math.floor(h * 0.45));
        const by = h - bh;
        const col = colors[bIdx % colors.length];

        ctx.fillStyle = col;
        ctx.fillRect(curX, by, bw, bh);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(curX, by, bw, bh);

        // Windows
        ctx.fillStyle = '#FFFF55';
        for (let wy = by + 6; wy < h - 10; wy += 8) {
          for (let wx = curX + 4; wx < curX + bw - 6; wx += 7) {
            if ((wx + wy + bIdx) % 3 !== 0) {
              ctx.fillRect(wx, wy, 4, 5);
            }
          }
        }

        curX += bw - 1;
        bIdx++;
      }
    }
  },
  {
    id: 'dither-ramp',
    name: 'Gradient & Sphere Studio',
    category: 'Test Bench',
    description: 'Continuous tone color gradients, raymarched shaded sphere, and fine frequency patterns.',
    draw: (ctx, w, h) => {
      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#101828');
      bg.addColorStop(0.5, '#1e293b');
      bg.addColorStop(1, '#090d16');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Top color ramps
      const barH = 14;
      const channels = [
        ['#000000', '#FF0000'],
        ['#000000', '#00FF00'],
        ['#000000', '#0000FF'],
        ['#000000', '#FFFFFF']
      ];

      channels.forEach((pair, idx) => {
        const grad = ctx.createLinearGradient(16, 0, w - 16, 0);
        grad.addColorStop(0, pair[0]);
        grad.addColorStop(1, pair[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(16, 10 + idx * (barH + 4), w - 32, barH);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(16, 10 + idx * (barH + 4), w - 32, barH);
      });

      // 3D Shaded Sphere
      const sphereRadius = Math.min(w, h) * 0.22;
      const sphereX = w * 0.35;
      const sphereY = h * 0.65;

      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(sphereX + 15, sphereY + sphereRadius * 0.85, sphereRadius * 0.9, sphereRadius * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Radial sphere gradient
      const sphereGrad = ctx.createRadialGradient(
        sphereX - sphereRadius * 0.3,
        sphereY - sphereRadius * 0.35,
        sphereRadius * 0.1,
        sphereX,
        sphereY,
        sphereRadius
      );
      sphereGrad.addColorStop(0, '#FFFFFF');
      sphereGrad.addColorStop(0.2, '#38BDF8');
      sphereGrad.addColorStop(0.6, '#0284C7');
      sphereGrad.addColorStop(0.9, '#0F172A');
      sphereGrad.addColorStop(1, '#020617');

      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(sphereX, sphereY, sphereRadius, 0, Math.PI * 2);
      ctx.fill();

      // Chrome metallic cone
      const coneX = w * 0.72;
      const coneY = h * 0.65;
      const coneGrad = ctx.createLinearGradient(coneX - 45, 0, coneX + 45, 0);
      coneGrad.addColorStop(0, '#AA5500');
      coneGrad.addColorStop(0.3, '#FFFF55');
      coneGrad.addColorStop(0.5, '#FFFFFF');
      coneGrad.addColorStop(0.7, '#FF5555');
      coneGrad.addColorStop(1, '#550000');

      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(coneX, coneY - sphereRadius);
      ctx.lineTo(coneX + 45, coneY + sphereRadius * 0.8);
      ctx.lineTo(coneX - 45, coneY + sphereRadius * 0.8);
      ctx.closePath();
      ctx.fill();
    }
  },
  {
    id: 'space-ship',
    name: 'Retro Space Fighter',
    category: 'VGA Demoscene',
    description: 'VGA 320x200 arcade spaceship with thrust fire, nebulae, and starfield.',
    draw: (ctx, w, h) => {
      // Deep space nebula
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      const neb = ctx.createRadialGradient(w * 0.7, h * 0.3, 10, w * 0.7, h * 0.3, w * 0.4);
      neb.addColorStop(0, '#7C3AED');
      neb.addColorStop(0.5, '#BE185D');
      neb.addColorStop(1, 'transparent');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, w, h);

      // Stars
      for (let i = 0; i < 60; i++) {
        const x = (i * 97) % w;
        const y = (i * 61) % h;
        const brightness = (i % 3) + 1;
        ctx.fillStyle = brightness === 3 ? '#FFFFFF' : brightness === 2 ? '#38BDF8' : '#64748B';
        ctx.fillRect(x, y, brightness > 2 ? 2 : 1, brightness > 2 ? 2 : 1);
      }

      // Ship body
      const cx = w * 0.48;
      const cy = h * 0.52;

      // Engine Thruster Glow
      const thrust = ctx.createRadialGradient(cx, cy + 32, 2, cx, cy + 50, 24);
      thrust.addColorStop(0, '#FFFFFF');
      thrust.addColorStop(0.3, '#FACC15');
      thrust.addColorStop(0.7, '#EF4444');
      thrust.addColorStop(1, 'transparent');
      ctx.fillStyle = thrust;
      ctx.beginPath();
      ctx.arc(cx, cy + 38, 22, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 35);
      ctx.lineTo(cx + 42, cy + 22);
      ctx.lineTo(cx + 25, cy + 26);
      ctx.lineTo(cx, cy + 18);
      ctx.lineTo(cx - 25, cy + 26);
      ctx.lineTo(cx - 42, cy + 22);
      ctx.closePath();
      ctx.fill();

      // Fuselage
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 40);
      ctx.lineTo(cx + 12, cy + 15);
      ctx.lineTo(cx, cy + 24);
      ctx.lineTo(cx - 12, cy + 15);
      ctx.closePath();
      ctx.fill();

      // Cockpit Canopy
      ctx.fillStyle = '#0284C7';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 10, 6, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(cx - 2, cy - 18, 3, 8);
    }
  },
  {
    id: 'retro-pixel-knight',
    name: '8-Bit Knight Quest',
    category: 'Pixel Art',
    description: 'Charming retro pixel character with shield, sword, and dungeon brickwork.',
    draw: (ctx, w, h) => {
      // Dungeon stone background
      ctx.fillStyle = '#1A1829';
      ctx.fillRect(0, 0, w, h);

      // Stone bricks pattern
      ctx.strokeStyle = '#2E2B44';
      ctx.lineWidth = 1;
      const brickH = 14;
      const brickW = 28;
      for (let y = 0; y < h; y += brickH) {
        const offset = ((y / brickH) % 2) * (brickW / 2);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        for (let x = offset; x < w; x += brickW) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + brickH);
          ctx.stroke();
        }
      }

      // Torches on walls
      const torchX = [w * 0.18, w * 0.82];
      torchX.forEach(tx => {
        // Torch bracket
        ctx.fillStyle = '#5A4533';
        ctx.fillRect(tx - 3, h * 0.35, 6, 18);
        // Flame
        const flame = ctx.createRadialGradient(tx, h * 0.32, 2, tx, h * 0.32, 16);
        flame.addColorStop(0, '#FFFFFF');
        flame.addColorStop(0.3, '#FFAA00');
        flame.addColorStop(0.8, '#AA0000');
        flame.addColorStop(1, 'transparent');
        ctx.fillStyle = flame;
        ctx.beginPath();
        ctx.arc(tx, h * 0.32, 16, 0, Math.PI * 2);
        ctx.fill();
      });

      // Knight figure in center
      const kx = w * 0.5;
      const ky = h * 0.58;

      // Shadow
      ctx.fillStyle = '#0F0E17';
      ctx.beginPath();
      ctx.ellipse(kx, ky + 42, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cape
      ctx.fillStyle = '#991B1B';
      ctx.fillRect(kx - 16, ky - 10, 32, 40);

      // Armor Body
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(kx - 12, ky - 8, 24, 30);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(kx - 10, ky - 6, 8, 26);

      // Helmet
      ctx.fillStyle = '#64748B';
      ctx.fillRect(kx - 14, ky - 32, 28, 24);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(kx - 12, ky - 30, 8, 20);
      // Visor slit
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(kx - 10, ky - 20, 20, 4);

      // Gold Plume
      ctx.fillStyle = '#EAB308';
      ctx.fillRect(kx - 4, ky - 40, 8, 10);

      // Shield
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(kx - 26, ky - 2, 14, 26);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(kx - 22, ky + 4, 6, 14);

      // Sword
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(kx + 16, ky - 30, 4, 45);
      ctx.fillStyle = '#D97706';
      ctx.fillRect(kx + 12, ky + 14, 12, 4);
    }
  },
  {
    id: 'dos-waterfall',
    name: 'DOS Waterfall & Plasma',
    category: 'Palette Cycling Demo',
    description: 'Concentric river waves, cascade waterfall, and plasma bands designed for color cycling.',
    draw: (ctx, w, h) => {
      // Night mountain landscape with cascading waterfalls & plasma river
      // Mountain sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      skyGrad.addColorStop(0, '#09081E');
      skyGrad.addColorStop(0.7, '#1B143F');
      skyGrad.addColorStop(1, '#3B1F54');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.45);

      // Distant dark jagged peaks
      ctx.fillStyle = '#100D28';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.45);
      ctx.lineTo(w * 0.15, h * 0.22);
      ctx.lineTo(w * 0.32, h * 0.38);
      ctx.lineTo(w * 0.5, h * 0.18);
      ctx.lineTo(w * 0.68, h * 0.36);
      ctx.lineTo(w * 0.85, h * 0.2);
      ctx.lineTo(w, h * 0.45);
      ctx.closePath();
      ctx.fill();

      // Middle cliff cliffs
      ctx.fillStyle = '#1F1A3A';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.48);
      ctx.lineTo(w * 0.35, h * 0.48);
      ctx.lineTo(w * 0.38, h * 0.62);
      ctx.lineTo(0, h * 0.62);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(w, h * 0.48);
      ctx.lineTo(w * 0.65, h * 0.48);
      ctx.lineTo(w * 0.62, h * 0.62);
      ctx.lineTo(w, h * 0.62);
      ctx.closePath();
      ctx.fill();

      // Waterfall chute in center (w*0.36 to w*0.64)
      // Vertical ripples
      const wfLeft = w * 0.36;
      const wfRight = w * 0.64;
      const wfTop = h * 0.46;
      const wfBottom = h * 0.68;

      for (let y = wfTop; y < wfBottom; y += 3) {
        const t = (y - wfTop) / (wfBottom - wfTop);
        const wave = Math.sin(y * 0.15) * 120 + 128;
        ctx.fillStyle = `rgb(${Math.floor(wave * 0.2)}, ${Math.floor(wave * 0.6 + 50)}, ${Math.floor(wave)})`;
        ctx.fillRect(wfLeft, y, wfRight - wfLeft, 3);
      }

      // Foreground river / plasma pool with concentric flowing wave bands
      const poolTop = h * 0.66;
      for (let y = poolTop; y < h; y += 2) {
        const ny = (y - poolTop) / (h - poolTop);
        for (let x = 0; x < w; x += 4) {
          // Classic 2D demoscene plasma equation
          const v1 = Math.sin(x * 0.05);
          const v2 = Math.sin(y * 0.08 + x * 0.02);
          const v3 = Math.sin(Math.sqrt((x - w * 0.5) ** 2 + (y - poolTop) ** 2) * 0.12);
          const plasma = (v1 + v2 + v3) / 3; // -1 to 1
          const norm = (plasma + 1) * 0.5; // 0 to 1

          const r = Math.floor(Math.sin(norm * Math.PI * 2) * 60 + 60);
          const g = Math.floor(Math.sin(norm * Math.PI * 2 + 2) * 110 + 120);
          const b = Math.floor(Math.cos(norm * Math.PI * 2) * 100 + 155);

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x, y, 4, 2);
        }
      }

      // Torches / lamps at river banks
      ctx.fillStyle = '#FFDD55';
      ctx.fillRect(w * 0.25, poolTop + 10, 8, 8);
      ctx.fillRect(w * 0.75, poolTop + 10, 8, 8);
    }
  }
];
