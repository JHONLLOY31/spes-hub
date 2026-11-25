SPES HUB - UPDATED FRONT-END PROTOTYPE

HOW TO RUN
1. Extract the ZIP file.
2. Open the spes-hub folder.
3. Run index.html in a modern browser, or serve the folder using VS Code Live Server.
4. Demo staff accounts:
   Admin: username admin / password admin123
   Office Head: username head / password head123
5. Admin can create B1 and B2 batches (for example, name them B1 - 2026 and B2 - 2026).
6. Beneficiaries register using the batch code. The app generates a SPES ID in the format B1-2026-0001 or B2-2026-0001.

CHANGES INCLUDED
- Attendance image submissions remain Pending until administrator review.
- Attendance is separated into Morning Time-In, Morning Time-Out, Afternoon Time-In, and Afternoon Time-Out.
- Upload now asks for confirmation with Cancel and Submit image actions.
- Admin review screen displays uploaded proof photos and allows Approve or Reject.
- Full day requires approved morning and afternoon in/out slots; one fully approved half-day is labeled Half day.
- Saturday and Sunday are rest days and excluded from the 20-day work schedule.
- Friday is Work From Home, requires no attendance upload, and remains counted in the 20 scheduled workdays.
- Registration includes Male/Female and generates a unique SPES ID.
- Admin batch classroom cards include name/SPES ID search, attendance counts, journal entries/photos, scores, and account deletion.
- Theme toggle is placed at the upper-right of the app.
- Game room navigation uses the shared click handler; Next is blocked until the current item is answered; small hints are available.
- Existing records marked "verified" are migrated to "approved" in browser storage.

IMPORTANT LIMITATIONS
This ZIP is still a front-end prototype. It uses browser localStorage and sessionStorage. Data is stored only in the browser/device where it is used; it is not shared across users or computers. The demo passwords are plain text and are not secure. Admin-only controls are enforced in the interface code but are not secure server-side authorization. Uploaded images are compressed into browser storage. For actual deployment, connect a PHP/MySQL backend with password hashing, server-side role checks, secure image upload validation, audit logs, and database-backed attendance approvals. Do not use real beneficiary personal information until those backend protections are implemented.

ATTENDANCE RULES IN THIS PROTOTYPE
- Morning Time-In: before 8:00 AM
- Morning Time-Out: 12:00 PM onwards
- Afternoon Time-In: before 1:00 PM
- Afternoon Time-Out: 5:00 PM onwards
- Every photo submission is Pending until Administrator approval.
- System submission time is recorded by the browser in this prototype; a production system must use server time.

LATEST UPDATE (November 2026)
- Quiz progression is locked until the current question is answered correctly. Incorrect answers can be retried; they do not advance to the next question.
- Removed the in-game hint feature.
- Replaced the role text beside the theme control with a more visible Light mode / Dark mode switch featuring an icon and toggle indicator.
- Added an editable Gender identity field to the beneficiary Profile page (Male/Female options, matching the existing registration fields).

LATEST UPDATE (password protection)
- Every password field has an eye button to show or hide what you type.
- Passwords are now stored as salted, iterated SHA-256 hashes (format h1$iterations$salt$hash) instead of plain text. Accounts created by older versions are upgraded automatically the next time the app loads.
- Note: hashing in the browser is a step up from plain text but is still a prototype. The hashes live in the same browser storage, so a real deployment still needs server-side hashing (bcrypt or Argon2) and server-side login checks.
- Entry pages: index.html is the beneficiary login and admin.html is the staff login.

LATEST UPDATE (final front-end polish)
- Login pages have an animated background; a welcome transition plays after login and after registering.
- "Continue with Google" button on the beneficiary login. It is a placeholder: real Google sign-in needs a Google client ID and the server, so it only shows a notice for now.
- Attendance slots are locked by time: Morning Time-In opens 5:00 AM (on time before 8:00 AM, closes 12:00 PM); Morning Time-Out opens 12:00 PM; Afternoon Time-In opens 12:30 PM (on time before 1:00 PM, closes 5:00 PM); Afternoon Time-Out opens 5:00 PM. Locked slots show when they open, and the rule is also enforced in the model.
- Games: no tilt effects; tiles and answers turn yellow under the cursor.
- Font changed to Plus Jakarta Sans (loaded from Google Fonts; falls back to system fonts offline). Emoji icons replaced with line icons.
- Profile: personal notes (add and delete) and a choice of photo borders.
- Admin: Batch rooms. Each batch is a room; open it to search its beneficiaries by name or SPES ID.

LATEST UPDATE (rooms, presence, notes, frames)
- Admin batch room: "Online now" shows only that batch's beneficiaries and updates live (heartbeat every few seconds). In this prototype it works between tabs of the same browser; real online status across devices needs the server.
- Admin batch room: Attendance list for any chosen day. "Mark present" works without a photo and without a confirmation popup (the beneficiary is notified, and "Undo present" reverses it). Saturday and Sunday stay rest days and future days are refused.
- Deleting a user now asks "Are you sure you want to delete it?" in a popup before anything is removed.
- Profile "My note" works like a Messenger note: up to 60 characters, shown as a bubble above the photo for 24 hours (admins also see it in the room).
- Profile photo frames in yellow, black and white: Gold, Champion, Spark, Pulse, Checker and Star.

LATEST UPDATE (answer key and Day 1)
- Admin has a new "Game answers" tab: the answer key for all 20 learning games (multiple choice and true/false with the correct option highlighted, typed answers, memory pairs, word-search words and the color-match rule), with a search box. Administrators only.
- Each beneficiary's Day 1 is the day they registered (weekends are skipped, so a Saturday registration starts on Monday). The 20 workdays, attendance and journal days count from that date. Accounts created before this update keep using the batch start date. The admin room shows each person's Day 1 and shows "Before Day 1" for dates earlier than it.

LATEST UPDATE (answer key password)
- The admin "Game answers" tab is protected by its own password. The first administrator to open it sets the password; after that it must be entered to open the key. The key locks again when you leave the tab, log out, or stay idle for 10 minutes. "Lock now" and "Change password" are on the unlocked page, and "Forgot the password?" resets it after confirming the administrator account password. 5 wrong tries lock the password forms for 5 minutes. The password is stored as a salted hash.
- Note: this is a front-end prototype. The answers still live in the page's JavaScript files, so a technical user could read them with the browser tools. Real protection needs the server to keep the answers and send them only to a logged-in administrator.
