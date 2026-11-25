// Rooms 3-8. Format per line: question|correct answer|wrong 1|wrong 2|wrong 3 (answers are shuffled when the page loads).
(function () {
  const RAW = {
    2: `Alphabetical filing sorts records by|Letter order|Weight|Color|Price
A folder label should show|The folder's contents|A joke|Nothing|A phone number
Old records no longer needed should follow|The retention policy|Your mood|A coin toss|Nothing
Chronological filing arranges records by|Date|Name length|Color|Size
Borrowed files should be|Logged out and returned|Taken home|Lost|Hidden
A filing cabinet should be kept|Organized and labeled|Open and messy|Empty|Without a label
Misfiled documents are|Hard to find later|Easy to find|Safer|Better
Digital files should be named|Clearly and consistently|Randomly|"asdf"|With no name
Backing up files means|Making an extra copy|Deleting them|Printing only|Hiding them
Records should be accessible to|Authorized people only|Everyone|Strangers|No one ever`,
    3: `A customer is upset. First you should|Listen calmly|Argue|Walk away|Laugh
Visitors should be greeted|Warmly and promptly|Never|Rudely|After an hour
If you cannot answer a question|Refer them to who can|Make up an answer|Ignore it|Hang up
Good service means being|Helpful and respectful|Loud|Absent|Rushed only
Complaints should be|Recorded and addressed|Deleted|Mocked|Ignored
Your tone on calls should be|Polite and clear|Angry|Sleepy|Whispering
Waiting clients should be|Told how long it may take|Left unnoticed|Sent away|Scolded
A smile and eye contact show|Courtesy|Boredom|Anger|Nothing
A client's personal information is|Kept private|Posted online|Sold|Joked about
After helping a client you should|Ask if they need anything else|Leave suddenly|Close the window|Eat lunch`,
    4: `A spill on the floor should be|Cleaned or marked right away|Ignored|Stepped over|Hidden
In a fire alarm you should|Use the nearest safe exit|Hide|Keep working|Take the elevator
Cables across walkways are|A trip hazard|Decorations|Safe|Required
Heavy boxes should be lifted|With bent knees and straight back|With a bent back|Quickly|While running
Emergency exits must be|Kept clear|Blocked|Locked|Decorated
If you see an injury you should|Report it and call for help|Ignore it|Film it|Leave
Overloaded power outlets can cause|Fires|Savings|Speed|Cooling
First aid kits are for|Emergencies|Lunch|Decoration|Storing snacks
Wet hands should never touch|Electrical plugs|Soap|Towels|Water
Unsafe conditions should be reported to|Your supervisor|Nobody|Strangers|Social media`,
    5: `A good email subject line is|Short and specific|Empty|All caps|A joke
A formal email starts with|A proper greeting|"Hey you"|Nothing|Emojis
Typing in ALL CAPS seems like|Shouting|Politeness|Formality|Whispering
Before sending an email you should|Proofread it|Delete it|Forward it to all|Skip checking
"Reply All" should be used|Only when everyone needs it|Always|Never|For jokes
Attachments should be|Mentioned in the email|Hidden|Unnamed|Always huge
An official email should end with|Your name and position|A meme|A rumor|Nothing
Suspicious links should be|Left unclicked|Clicked|Shared|Opened quickly
The tone of work emails should be|Respectful|Rude|Sarcastic|Angry
Official emails should use|Work email accounts|Random accounts|Fake names|Group chats`,
    6: `Public servants serve|The people|Themselves only|Friends only|Nobody
A province is led by the|Governor|Mayor|Barangay Captain|President
A capitol is the seat of|The provincial government|A school|A mall|A farm
Public funds must be used|Honestly for public good|For gifts|Privately|Freely
Transparency means|Being open about actions|Hiding records|Being quiet|Being late
Government documents often need|Proper signatures|Jokes|Stickers|Nothing
A government service is|Issuing permits|Selling snacks|Streaming movies|Gaming
Corruption is|Abuse of public position|Hard work|Honesty|Saving money
SPES stands for|Special Program for Employment of Students|Student Pay Extra Scheme|Special Public Exam Series|Summer Pay for Every Student
A citizen's charter lists|Services and requirements|Jokes|Menus|Songs`,
    7: `Urgent and important tasks should be|Done first|Delayed|Ignored|Hidden
A to-do list helps you|Stay organized|Sleep|Hide|Forget
Procrastination means|Delaying tasks|Finishing early|Planning|Resting
To meet a deadline you should|Plan and start early|Wait|Panic|Skip it
Too much multitasking can|Lower quality|Raise quality|Fix errors|Save all time
You should arrive for work|On or before time|Whenever|Late|Never
Breaks should be|Taken within allowed time|Endless|Secret|Skipped always
Estimating task length helps you|Plan your day|Waste time|Avoid work|Nothing
Phone distractions at work should be|Limited|Increased|Encouraged|Required
Reviewing your day helps you|Improve tomorrow|Waste time|Cause stress|Nothing`
  };
  Object.entries(RAW).forEach(([room, text]) => {
    SPES.GameModel.QUESTIONS[room] = text.split('\n').map(line => {
      const [q, right, ...wrong] = line.split('|'), o = [right, ...wrong];
      for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
      return { q, o, a: o.indexOf(right) };
    });
  });
})();

