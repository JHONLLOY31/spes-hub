// SPES ID Card Generator — Live Front & Back preview + 300-DPI printable PNG downloads.
// Color palette: Yellow 50% (#ffc400/#ffd84d), Black 25% (#111111), White 25% (#ffffff).
window.SPES = window.SPES || {};

SPES.IdCard = {
  e(s) { return SPES.View.esc(s || ''); },

  dataOf(u) {
    const c = (u && u.settings && u.settings.idCard) || {};
    return {
      fullName: (c.fullName || (u && u.name) || '').trim(),
      nickname: (c.nickname || '').trim(),
      address: (c.address || '').trim(),
      contact: (c.contact || '').trim(),
      emgName: (c.emgName || '').trim(),
      emgRel: (c.emgRel || '').trim(),
      emgContact: (c.emgContact || '').trim(),
      effectivity: (c.effectivity || '').trim(),
      photo: c.photo || (u && u.avatar) || '',
      spesId: (u && u.spesId) || 'SPES-2026-0001'
    };
  },

  section(u) {
    const d = this.dataOf(u);
    const emgLine = d.emgName ? (d.emgRel ? `${d.emgName} (${d.emgRel})` : d.emgName) : '—';
    return `<div class="card idc-wrap">
      <div class="ch">
        <div>
          <h2 style="margin:0">My SPES ID Card</h2>
          <p class="muted" style="margin:.2rem 0 0">Fill in your details below to automatically generate your official-style Front &amp; Back SPES ID card and download it ready to print.</p>
        </div>
        <span class="tag gold">${this.e(d.spesId)}</span>
      </div>

      <div class="idc-stage">
        <!-- FRONT CARD -->
        <div class="idc-col">
          <span class="idc-side-lbl">FRONT</span>
          <div class="idc-card idc-front">
            <div class="idc-top">
              <img src="img/seal-dvo.png" alt="Davao Oriental Seal">
              <div class="idc-gov">
                <span>Republic of the Philippines</span>
                <b>Province of Davao Oriental</b>
                <span>Public Employment Service Office</span>
              </div>
              <img src="img/logo-peso.png" alt="PESO Logo">
            </div>
            <div class="idc-subbar">
              <small>SPECIAL PROGRAM FOR EMPLOYMENT OF STUDENTS</small>
              <b>PESO DAVAO ORIENTAL</b>
            </div>
            <div class="idc-body">
              <img class="idc-wm" src="img/logo-spes.png" alt="" aria-hidden="true">
              <div class="idc-vstrip"><span>SPES BENEFICIARY</span></div>
              <div class="idc-main">
                <div class="idc-photo-box">
                  ${d.photo ? `<img src="${d.photo}" alt="Formal ID photo">` : `<div class="idc-photo-empty">Upload<br>Formal Photo</div>`}
                </div>
                <div class="idc-nick">${this.e((d.nickname || d.fullName.split(' ')[0] || 'NICKNAME').toUpperCase())}</div>
                <div class="idc-fullname">${this.e((d.fullName || 'COMPLETE NAME').toUpperCase())}</div>
                <div class="idc-role">SPES BENEFICIARY · ${this.e(d.spesId)}</div>
                <div class="idc-sig">
                  <b>JAY O. DAYANGHIRANG</b>
                  <span>PESO Officer In-Charge</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- BACK CARD -->
        <div class="idc-col">
          <span class="idc-side-lbl">BACK</span>
          <div class="idc-card idc-back">
            <div class="idc-back-head">
              <img src="img/logo-spes.png" alt="SPES Logo">
              <div>
                <b>SPES BENEFICIARY ID</b>
                <small>${this.e(d.spesId)}</small>
              </div>
            </div>
            <div class="idc-back-body">
              <img class="idc-wm" src="img/logo-spes.png" alt="" aria-hidden="true">
              <div class="idc-fld">
                <span>ADDRESS:</span>
                <div class="idc-box">${this.e(d.address || 'Enter your complete address')}</div>
              </div>
              <div class="idc-fld">
                <span>CONTACT NUMBER:</span>
                <div class="idc-box">${this.e(d.contact || '09XX XXX XXXX')}</div>
              </div>
              <div class="idc-emg-lbl">IN CASE OF EMERGENCY, CONTACT:</div>
              <div class="idc-box">${this.e(emgLine)}</div>
              <div class="idc-box" style="margin-top:.45rem">${this.e(d.emgContact || '09XX XXX XXXX')}</div>
            </div>
            <div class="idc-back-foot">
              <small>Effectivity of Duty</small>
              <b>${this.e((d.effectivity || 'JUNE - JULY 2026').toUpperCase())}</b>
            </div>
          </div>
        </div>
      </div>

      <div class="row idc-dl-bar">
        <button type="button" class="btn" data-act="dl_id" data-side="both">Download Front &amp; Back (PNG)</button>
        <button type="button" class="btn alt" data-act="dl_id" data-side="front">Download Front Only</button>
        <button type="button" class="btn alt" data-act="dl_id" data-side="back">Download Back Only</button>
      </div>

      <form data-form="idcard" class="idc-form">
        <h3 style="margin:1.1rem 0 .4rem">ID Card Details</h3>
        <div class="idc-photo-row">
          <label class="btn alt avl" style="margin:0">Upload Formal ID Photo<input type="file" class="idpick" accept="image/*" hidden></label>
          <span class="muted">Uses your profile photo automatically if you don't upload a separate formal photo.</span>
        </div>
        <div class="idc-grid">
          <div><label>Complete Name</label><input name="fullName" required value="${this.e(d.fullName)}" placeholder="e.g. Jhon Lloyd G. Javilles"></div>
          <div><label>Nickname</label><input name="nickname" required value="${this.e(d.nickname)}" placeholder="e.g. Jhong"></div>
          <div style="grid-column:1/-1"><label>Address</label><input name="address" required value="${this.e(d.address)}" placeholder="e.g. Camansi, Brgy. Badas, Mati City, Davao Oriental"></div>
          <div><label>Contact Number</label><input name="contact" required value="${this.e(d.contact)}" placeholder="e.g. 0965 935 0905"></div>
          <div><label>Effectivity of Duty</label><input name="effectivity" required value="${this.e(d.effectivity)}" placeholder="e.g. JUNE - JULY 2026"></div>
          <div><label>Emergency Contact Name</label><input name="emgName" required value="${this.e(d.emgName)}" placeholder="e.g. Evangeline Javilles"></div>
          <div><label>Relationship</label><input name="emgRel" required value="${this.e(d.emgRel)}" placeholder="e.g. Mother / Father / Guardian"></div>
          <div><label>Emergency Contact Number</label><input name="emgContact" required value="${this.e(d.emgContact)}" placeholder="e.g. 0997 825 0965"></div>
        </div>
        <button class="btn" type="submit">Save ID Card Details</button>
      </form>
    </div>`;
  },

  loadImg(src) {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  wrapText(ctx, text, x, y, maxW, lineH, maxLines = 3) {
    const words = String(text || '—').split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    const shown = lines.slice(0, maxLines);
    const startY = y - ((shown.length - 1) * lineH) / 2;
    shown.forEach((ln, i) => ctx.fillText(ln, x, startY + i * lineH));
  },

  drawChevronPattern(ctx, x, y, w, h) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = 'rgba(17,17,17,0.06)';
    ctx.lineWidth = 2;
    for (let row = y - 20; row < y + h + 40; row += 36) {
      ctx.beginPath();
      for (let col = x - 20; col < x + w + 40; col += 48) {
        ctx.moveTo(col, row + 16);
        ctx.lineTo(col + 24, row);
        ctx.lineTo(col + 48, row + 16);
      }
      ctx.stroke();
    }
    ctx.restore();
  },

  async renderFrontCanvas(d, imgs) {
    const W = 638, H = 1011;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // Yellow main background (50%)
    const bg = ctx.createLinearGradient(0, 150, 0, H);
    bg.addColorStop(0, '#ffd84d');
    bg.addColorStop(0.55, '#ffc400');
    bg.addColorStop(1, '#efb200');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    this.drawChevronPattern(ctx, 0, 220, W, H - 220);

    // White top header (25%)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, 154);

    if (imgs.dvo) ctx.drawImage(imgs.dvo, 26, 22, 108, 108);
    if (imgs.peso) ctx.drawImage(imgs.peso, W - 134, 22, 108, 108);

    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 18px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText('Republic of the Philippines', W / 2, 48);
    ctx.font = '800 22px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText('Province of Davao Oriental', W / 2, 78);
    ctx.font = '600 17px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText('Public Employment Service Office', W / 2, 108);

    // Black sub-header bar (part of Black 25%)
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 154, W, 78);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 15px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText('SPECIAL PROGRAM FOR EMPLOYMENT OF STUDENTS', W / 2, 178);
    ctx.fillStyle = '#ffc400';
    ctx.font = '800 26px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText('PESO DAVAO ORIENTAL', W / 2, 209);

    // Subtle SPES watermark
    if (imgs.spes) {
      ctx.save();
      ctx.globalAlpha = 0.13;
      ctx.drawImage(imgs.spes, 128, 300, 440, 440);
      ctx.restore();
    }

    // Left vertical black banner strip (matching sample 4's vertical text)
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 232, 82, H - 232);
    ctx.save();
    ctx.translate(42, 622);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#ffc400';
    ctx.font = '800 44px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPES BENEFICIARY', 0, 0);
    ctx.restore();

    const cx = 82 + (W - 82) / 2;

    // Formal Photo with crisp white & black border
    const pw = 290, ph = 310, px = cx - pw / 2, py = 278;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#ffffff';
    this.roundRect(ctx, px - 8, py - 8, pw + 16, ph + 16, 22);
    ctx.fill();
    ctx.restore();

    ctx.save();
    this.roundRect(ctx, px, py, pw, ph, 16);
    ctx.clip();
    if (imgs.photo) {
      // Cover-crop photo cleanly
      const scale = Math.max(pw / imgs.photo.width, ph / imgs.photo.height);
      const dw = imgs.photo.width * scale, dh = imgs.photo.height * scale;
      ctx.drawImage(imgs.photo, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = '#f3f3f3';
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = '#777777';
      ctx.font = '700 22px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('FORMAL PHOTO', cx, py + ph / 2);
    }
    ctx.restore();

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 4;
    this.roundRect(ctx, px, py, pw, ph, 16);
    ctx.stroke();

    // Nickname black pill
    const nick = (d.nickname || d.fullName.split(' ')[0] || 'NICKNAME').toUpperCase();
    ctx.fillStyle = '#111111';
    this.roundRect(ctx, cx - 175, 622, 350, 66, 33);
    ctx.fill();
    ctx.fillStyle = '#ffc400';
    ctx.font = '800 36px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText(nick.slice(0, 18), cx, 656);

    // Complete Name
    ctx.fillStyle = '#111111';
    ctx.font = '800 30px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    this.wrapText(ctx, (d.fullName || 'COMPLETE NAME').toUpperCase(), cx, 738, 490, 36, 2);

    ctx.font = '700 18px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText(`SPES BENEFICIARY  ·  ${d.spesId}`, cx, 796);

    // Bottom Signatory Bar
    ctx.fillStyle = '#ffffff';
    this.roundRect(ctx, cx - 220, 845, 440, 118, 16);
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 3;
    this.roundRect(ctx, cx - 220, 845, 440, 118, 16);
    ctx.stroke();

    ctx.fillStyle = '#111111';
    ctx.font = '800 25px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText('JAY O. DAYANGHIRANG', cx, 892);
    ctx.fillRect(cx - 165, 912, 330, 3);
    ctx.font = '600 18px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText('PESO Officer In-Charge', cx, 938);

    return c;
  },

  async renderBackCanvas(d, imgs) {
    const W = 638, H = 1011;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // Yellow main body (50%)
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#ffd84d');
    bg.addColorStop(0.55, '#ffc400');
    bg.addColorStop(1, '#e6aa00');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    this.drawChevronPattern(ctx, 0, 120, W, H - 240);

    // Subtle SPES watermark
    if (imgs.spes) {
      ctx.save();
      ctx.globalAlpha = 0.11;
      ctx.drawImage(imgs.spes, (W - 430) / 2, 260, 430, 430);
      ctx.restore();
    }

    // Black header (part of 25% Black)
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, W, 126);
    if (imgs.spes) ctx.drawImage(imgs.spes, 34, 21, 84, 84);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffc400';
    ctx.font = '800 26px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText('SPES BENEFICIARY ID', 138, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 18px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText(`ID No.: ${d.spesId}  ·  PESO Davao Oriental`, 138, 84);

    // Helper for White boxes (25% White)
    const drawField = (label, val, y, boxH) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#111111';
      ctx.font = '800 22px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
      ctx.fillText(label, 52, y);
      ctx.fillStyle = '#ffffff';
      this.roundRect(ctx, 48, y + 22, W - 96, boxH, 14);
      ctx.fill();
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 3;
      this.roundRect(ctx, 48, y + 22, W - 96, boxH, 14);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#111111';
      ctx.font = '700 24px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
      this.wrapText(ctx, val || '—', W / 2, y + 22 + boxH / 2, W - 136, 30, 3);
    };

    drawField('ADDRESS:', d.address, 185, 118);
    drawField('CONTACT NUMBER:', d.contact, 375, 86);

    // Emergency Contact Section
    ctx.textAlign = 'center';
    ctx.fillStyle = '#111111';
    ctx.font = '800 22px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText('IN CASE OF EMERGENCY, CONTACT:', W / 2, 558);

    const emgLine = d.emgName ? (d.emgRel ? `${d.emgName} (${d.emgRel})` : d.emgName) : '—';
    ctx.fillStyle = '#ffffff';
    this.roundRect(ctx, 48, 586, W - 96, 86, 14); ctx.fill();
    ctx.strokeStyle = '#111111'; ctx.lineWidth = 3;
    this.roundRect(ctx, 48, 586, W - 96, 86, 14); ctx.stroke();
    ctx.fillStyle = '#111111';
    ctx.font = '700 24px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    this.wrapText(ctx, emgLine, W / 2, 629, W - 136, 28, 2);

    ctx.fillStyle = '#ffffff';
    this.roundRect(ctx, 48, 694, W - 96, 84, 14); ctx.fill();
    ctx.strokeStyle = '#111111'; ctx.lineWidth = 3;
    this.roundRect(ctx, 48, 694, W - 96, 84, 14); ctx.stroke();
    ctx.fillStyle = '#111111';
    ctx.font = '700 26px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText(d.emgContact || '—', W / 2, 736);

    // Black Effectivity of Duty footer (part of 25% Black)
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, H - 146, W, 146);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 20px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText('Effectivity of Duty', W / 2, H - 96);
    ctx.fillStyle = '#ffc400';
    ctx.font = '800 30px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
    ctx.fillText((d.effectivity || 'JUNE - JULY 2026').toUpperCase(), W / 2, H - 52);

    return c;
  },

  async download(u, side = 'both') {
    const d = this.dataOf(u);
    const [dvo, peso, spes, photo] = await Promise.all([
      this.loadImg('img/seal-dvo.png'),
      this.loadImg('img/logo-peso.png'),
      this.loadImg('img/logo-spes.png'),
      this.loadImg(d.photo)
    ]);
    const imgs = { dvo, peso, spes, photo };
    let out, name;
    const slug = (d.spesId || 'SPES-ID').replace(/[^A-Za-z0-9_-]/g, '');

    if (side === 'front') {
      out = await this.renderFrontCanvas(d, imgs);
      name = `${slug}-FRONT.png`;
    } else if (side === 'back') {
      out = await this.renderBackCanvas(d, imgs);
      name = `${slug}-BACK.png`;
    } else {
      const f = await this.renderFrontCanvas(d, imgs);
      const b = await this.renderBackCanvas(d, imgs);
      out = document.createElement('canvas');
      out.width = f.width * 2 + 84;
      out.height = f.height + 64;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(f, 28, 32);
      ctx.drawImage(b, f.width + 56, 32);
      name = `${slug}-ID-CARD.png`;
    }

    const a = document.createElement('a');
    a.download = name;
    a.href = out.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
};
