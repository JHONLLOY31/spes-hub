// Beneficiary Attendance QR Pass (Profile + PNG Download) & Admin Live QR Scanner.
window.SPES = window.SPES || {};

SPES.QrView = {
  _scanner: null,
  _busy: false,
  _lastCode: '',
  _lastAt: 0,
  e(s) { return SPES.View.esc(s || ''); },

  payloadOf(u) {
    return `SPESQR:${u.spesId || 'NONE'}:${u.id}`;
  },

  // Draw QR matrix onto any canvas using qrcode-generator (zero external image requests)
  drawQrOnCanvas(canvas, text, size = 240) {
    if (!canvas || typeof window.qrcode !== 'function') return false;
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const pad = 12;
    const cell = Math.floor((size - pad * 2) / count);
    const actual = cell * count + pad * 2;
    canvas.width = actual;
    canvas.height = actual;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, actual, actual);
    ctx.fillStyle = '#111111';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) ctx.fillRect(pad + c * cell, pad + r * cell, cell, cell);
      }
    }
    return true;
  },

  // Beneficiary Profile section: Attendance QR Pass
  profileSection(u) {
    const code = this.payloadOf(u);
    return `<div class="card qr-pass-wrap">
      <div class="ch">
        <div>
          <h2 style="margin:0">My Attendance QR Code</h2>
          <p class="muted" style="margin:.2rem 0 0">Show this QR code to the Administrator's scanner for instant auto-approved Time-In / Time-Out (or upload a proof photo in Attendance).</p>
        </div>
        <span class="tag gold">${this.e(u.batch || 'No Batch')}</span>
      </div>
      <div class="qr-card-preview">
        <div class="qr-card-top">
          ${SPES.View.av(u, 'xl')}
          <div>
            <b>${this.e(u.name)}</b>
            <div class="qr-meta"><span>ID: <b>${this.e(u.spesId || 'Pending')}</b></span> · <span>Batch: <b>${this.e(u.batch || '—')}</b></span></div>
          </div>
        </div>
        <div class="qr-box">
          <canvas id="myQrCanvas" data-qr="${this.e(code)}" width="220" height="220"></canvas>
        </div>
        <small class="muted">Unique SPES Attendance Pass · Scan at Duty Station</small>
      </div>
      <div class="row" style="justify-content:center;margin-top:.8rem">
        <button type="button" class="btn" data-act="dl_qr">Download Attendance QR (PNG)</button>
      </div>
    </div>`;
  },

  hydrateProfileQr() {
    const c = document.getElementById('myQrCanvas');
    if (c && c.dataset.qr) this.drawQrOnCanvas(c, c.dataset.qr, 220);
  },

  // High-res downloadable Attendance QR Pass PNG (Yellow/Black/White with Profile Photo + Name + ID + Batch + QR)
  async downloadPass(u) {
    const W = 640, H = 900;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // Yellow background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#ffd84d'); bg.addColorStop(1, '#ffc400');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Black header
    ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, W, 118);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffc400'; ctx.font = '800 30px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('SPES HUB ATTENDANCE QR', W / 2, 46);
    ctx.fillStyle = '#ffffff'; ctx.font = '600 18px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('Davao Oriental Provincial Capitol · PESO', W / 2, 84);

    // White card body
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(42, 148, W - 84, H - 220, 26); ctx.fill();
    ctx.strokeStyle = '#111111'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(42, 148, W - 84, H - 220, 26); ctx.stroke();

    // Circular profile photo
    const avatar = u.avatar ? await SPES.IdCard.loadImg(u.avatar) : null;
    const ax = W / 2, ay = 236, ar = 62;
    ctx.save();
    ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.clip();
    if (avatar) {
      const s = Math.max((ar * 2) / avatar.width, (ar * 2) / avatar.height);
      const dw = avatar.width * s, dh = avatar.height * s;
      ctx.drawImage(avatar, ax - dw / 2, ay - dh / 2, dw, dh);
    } else {
      ctx.fillStyle = '#ffc400'; ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
      ctx.fillStyle = '#111111'; ctx.font = '800 48px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText((u.name || '?')[0].toUpperCase(), ax, ay + 2);
    }
    ctx.restore();
    ctx.strokeStyle = '#111111'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.stroke();

    // Name, ID, Batch
    ctx.fillStyle = '#111111'; ctx.font = '800 28px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(String(u.name || '').toUpperCase().slice(0, 32), W / 2, 336);
    ctx.fillStyle = '#111111';
    ctx.beginPath(); ctx.roundRect(W / 2 - 210, 362, 420, 44, 22); ctx.fill();
    ctx.fillStyle = '#ffc400'; ctx.font = '800 20px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(`ID: ${u.spesId || 'PENDING'}   ·   BATCH: ${u.batch || '—'}`, W / 2, 384);

    // Crisp QR code in center
    const qrCanvas = document.createElement('canvas');
    this.drawQrOnCanvas(qrCanvas, this.payloadOf(u), 350);
    ctx.drawImage(qrCanvas, (W - qrCanvas.width) / 2, 434);

    // Footer instruction
    ctx.fillStyle = '#111111'; ctx.font = '700 18px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText('Present to Admin QR Scanner for Instant Attendance', W / 2, H - 36);

    const slug = (u.spesId || u.username || 'SPES-QR').replace(/[^A-Za-z0-9_-]/g, '');
    const a = document.createElement('a');
    a.download = `${slug}-ATTENDANCE-QR.png`;
    a.href = c.toDataURL('image/png');
    document.body.appendChild(a); a.click(); a.remove();
  },

  // Admin QR Scanner page
  adminScanner(slot, lastResult, todayScans, m) {
    const slots = [
      ['AUTO', 'Auto-detect by time (Recommended)'],
      ['AM_IN', 'Morning Time-In (7:00 AM+)'],
      ['AM_OUT', 'Morning Time-Out (12:00 PM+)'],
      ['PM_IN', 'Afternoon Time-In (12:30 PM+)'],
      ['PM_OUT', 'Afternoon Time-Out (5:00 PM+)']
    ];
    return `<h1>QR Attendance Scanner</h1>
      <p class="muted">Scan a beneficiary's Attendance QR Pass to immediately record and approve their Time-In or Time-Out (no extra approval needed).</p>
      ${SPES.View.msg(m)}
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:flex-end;margin-bottom:.8rem">
          <div style="flex:1;min-width:220px">
            <label for="qrSlotPick" style="margin-top:0">Attendance Slot</label>
            <select id="qrSlotPick" data-act="qrslot">${slots.map(([k, l]) => `<option value="${k}" ${slot === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          </div>
          <div class="row">
            <button type="button" class="btn" style="margin:0" data-act="qr_start">Start Camera Scanner</button>
            <button type="button" class="btn alt" style="margin:0" data-act="qr_stop">Stop Camera</button>
          </div>
        </div>
        <div id="qrReader" class="qr-reader"></div>
        <form data-form="qr_manual" class="row" style="margin-top:.9rem">
          <input name="code" placeholder="Or type SPES ID manually (e.g. B1-2026-0001)" required style="flex:1;min-width:200px">
          <button class="btn" type="submit" style="margin:0">Record Attendance</button>
        </form>
      </div>
      ${lastResult ? `<div class="card qr-result">
        <div class="mwho">${SPES.View.av(lastResult.beneficiary, 'xl')}
          <div>
            <span class="tag ok">✓ Attendance Approved via QR</span>
            <h2 style="margin:.35rem 0 .15rem">${this.e(lastResult.beneficiary.name)}</h2>
            <div class="muted">ID: <b>${this.e(lastResult.beneficiary.spesId || '—')}</b> · Batch: <b>${this.e(lastResult.beneficiary.batch || '—')}</b></div>
            <p style="margin:.45rem 0 0"><b>${this.e(lastResult.slotLabel)}</b> · ${lastResult.lateMinutes ? `<span class="tag bad">Late ${lastResult.lateMinutes} min (−${lastResult.pointsDeducted} pts)</span>` : '<span class="tag ok">On time</span>'}</p>
          </div>
        </div>
      </div>` : ''}
      <div class="card">
        <h3>Today's QR Scans (${todayScans.length})</h3>
        <div class="tablewrap"><table class="stack">
          <tr><th>Beneficiary</th><th>Batch / ID</th><th>Slot</th><th>Time</th><th>Status</th></tr>
          ${todayScans.map(s => `<tr>
            <td data-label="Beneficiary"><b>${this.e(s.name)}</b></td>
            <td data-label="Batch / ID">${this.e(s.spesId || '—')} · ${this.e(s.batch || '—')}</td>
            <td data-label="Slot">${this.e(s.label)}</td>
            <td data-label="Time">${SPES.View.when(s.submittedAt)}</td>
            <td data-label="Status">${s.lateMinutes ? `<span class="tag bad">Late ${s.lateMinutes}m (−${s.pointsDeducted} pts)</span>` : '<span class="tag ok">On time · Approved</span>'}</td>
          </tr>`).join('') || '<tr><td colspan="5" class="muted">No QR scans yet today.</td></tr>'}
        </table></div>
      </div>`;
  },

  async startCamera(onCode) {
    await this.stopCamera();
    const el = document.getElementById('qrReader');
    if (!el) return;
    if (typeof window.Html5Qrcode !== 'function') {
      el.innerHTML = '<p class="msg">Camera QR library failed to load. You can still type the SPES ID below.</p>';
      return;
    }
    try {
      this._scanner = new window.Html5Qrcode('qrReader');
      await this._scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        decoded => {
          const now = Date.now();
          if (this._busy || (decoded === this._lastCode && now - this._lastAt < 4000)) return;
          this._lastCode = decoded;
          this._lastAt = now;
          onCode(decoded);
        },
        () => {}
      );
    } catch (err) {
      el.innerHTML = `<p class="msg">Could not open camera (${this.e(err && err.message ? err.message : 'permission denied')}). Allow camera access or type the SPES ID below.</p>`;
    }
  },

  async stopCamera() {
    if (this._scanner) {
      try { await this._scanner.stop(); } catch {}
      try { this._scanner.clear(); } catch {}
      this._scanner = null;
    }
  }
};