// Rooms 9-20: true/false, guess the word, 4 pics, memory, color, word search, Bible, scramble, places.
(function () {
  const G = SPES.GameModel, shuf = SPES.Games ? null : null;
  const sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const L = t => t.trim().split('\n').map(l => l.trim().split('|'));
  const tf = t => L(t).map(([q, a]) => ({ q, o: ['True', 'False'], a: a === 'T' ? 0 : 1 }));
  const mc = t => L(t).map(([q, r, ...w]) => { const o = sh([r, ...w]); return { q, o, a: o.indexOf(r) }; });
  const ty = (t, prompt) => L(t).map(([q, ans]) => ({ q, ans, prompt: `${prompt} (${ans.length} letters)` }));
  const scr = w => { let s; do { s = sh([...w]).join(''); } while (s === w); return s; };
  G.TITLES.splice(8, 12, 'True or False: SPES Facts', 'True or False: Workplace', 'Guess the Word', '4 Pics 1 Word', 'Memory Match', 'Color Puzzle', 'Word Search', 'Bible Questions', 'Scramble Words', 'Guess the Place', 'Bible Guess', 'Guess the Country');
  G.KINDS = { 10: 'type', 11: 'type', 12: 'memory', 14: 'search', 16: 'type', 18: 'type' };
  const Q = G.QUESTIONS;
  Q[8] = tf(`SPES gives students temporary work during school breaks|T
Attendance photos are optional|F
Attendance needs a photo with date and time|T
Being on time shows responsibility|T
Confidential files can be posted online|F
A journal records your daily work|T
Unsafe conditions should be reported to your supervisor|T
Personal phone calls are best while serving clients|F
Teamwork helps an office succeed|T
Honesty is important in public service|T`);
  Q[9] = tf(`Arriving late every day is acceptable|F
Asking questions helps you learn|T
Office supplies may be taken home|F
Politeness applies to every client|T
A clean desk helps productivity|T
Corruption is the abuse of public office|T
Sharing your password is safe|F
Proofreading prevents errors|T
Gossip improves teamwork|F
Saving files often prevents data loss|T`);
  Q[10] = ty(`Used to write on paper|PEN
A machine that prints documents|PRINTER
You sit on it at your desk|CHAIR
Place where files are kept|CABINET
Device used to type|KEYBOARD
Opposite of absent|PRESENT
Daily record of your tasks|JOURNAL
The leader of an office|HEAD
Runs programs and stores data|COMPUTER
A short written reminder|MEMO`, 'Guess the word');
  Q[11] = ty(`🍎🍌🍇🍓|FRUIT
🐶🐱🐰🐹|PETS
⚽🏀🎾🏐|SPORTS
🚗🚌🚲✈️|VEHICLES
☀️🌧️⛈️❄️|WEATHER
📚✏️🎒📏|SCHOOL
🍕🍔🍟🌭|FOOD
🎸🥁🎹🎤|MUSIC
🌳🌲🌴🌵|PLANTS
💻📱⌨️🖱️|GADGETS`, '4 pics, 1 word');
  Q[12] = ['🍎', '🚗', '📚', '⚽', '🎸', '🌳', '💻', '🐶', '☀️', '🏆'];
  Q[13] = Array(10).fill(0); // generated fresh each time the room opens
  Q[14] = ['DESK', 'FILE', 'PRINT', 'EMAIL', 'CLERK', 'PEN', 'MEMO', 'BOSS', 'TEAM', 'SAFE'];
  Q[15] = mc(`Who built the ark?|Noah|Moses|David|Paul
Who was swallowed by a big fish?|Jonah|Peter|Elijah|Samuel
In how many days did God create the world?|Six|Three|Ten|Forty
Who defeated Goliath?|David|Saul|Joshua|Gideon
What is the first book of the Bible?|Genesis|Exodus|Psalms|Matthew
Who led Israel out of Egypt?|Moses|Abraham|Joseph|Daniel
Who was thrown into the lions' den?|Daniel|Isaac|Jacob|Job
Jesus was born in which town?|Bethlehem|Nazareth|Jericho|Cana
How many apostles did Jesus choose?|Twelve|Seven|Ten|Three
Who denied Jesus three times?|Peter|John|Thomas|Andrew`);
  Q[16] = ['OFFICE', 'JOURNAL', 'ATTENDANCE', 'SERVICE', 'DOCUMENT', 'SAFETY', 'TEAMWORK', 'PUBLIC', 'RESPECT', 'PROGRAM'].map(w => ({ q: scr(w), ans: w, prompt: `Unscramble the letters (${w.length} letters)` }));
  Q[17] = mc(`City with the Eiffel Tower|Paris|Rome|London|Cairo
Country of the Great Pyramids|Egypt|Peru|India|Greece
City with Big Ben|London|Paris|Berlin|Dublin
Country with Mount Fuji|Japan|China|Korea|Nepal
Country with the Taj Mahal|India|Iran|Turkey|Brazil
Capital of the Philippines|Manila|Cebu|Davao|Baguio
Country with the Colosseum|Italy|Spain|Greece|Portugal
Chocolate Hills are found in|Philippines|Indonesia|Thailand|Vietnam
Country famous for kangaroos|Australia|Canada|Mexico|Chile
City with the Statue of Liberty|New York|Chicago|Boston|Miami`);
  Q[18] = ty(`First man created by God|ADAM
First woman created by God|EVE
Brother of Moses|AARON
The disciple who betrayed Jesus|JUDAS
Man who built the ark|NOAH
Strong man whose power was in his hair|SAMSON
Queen who saved her people|ESTHER
Garden where Adam and Eve lived|EDEN
Mountain where Moses received the commandments|SINAI
Baby found in a basket on the river|MOSES`, 'Bible guess');
  Q[19] = mc(`Land of the Rising Sun|Japan|China|Korea|Laos
Pearl of the Orient|Philippines|Malaysia|Brunei|Taiwan
Home of pizza and pasta|Italy|Germany|Norway|Egypt
The Land Down Under|Australia|Austria|Ireland|Iceland
Home of samba and Carnival|Brazil|Peru|Spain|Cuba
The maple leaf country|Canada|Sweden|Finland|Chile
Land of the Pharaohs|Egypt|Kenya|Iran|Yemen
Home of K-pop|South Korea|Thailand|Vietnam|Laos
Land of tulips and windmills|Netherlands|Greece|Poland|Austria
Home of the Great Wall|China|Mongolia|Nepal|India`);
})();
