// Complete 7-Section Personal Information Sheet (PIS):
// 1. Required fill-up right after beneficiary registration (before admin approval)
// 2. Read-only view inside Beneficiary Profile
// 3. Admin "Personal Information" tab separated by Batch -> Beneficiary Names + Search -> Full Sheet
window.SPES = window.SPES || {};

SPES.PisView = {
  e(s) { return SPES.View.esc(s == null ? '' : String(s)); },
  TRAITS: [
    'Responsible','Hardworking','Honest','Friendly','Shy / Reserved','Patient','Creative','Independent','Confident','Cooperative / Team player',
    'Punctual','Organized','Respectful','Cheerful / Optimistic','Compassionate / Caring','Determined / Persistent','Adaptable / Flexible','Curious / Eager to learn','Good listener','Leadership-oriented',
    'Calm under pressure','Sensitive / Emotional','Easily stressed / Anxious','Quiet / Introverted','Outgoing / Extroverted','Humble','Resourceful','Disciplined','Helpful','Trustworthy'
  ],
  BOTHERS: [
    'Financial problems / family income',
    'Academic pressure / studies',
    'Balancing work and school',
    'Family problems / misunderstandings',
    'Health / physical well-being',
    'Stress, anxiety, or emotional concerns',
    'Peer pressure / relationship with friends'
  ],

  form(seed = {}, m = null, postLogin = false) {
    const today = new Date().toLocaleDateString('en-CA');
    const chk = (name, vals) => `<div class="pis-chks">${vals.map(v => `<label class="pis-chk"><input type="checkbox" name="${name}" value="${this.e(v)}"><span>${this.e(v)}</span></label>`).join('')}</div>`;
    const rad = (name, vals, def = '') => `<div class="pis-chks">${vals.map((v, i) => `<label class="pis-chk"><input type="radio" name="${name}" value="${this.e(v)}" ${(def ? v === def : i === 0) ? 'checked' : ''} required><span>${this.e(v)}</span></label>`).join('')}</div>`;

    return `<div class="pis-page">
      <div class="pis-shell">
        <div class="pis-banner">
          <img src="img/logo.png" alt="SPES Logo">
          <div>
            <h1>Personal Information Sheet</h1>
            <p class="muted">${postLogin
              ? 'Welcome to SPES Hub! Before entering your dashboard, please complete all sections of your Personal Information Sheet below. Your information will be saved to your profile.'
              : 'Complete all sections below to finish your SPES Hub registration. Your information will go to your profile and will be reviewed by the Administrator before approval.'}</p>
          </div>
          <button type="button" class="btn alt" data-act="${postLogin ? 'logout' : 'pis_cancel'}" style="margin:0 0 0 auto">${postLogin ? 'Log out' : 'Back'}</button>
        </div>
        ${SPES.View.msg(m)}
        <form data-form="pis_submit" class="pis-form">
          <!-- TOP HEADER -->
          <section class="card pis-sec">
            <div class="pis-top-grid">
              <div class="pis-photo-up">
                <div class="pis-photo-pv pv"><span>1x1 or 2x2<br>ID Photo</span></div>
                <label class="btn alt avl" style="margin:.45rem 0 0">Upload ID Photo<input type="file" name="pisPhoto" class="pick" accept="image/*" hidden></label>
              </div>
              <div class="pis-grid">
                <div><label>Date</label><input name="formDate" type="date" value="${today}" required></div>
                <div><label>Position / Assignment</label><input name="position" required placeholder="e.g. Office Assistant / Media Team"></div>
                <div style="grid-column:1/-1">
                  <label>Program / Employment Type</label>
                  ${rad('programType', ['SPES / Summer Job', 'Working Student / Student Assistant', 'Internship / OJT', 'Others'], 'SPES / Summer Job')}
                  <input name="programOther" placeholder="If Others, specify..." style="margin-top:.35rem">
                </div>
              </div>
            </div>
          </section>

          <!-- I. PERSONAL INFORMATION -->
          <section class="card pis-sec">
            <h2>I. Personal Information</h2>
            <div class="pis-grid">
              <div style="grid-column:1/-1"><label>Full Name (Last, First, Middle)</label><input name="fullName" required value="${this.e(seed.name || '')}" placeholder="e.g. Javilles, Jhon Lloyd G."></div>
              <div><label>Nickname</label><input name="nickname" required placeholder="e.g. Jhong"></div>
              <div><label>Sex / Gender</label><select name="sex" required><option value="Male" ${seed.gender === 'Male' ? 'selected' : ''}>Male</option><option value="Female" ${seed.gender === 'Female' ? 'selected' : ''}>Female</option><option value="Prefer not to say">Prefer not to say</option></select></div>
              <div><label>Date of Birth</label><input name="dob" type="date" required></div>
              <div><label>Place of Birth</label><input name="pob" required placeholder="City / Municipality, Province"></div>
              <div><label>Age</label><input name="age" type="number" min="15" max="40" required></div>
              <div><label>Civil Status</label><select name="civilStatus" required><option>Single</option><option>Married</option><option>Others</option></select></div>
              <div><label>Citizenship</label><input name="citizenship" required value="Filipino"></div>
              <div><label>Religion</label><input name="religion" required placeholder="e.g. Roman Catholic"></div>
              <div style="grid-column:1/-1"><label>Present Address</label><input name="presentAddress" required placeholder="Purok/Street, Barangay, City/Municipality, Province"></div>
              <div style="grid-column:1/-1"><label>Permanent Address</label><input name="permanentAddress" required placeholder="Purok/Street, Barangay, City/Municipality, Province"></div>
              <div style="grid-column:1/-1">
                <label>Living Arrangement</label>
                ${rad('livingArrangement', ['With Parents', 'With Relatives', 'Boarding House / Dorm', 'Living Alone', 'Others'], 'With Parents')}
                <input name="livingOther" placeholder="If Others, specify..." style="margin-top:.35rem">
              </div>
              <div><label>Mobile Number</label><input name="mobile" required placeholder="e.g. 0965 935 0905"></div>
              <div><label>Email Address</label><input name="email" type="email" required value="${this.e(seed.email || '')}" placeholder="e.g. name@gmail.com"></div>
            </div>
            <h3 style="margin-top:1rem">Health &amp; Medical Information <small class="muted">(for safety and emergency purposes)</small></h3>
            <div class="pis-grid">
              <div><label>Known Allergies</label><input name="allergies" required placeholder='Write "None" if not applicable' value="None"></div>
              <div><label>Medical Conditions / Maintenance Medications</label><input name="medicalConditions" required placeholder='Write "None" if not applicable' value="None"></div>
            </div>
          </section>

          <!-- II. SPECIAL CLASSIFICATION & PWD STATUS -->
          <section class="card pis-sec">
            <h2>II. Special Classification &amp; PWD Status</h2>
            <div class="pis-grid">
              <div><label>Person with Disability (PWD)?</label>${rad('isPwd', ['No', 'Yes'], 'No')}</div>
              <div><label>If Yes, Type of Disability</label><input name="pwdType" placeholder="Leave blank if No"></div>
              <div><label>PWD ID Number (if applicable)</label><input name="pwdId" placeholder="Optional"></div>
              <div><label>Require workplace or task accommodations?</label>${rad('needsAccom', ['No', 'Yes'], 'No')}</div>
              <div style="grid-column:1/-1"><label>If Yes, please specify accommodations</label><input name="accomDetails" placeholder="Leave blank if No"></div>
              <div style="grid-column:1/-1"><label>Other Classifications (check all that apply)</label>${chk('otherClass', ['Indigenous People (IP)', 'Solo Parent / Child of Solo Parent', '4Ps Beneficiary', 'None'])}</div>
            </div>
          </section>

          <!-- III. STUDENT / YOUTH STATUS & ACADEMIC DETAILS -->
          <section class="card pis-sec">
            <h2>III. Student / Youth Status &amp; Academic Details</h2>
            <label>Applicant Status</label>
            ${rad('applicantStatus', ['Currently Enrolled Student', 'Out-of-School Youth (OSY)', 'Graduating / Recent Graduate'], 'Currently Enrolled Student')}
            <div class="pis-grid" style="margin-top:.6rem">
              <div style="grid-column:1/-1"><label>School / University Name</label><input name="schoolName" required placeholder="e.g. Davao Oriental State University"></div>
              <div><label>Student ID Number</label><input name="studentId" placeholder="Optional for OSY"></div>
              <div><label>Course / Strand / Track</label><input name="course" required placeholder="e.g. BSIT / STEM"></div>
              <div><label>Current Year / Grade Level</label><input name="currentYear" required placeholder="e.g. 3rd Year College / Grade 12"></div>
              <div><label>Incoming Year / Grade Level</label><input name="incomingYear" placeholder="e.g. 4th Year College"></div>
              <div><label>School Year / Semester</label><input name="schoolYear" required placeholder="e.g. 2026-2027 / 1st Sem"></div>
              <div><label>Currently a Scholar / Financial Aid Recipient?</label>${rad('isScholar', ['No', 'Yes'], 'No')}<input name="scholarDetails" placeholder="If Yes, specify scholarship..." style="margin-top:.35rem"></div>
              <div><label>Last School Year Attended (if OSY)</label><input name="osyLastYear" placeholder="Leave blank if enrolled"></div>
              <div><label>Reason for Being Out of School (if OSY)</label><input name="osyReason" placeholder="Leave blank if enrolled"></div>
            </div>
            <h3 style="margin-top:1rem">Educational History</h3>
            <div class="tablewrap">
              <table>
                <tr><th>Level</th><th>School Name</th><th>Year Graduated / Last Attended</th></tr>
                ${['College', 'Senior High School', 'Junior High School', 'Elementary'].map((lvl, idx) => `<tr>
                  <td><b>${lvl}</b></td>
                  <td><input name="eduSchool_${idx}" placeholder="School name"></td>
                  <td><input name="eduYear_${idx}" placeholder="e.g. 2024"></td>
                </tr>`).join('')}
              </table>
            </div>
          </section>

          <!-- IV. FAMILY / GUARDIAN & EMERGENCY CONTACT -->
          <section class="card pis-sec">
            <h2>IV. Family / Guardian &amp; Emergency Contact</h2>
            <h3>Parents / Guardian</h3>
            <div class="pis-grid pis-grid3">
              <div><label>Father's Name</label><input name="fatherName" required></div>
              <div><label>Occupation</label><input name="fatherOcc"></div>
              <div><label>Contact No.</label><input name="fatherContact"></div>
              <div><label>Mother's Name</label><input name="motherName" required></div>
              <div><label>Occupation</label><input name="motherOcc"></div>
              <div><label>Contact No.</label><input name="motherContact"></div>
            </div>
            <div class="pis-grid" style="margin-top:.6rem">
              <div style="grid-column:1/-1">
                <label>Parents' Status</label>
                ${rad('parentsStatus', ['Living Together', 'Separated', 'Solo Parent', 'Working Abroad (OFW)', 'Deceased'], 'Living Together')}
                <input name="parentsStatusNote" placeholder="If Deceased or other details, specify..." style="margin-top:.35rem">
              </div>
              <div><label>Number of Siblings</label><input name="siblings" type="number" min="0" max="25" required></div>
              <div><label>Birth Order (e.g. 2nd of 4)</label><input name="birthOrder" required placeholder="e.g. 2nd of 4"></div>
            </div>
            <div class="pis-grid pis-grid3" style="margin-top:.4rem">
              <div><label>Guardian's Name (if applicable)</label><input name="guardianName"></div>
              <div><label>Relationship</label><input name="guardianRel"></div>
              <div><label>Contact No.</label><input name="guardianContact"></div>
            </div>
            <h3 style="margin-top:1rem">Emergency Contact</h3>
            <div class="pis-grid">
              <div><label>Name</label><input name="emgName" required></div>
              <div><label>Relationship</label><input name="emgRel" required placeholder="e.g. Mother / Father"></div>
              <div><label>Address</label><input name="emgAddress" required></div>
              <div><label>Contact Number</label><input name="emgContact" required placeholder="e.g. 0997 825 0965"></div>
            </div>
          </section>

          <!-- V. SKILLS, INTERESTS & EXPERIENCE -->
          <section class="card pis-sec">
            <h2>V. Skills, Interests &amp; Experience</h2>
            <div class="pis-grid">
              <div><label>Skills</label><input name="skills" required placeholder="e.g. Encoding, Graphic Design, Public Speaking"></div>
              <div><label>Hobbies</label><input name="hobbies" required placeholder="e.g. Reading, Basketball, Photography"></div>
              <div style="grid-column:1/-1"><label>Talents</label><input name="talents" required placeholder="e.g. Singing, Drawing, Video Editing"></div>
            </div>
            <h3 style="margin-top:1rem">Prior Work / Volunteer Experience <small class="muted">(optional)</small></h3>
            <div class="tablewrap">
              <table>
                <tr><th>Organization / Company</th><th>Position / Role</th><th>Inclusive Dates</th></tr>
                ${[0, 1, 2].map(idx => `<tr>
                  <td><input name="expOrg_${idx}" placeholder="Organization / Company"></td>
                  <td><input name="expRole_${idx}" placeholder="Position / Role"></td>
                  <td><input name="expDates_${idx}" placeholder="e.g. June–July 2025"></td>
                </tr>`).join('')}
              </table>
            </div>
          </section>

          <!-- VI. SELF-ASSESSMENT -->
          <section class="card pis-sec">
            <h2>VI. Self-Assessment</h2>
            <label>1. What traits / characteristics do you think you possess? (Check as many as apply)</label>
            <div class="pis-traits">${this.TRAITS.map((t, i) => `<label class="pis-chk"><input type="checkbox" name="traits" value="${this.e(t)}"><span>${i + 1}. ${this.e(t)}</span></label>`).join('')}</div>

            <label style="margin-top:1rem">2. What bothers you most at the moment? (Check all that apply)</label>
            <div class="pis-chks col">${this.BOTHERS.map((b, i) => `<label class="pis-chk"><input type="checkbox" name="bothers" value="${this.e(b)}"><span>${i + 1}. ${this.e(b)}</span></label>`).join('')}</div>
            <input name="bothersOther" placeholder="8. Others (please specify)..." style="margin-top:.4rem">

            <label style="margin-top:1rem">3. Things you would like to talk about and discuss</label>
            <div class="pis-grid">
              <div><label>With Friends</label><textarea name="talkFriends" rows="2"></textarea></div>
              <div><label>With Family</label><textarea name="talkFamily" rows="2"></textarea></div>
              <div style="grid-column:1/-1"><label>With a Mentor / Guidance Counselor / Supervisor (optional)</label><textarea name="talkMentor" rows="2"></textarea></div>
            </div>

            <label style="margin-top:1rem">4. Strengths and Weaknesses</label>
            <div class="pis-grid">
              <div><label>Strengths</label><textarea name="strengths" rows="2" required></textarea></div>
              <div><label>Weaknesses</label><textarea name="weaknesses" rows="2" required></textarea></div>
            </div>

            <label style="margin-top:1rem">5. Goals &amp; Motivation</label>
            <div class="pis-grid">
              <div><label>What are your goals for this school year or after graduation?</label><textarea name="goals" rows="3" required></textarea></div>
              <div><label>Why do you want to work as a student employee?</label><textarea name="motivation" rows="3" required></textarea></div>
            </div>
          </section>

          <!-- VII. DATA PRIVACY CONSENT & CERTIFICATION -->
          <section class="card pis-sec pis-consent">
            <h2>VII. Data Privacy Consent &amp; Certification</h2>
            <p class="muted" style="line-height:1.55"><b>Data Privacy Notice:</b> All personal and sensitive information collected in this form will be treated with strict confidentiality and used solely for student employment evaluation, administration, and support purposes in compliance with applicable data privacy laws.</p>
            <label class="privacy-chk">
              <input type="checkbox" name="privacyConsent" value="1" required>
              <span>I have read and agree to the Data Privacy Notice above and consent to the collection and processing of my information for the stated purposes.</span>
            </label>
            <div class="row" style="margin-top:1rem">
              <button type="button" class="btn alt" data-act="${postLogin ? 'logout' : 'pis_cancel'}">${postLogin ? 'Log out' : 'Back'}</button>
              <button type="submit" class="btn">${postLogin ? 'Submit Personal Information &amp; Continue' : 'Submit Personal Information &amp; Register'}</button>
            </div>
          </section>
        </form>
      </div>
    </div>`;
  },

  collect(el) {
    const fd = new FormData(el);
    const val = k => String(fd.get(k) || '').trim();
    const all = k => fd.getAll(k).map(x => String(x).trim()).filter(Boolean);
    const levels = ['College', 'Senior High School', 'Junior High School', 'Elementary'];
    const education = levels.map((level, i) => ({ level, school: val('eduSchool_' + i), year: val('eduYear_' + i) })).filter(x => x.school || x.year);
    const experience = [0, 1, 2].map(i => ({ org: val('expOrg_' + i), role: val('expRole_' + i), dates: val('expDates_' + i) })).filter(x => x.org || x.role || x.dates);
    return {
      formDate: val('formDate'), position: val('position'),
      programType: val('programType'), programOther: val('programOther'),
      fullName: val('fullName'), nickname: val('nickname'), sex: val('sex'),
      dob: val('dob'), pob: val('pob'), age: val('age'), civilStatus: val('civilStatus'),
      citizenship: val('citizenship'), religion: val('religion'),
      presentAddress: val('presentAddress'), permanentAddress: val('permanentAddress'),
      livingArrangement: val('livingArrangement'), livingOther: val('livingOther'),
      mobile: val('mobile'), email: val('email'),
      allergies: val('allergies'), medicalConditions: val('medicalConditions'),
      isPwd: val('isPwd'), pwdType: val('pwdType'), pwdId: val('pwdId'),
      needsAccom: val('needsAccom'), accomDetails: val('accomDetails'),
      otherClass: all('otherClass'),
      applicantStatus: val('applicantStatus'), schoolName: val('schoolName'), studentId: val('studentId'),
      course: val('course'), currentYear: val('currentYear'), incomingYear: val('incomingYear'),
      schoolYear: val('schoolYear'), isScholar: val('isScholar'), scholarDetails: val('scholarDetails'),
      osyLastYear: val('osyLastYear'), osyReason: val('osyReason'), education,
      fatherName: val('fatherName'), fatherOcc: val('fatherOcc'), fatherContact: val('fatherContact'),
      motherName: val('motherName'), motherOcc: val('motherOcc'), motherContact: val('motherContact'),
      parentsStatus: val('parentsStatus'), parentsStatusNote: val('parentsStatusNote'),
      siblings: val('siblings'), birthOrder: val('birthOrder'),
      guardianName: val('guardianName'), guardianRel: val('guardianRel'), guardianContact: val('guardianContact'),
      emgName: val('emgName'), emgRel: val('emgRel'), emgAddress: val('emgAddress'), emgContact: val('emgContact'),
      skills: val('skills'), hobbies: val('hobbies'), talents: val('talents'), experience,
      traits: all('traits'), bothers: all('bothers'), bothersOther: val('bothersOther'),
      talkFriends: val('talkFriends'), talkFamily: val('talkFamily'), talkMentor: val('talkMentor'),
      strengths: val('strengths'), weaknesses: val('weaknesses'),
      goals: val('goals'), motivation: val('motivation'),
      privacyConsent: fd.get('privacyConsent') === '1'
    };
  },

  sheet(u, showBack = false) {
    const p = u && u.pis;
    if (!p) {
      return `${showBack ? SPES.View.back('pis_user', 'Back to batch list', '') : ''}<div class="card"><h3>${this.e(u.name)}</h3><p class="muted">This beneficiary registered before the Personal Information Sheet was added and has not submitted one yet.</p></div>`;
    }
    const row = (l, v) => `<div class="pis-kv"><span>${l}</span><b>${this.e(v || '—')}</b></div>`;
    const photo = p.photo || u.avatar;
    const consentAt = p.submittedAt || (u.settings && u.settings.privacyAcceptedAt);
    return `${showBack ? `<div class="row noprint" style="justify-content:space-between;margin-bottom:.8rem">${SPES.View.back('pis_user', 'Back to batch list', '')}<button type="button" class="btn alt" style="margin:0" onclick="window.print()">Print Sheet</button></div>` : ''}
      <div class="card pis-sheet">
        <div class="pis-sheet-head">
          ${photo ? `<img class="pis-sheet-photo" src="${photo}" alt="ID Photo">` : SPES.View.av(u, 'xl')}
          <div>
            <h2 style="margin:0">${this.e(p.fullName || u.name)}</h2>
            <p class="muted" style="margin:.2rem 0">${this.e(u.spesId || 'SPES ID pending')} · Batch <b>${this.e(u.batch || '—')}</b> · <span class="tag ${u.status === 'approved' ? 'ok' : u.status === 'rejected' ? 'bad' : 'gold'}">${this.e(u.status)}</span></p>
            <p class="muted" style="margin:.15rem 0">Position: <b>${this.e(p.position || '—')}</b> · Program: <b>${this.e(p.programType || '—')}${p.programOther ? ' (' + this.e(p.programOther) + ')' : ''}</b> · Date: ${this.e(p.formDate || '—')}</p>
          </div>
        </div>

        <h3>I. Personal Information</h3>
        <div class="pis-kv-grid">
          ${row('Nickname', p.nickname)}${row('Sex / Gender', p.sex || u.gender)}
          ${row('Date of Birth', p.dob)}${row('Place of Birth', p.pob)}
          ${row('Age', p.age)}${row('Civil Status', p.civilStatus)}
          ${row('Citizenship', p.citizenship)}${row('Religion', p.religion)}
          ${row('Present Address', p.presentAddress)}${row('Permanent Address', p.permanentAddress)}
          ${row('Living Arrangement', (p.livingArrangement || '') + (p.livingOther ? ' (' + p.livingOther + ')' : ''))}
          ${row('Mobile Number', p.mobile)}${row('Email Address', p.email)}
          ${row('Known Allergies', p.allergies)}${row('Medical Conditions / Medications', p.medicalConditions)}
        </div>

        <h3>II. Special Classification &amp; PWD Status</h3>
        <div class="pis-kv-grid">
          ${row('PWD', p.isPwd)}${row('Type of Disability', p.pwdType)}
          ${row('PWD ID Number', p.pwdId)}${row('Workplace Accommodations', (p.needsAccom || 'No') + (p.accomDetails ? ' — ' + p.accomDetails : ''))}
          ${row('Other Classifications', (p.otherClass || []).join(', ') || 'None')}
        </div>

        <h3>III. Student / Youth Status &amp; Academic Details</h3>
        <div class="pis-kv-grid">
          ${row('Applicant Status', p.applicantStatus)}${row('School / University', p.schoolName)}
          ${row('Student ID', p.studentId)}${row('Course / Strand / Track', p.course)}
          ${row('Current Year / Grade', p.currentYear)}${row('Incoming Year / Grade', p.incomingYear)}
          ${row('School Year / Semester', p.schoolYear)}${row('Scholar / Financial Aid', (p.isScholar || 'No') + (p.scholarDetails ? ' (' + p.scholarDetails + ')' : ''))}
          ${p.osyLastYear ? row('Last SY Attended (OSY)', p.osyLastYear) : ''}${p.osyReason ? row('Reason (OSY)', p.osyReason) : ''}
        </div>
        ${(p.education && p.education.length) ? `<div class="tablewrap" style="margin-top:.5rem"><table><tr><th>Level</th><th>School Name</th><th>Year</th></tr>${p.education.map(ed => `<tr><td><b>${this.e(ed.level)}</b></td><td>${this.e(ed.school)}</td><td>${this.e(ed.year)}</td></tr>`).join('')}</table></div>` : ''}

        <h3>IV. Family / Guardian &amp; Emergency Contact</h3>
        <div class="pis-kv-grid">
          ${row("Father's Name", [p.fatherName, p.fatherOcc, p.fatherContact].filter(Boolean).join(' · '))}
          ${row("Mother's Name", [p.motherName, p.motherOcc, p.motherContact].filter(Boolean).join(' · '))}
          ${row("Parents' Status", (p.parentsStatus || '') + (p.parentsStatusNote ? ' (' + p.parentsStatusNote + ')' : ''))}
          ${row('Siblings / Birth Order', `${p.siblings || '0'} siblings · ${p.birthOrder || '—'}`)}
          ${p.guardianName ? row('Guardian', [p.guardianName, p.guardianRel, p.guardianContact].filter(Boolean).join(' · ')) : ''}
          ${row('Emergency Contact', `${p.emgName || '—'} (${p.emgRel || '—'}) · ${p.emgContact || '—'}`)}
          ${row('Emergency Address', p.emgAddress)}
        </div>

        <h3>V. Skills, Interests &amp; Experience</h3>
        <div class="pis-kv-grid">
          ${row('Skills', p.skills)}${row('Hobbies', p.hobbies)}${row('Talents', p.talents)}
        </div>
        ${(p.experience && p.experience.length) ? `<div class="tablewrap" style="margin-top:.5rem"><table><tr><th>Organization</th><th>Role</th><th>Dates</th></tr>${p.experience.map(ex => `<tr><td>${this.e(ex.org)}</td><td>${this.e(ex.role)}</td><td>${this.e(ex.dates)}</td></tr>`).join('')}</table></div>` : ''}

        <h3>VI. Self-Assessment</h3>
        <div class="pis-kv-grid">
          ${row('Traits', (p.traits || []).join(', ') || '—')}
          ${row('Current Concerns', [...(p.bothers || []), p.bothersOther].filter(Boolean).join(', ') || '—')}
          ${row('Discuss with Friends', p.talkFriends)}${row('Discuss with Family', p.talkFamily)}
          ${row('Discuss with Mentor/Supervisor', p.talkMentor)}
          ${row('Strengths', p.strengths)}${row('Weaknesses', p.weaknesses)}
          ${row('Goals', p.goals)}${row('Motivation', p.motivation)}
        </div>

        <h3>VII. Data Privacy Consent &amp; Certification</h3>
        <div class="pis-consent-badge">
          <span class="tag ok">✓ Data Privacy Consent Approved</span>
          <span class="muted">${consentAt ? 'Agreed on ' + SPES.View.when(consentAt) : 'Agreed upon registration'}</span>
        </div>
      </div>`;
  },

  adminIndex(batches, users, selBatch, selUserId, q = '') {
    const bens = users.filter(u => u.role === 'beneficiary');
    if (selUserId) {
      const target = bens.find(u => u.id === selUserId);
      if (target) return this.sheet(target, true);
    }
    if (selBatch) {
      const b = batches.find(x => x.code === selBatch) || { name: selBatch, code: selBatch };
      const members = bens.filter(u => u.batch === selBatch);
      return `${SPES.View.back('pis_batch', 'All batches', '')}
        <div class="roomhead">
          <div><h1>${this.e(b.name)} — Personal Information</h1><span class="tag gold">${this.e(b.code)}</span></div>
          <div class="roomstats">
            <div class="stat"><span>Beneficiaries</span><b>${members.length}</b></div>
            <div class="stat"><span>PIS Completed</span><b>${members.filter(m => m.pis).length}</b></div>
          </div>
        </div>
        <label for="pisSearch">Search beneficiary by name, SPES ID, school, or course</label>
        <input id="pisSearch" type="search" value="${this.e(q)}" placeholder="Type a name, SPES ID, or school..." autocomplete="off">
        <div class="grid roomgrid" style="margin-top:.8rem">
          ${members.map(u => {
            const p = u.pis || {};
            const hay = `${u.name} ${u.spesId || ''} ${u.username || ''} ${p.schoolName || ''} ${p.course || ''}`.toLowerCase();
            return `<article class="card pis-user-card" data-pis-search="${this.e(hay)}">
              <div class="mwho">${SPES.View.av(u)}<div>
                <b>${this.e(u.name)}</b>
                <div class="muted">${this.e(u.spesId || 'SPES ID pending')} · <span class="tag ${u.status === 'approved' ? 'ok' : u.status === 'rejected' ? 'bad' : 'gold'}">${this.e(u.status)}</span></div>
                <small class="muted">${p.schoolName ? this.e(p.schoolName) + (p.course ? ' · ' + this.e(p.course) : '') : 'No PIS submitted yet'}</small>
              </div></div>
              <div class="row" style="margin-top:.7rem;justify-content:space-between">
                <span class="tag ${u.pis ? 'ok' : ''}">${u.pis ? '✓ Privacy & PIS Ready' : 'Legacy account'}</span>
                <button type="button" class="btn" style="margin:0" data-act="pis_user" data-id="${u.id}">View Info</button>
              </div>
            </article>`;
          }).join('') || '<p class="muted">No beneficiaries in this batch yet.</p>'}
        </div>`;
    }
    return `<h1>Personal Information</h1>
      <p class="muted">Select a batch to view and search all beneficiaries' complete Personal Information Sheets and Data Privacy Consents.</p>
      <div class="rooms2">
        ${batches.map(b => {
          const mem = bens.filter(u => u.batch === b.code);
          const withPis = mem.filter(u => u.pis).length;
          return `<button type="button" class="brm" data-act="pis_batch" data-code="${this.e(b.code)}">
            <span class="brm-code">${this.e(b.code)}</span>
            <b>${this.e(b.name)}</b>
            <span class="muted">${mem.length} beneficiaries · ${withPis} PIS forms</span>
            <span class="brm-go">Open batch ${SPES.View.icon('back')}</span>
          </button>`;
        }).join('') || '<p class="muted">No batches created yet.</p>'}
      </div>`;
  }
};
