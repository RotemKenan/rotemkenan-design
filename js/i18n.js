// English / Hebrew UI. Static text uses data-i18n / data-i18n-ph / data-i18n-title; code uses t(key, vars).
const EN = {
  appName: 'Event Studio', byline: 'by Rotem Kenan', tagline: 'See the event before the first guest walks in.',
  newEvent: 'New event', duplicateEvent: 'Duplicate event', exportProject: 'Export event file', openProject: 'Open event file', deleteEvent: 'Delete event',
  tabMood: 'Mood', tabPlan: '2D Plan', tab3d: '3D', tabSplit: '2D + 3D', tabInventory: 'Inventory', tabPresent: 'Presentation',
  briefTitle: 'Event details', eventNamePh: 'Event name — e.g. Noa & Daniel', client: 'Client', eventType: 'Type', date: 'Date', guests: 'Guests', venueName: 'Venue',
  typeWedding: 'Wedding', typeHenna: 'Henna', typeBar: 'Bar / Bat Mitzvah', typeBirthday: 'Birthday', typeCorporate: 'Corporate', typePrivate: 'Private party',
  moodTitle: 'Mood & palette', paletteHint: 'Start here: upload the mood board, then apply its colours.', openMood: 'Open mood board →',
  venueTitle: 'Venue plan', uploadDxf: 'Upload venue plan (DXF or image)', dwgHint: 'DWG? In AutoCAD use “Save As → DXF”, or the free ODA File Converter.',
  setScale: '📐 Mark room corners', tracing: 'Turning the picture into a drawing…', readingDims: 'Reading the measurements on the plan…', pickTitle: 'Furniture found in your mood board', pickHint: 'Check the pieces and quantities, add anything missing, then let the app lay out a base design for you.', composeBtn: '✨ Create base design', pickOnly: 'Add to event only', cancel: 'Cancel', composeFromMood: '🪄 Base design from my selection', pickNone: 'No inventory pieces were recognised — add them from the list below.', pickFromPhoto: 'found in a picture', pickFromText: 'named on a slide', pickFromEvent: 'already in this event', seatEstimate: 'Seats about {n} people', composed: 'Base design ready ✨ {n} pieces placed — move anything you like', composedMissing: 'Base design ready — {m} pieces did not fit, add them by hand', seatsAbout: '~{n} seats on sofas, armchairs and poufs', findingPieces: 'Looking for your furniture in the mood board…', measure: '📏 Measure', measureOn: '📏 Measuring… (Esc to stop)', measureHint: 'Tap two points to measure · Shift = straight line', clearMeasures: 'Clear measurements', confirmDemo: 'Replace this venue with the example hall?', traceFail: 'Could not trace this image — the photo is kept as a background', cornersStep: 'Tap the room’s top-left corner, then its bottom-right corner', askRoomWidth: 'Room WIDTH, left to right (metres or cm). Filled in from the plan when found — check it:', askRoomLength: 'Room LENGTH, top to bottom (metres or cm). Filled in from the plan when found — check it:', roomDone: 'Drawing ready: {w} × {l} m ✓ (the photo is under Layers → PHOTO)', scaleStep1: 'Tap both ends of a wall or dimension you know', scaleAsk: 'Real length between the two points, in metres:', scaleDone: 'Plan scaled ✓', venueLibrary: 'Or choose a saved venue…', venueImgHint: 'A screenshot or photo of the plan also works — you’ll be asked for the room width.', askWidth: 'How wide is the room in real life, in metres? (the long side of the image, left to right)', imgLoaded: 'Plan image placed at {w} × {h} m — draw on top of it', notDxf: 'This file is not a DXF drawing. Choose the .dxf file, or a screenshot/photo of the plan.', libLoaded: '{name} loaded', units: 'Units', wallHeight: 'Wall height (cm)', layers: 'Layers', demoHall: 'No file yet? Load a demo hall',
  furnitureTitle: 'Furniture', dragHint: 'Drag a piece onto the plan, or click to add it to the event.', search: 'Search inventory…', basics: 'Tables, stage & basics', add: 'Add', inThisEvent: 'In this event',
  layoutTitle: 'Layout', suggest: '✨ Suggest a layout', clear: 'Clear placed items', downloadDxf: 'Download DXF plan',
  fit: 'Fit', snap: 'Snap 10 cm', magnet: '🧲 Magnet', planHint: 'Drag to move · ↻ knob or R to rotate · Shift+drag to select many · Del · Ctrl+D · Ctrl+Z · Alt+arrows = 1 cm',
  camGuest: 'Overview', camEntrance: 'Entrance', camStage: 'From stage', camCorner: 'Corner', camTop: 'Top', camWalk: 'Eye level',
  lightEvening: 'Evening warm', lightCandle: 'Candlelight', lightDay: 'Daylight', lightParty: 'Party',
  saveRender: '📷 Save render', renderAll: 'All angles', threeHint: 'Click a piece to select · drag it on the floor to move',
  moodNamePh: 'Name the mood — e.g. Burnt Velvet Evening', keywordsPh: 'Feeling words: warm, intimate, vintage, candlelit…', startFrom: 'Start from a mood:',
  uploadMood: 'Drop your mood board here — PowerPoint (.pptx) or images', palette: 'Palette', addColor: '＋ Colour', extract: 'Extract from images',
  rolesTitle: 'Where each colour goes', lighting: 'Lighting', notes: 'Notes', applyMood: '✨ Apply mood to the design',
  roleWalls: 'Walls', roleFloor: 'Floor', roleLinen: 'Table linen', roleChairs: 'Chairs', roleAccent: 'Candles & metal', roleFlorals: 'Florals',
  invTitle: 'Inventory & measurements', invHint: 'Measure each piece at its widest points (cm). W = side to side, D = front to back, H = total height, Seat = seat height. Tick “Measured” once checked — the plan, DXF and 3D all update.',
  printSheet: '🖨 Print measuring sheet', downloadAll: '⬇ Download all models (GLB + DXF)', exportInv: 'Export inventory', importInv: 'Import inventory',
  piece: 'Piece', seat: 'Seat', innerD: 'Ø inner', finish: 'Finish', stock: 'Stock', supplier: 'Supplier / SKU', measured: 'Measured', files: 'Files',
  buildPresent: 'Refresh presentation', printPresent: '🖨 Print / save as PDF', showSuppliers: 'Show suppliers',
  // dynamic
  saved: 'Saved', saving: 'Saving…', untitled: 'Untitled event', newEventName: 'New event',
  seatsOf: '{seats} seats placed for {guests} guests', seatsOk: '✓ Everyone has a seat', seatsShort: '{n} seats missing', seatsOnly: '{seats} seats placed',
  overStock: '⚠ {name}: {used} used, {stock} in stock', clashes: '⚠ {n} pieces overlap (red)',
  widthCm: 'W', depthCm: 'D', heightCm: 'H', sizeSaved: 'Size (cm) — saved as this piece’s default', sizeUpdated: 'Size saved ✓', x: 'X (cm)', y: 'Y (cm)', rotation: 'Rotation°', label: 'Label', lock: 'Lock', duplicate: 'Duplicate', delete: 'Delete', selectedN: '{n} selected',
  rotateL: '⟲ 15°', rotateR: '⟳ 15°', place: 'Place on plan', remove: 'Remove', qty: 'Qty', placedOf: '{placed}/{qty} on plan',
  layoutDone: 'Layout suggested ✨ Drag anything to refine it.', layoutMissing: 'Layout suggested — {n} piece(s) did not fit.', addFirst: 'Add furniture first.', needVenue: 'Upload a venue plan first.',
  demoLoaded: 'Demo hall loaded (28 × 18 m)', dwgClosed: 'DWG is a closed format — please save it as DXF first.', dxfLoaded: 'Loaded {name}: {n} lines', dxfError: 'Could not read DXF: {msg}',
  reading: 'Reading mood board…', moodLoaded: 'Mood board: {images} images, {colors} colours', pptError: 'Could not read that file: {msg}',
  moodApplied: 'Mood applied to the design ✨', confirmDelete: 'Delete “{name}”? This cannot be undone.', opened: 'Event opened', badFile: 'That file is not an event file.',
  pickRole: 'Click a colour above, then a role', none: '—', removeImage: 'Remove', custom: 'Custom item…', building: 'Building…',
  // presentation
  pCover: 'Design proposal', pMood: 'The mood', pPalette: 'Palette', pPlan: 'Floor plan', pViews: 'The room', pFurniture: 'Furniture & décor', pNotes: 'Notes',
  pGuests: 'guests', pPieces: 'Piece', pQty: 'Qty', pSize: 'Size (cm)', pPrepared: 'Prepared by Rotem Kenan · Event Design',
};

const HE = {
  appName: 'סטודיו אירועים', byline: 'מאת רותם קינן', tagline: 'לראות את האירוע עוד לפני שהאורח הראשון נכנס.',
  newEvent: 'אירוע חדש', duplicateEvent: 'שכפול אירוע', exportProject: 'ייצוא קובץ אירוע', openProject: 'פתיחת קובץ אירוע', deleteEvent: 'מחיקת אירוע',
  tabMood: 'מודבורד', tabPlan: 'תוכנית 2D', tab3d: 'תלת־ממד', tabSplit: '2D + 3D', tabInventory: 'מלאי', tabPresent: 'מצגת',
  briefTitle: 'פרטי האירוע', eventNamePh: 'שם האירוע — למשל נועה ודניאל', client: 'לקוח', eventType: 'סוג', date: 'תאריך', guests: 'אורחים', venueName: 'מקום',
  typeWedding: 'חתונה', typeHenna: 'חינה', typeBar: 'בר / בת מצווה', typeBirthday: 'יום הולדת', typeCorporate: 'אירוע חברה', typePrivate: 'אירוע פרטי',
  moodTitle: 'מודבורד ופלטה', paletteHint: 'מתחילים כאן: מעלים מודבורד ומחילים את הצבעים.', openMood: '← לפתיחת המודבורד',
  venueTitle: 'תוכנית המקום', uploadDxf: 'העלאת תוכנית המקום (DXF או תמונה)', dwgHint: 'קובץ DWG? באוטוקאד: “שמירה בשם ← DXF”, או בתוכנה החינמית ODA File Converter.',
  setScale: '📐 סימון פינות החדר', tracing: 'הופכת את התמונה לשרטוט…', readingDims: 'קוראת את המידות מהתוכנית…', pickTitle: 'ריהוט שנמצא במודבורד', pickHint: 'בדקי את הפריטים והכמויות, הוסיפי מה שחסר — והאפליקציה תציע עיצוב בסיס.', composeBtn: '✨ יצירת עיצוב בסיס', pickOnly: 'רק להוסיף לאירוע', cancel: 'ביטול', composeFromMood: '🪄 עיצוב בסיס מהבחירה שלי', pickNone: 'לא זוהו פריטים מהמלאי — הוסיפי אותם מהרשימה למטה.', pickFromPhoto: 'זוהה בתמונה', pickFromText: 'מופיע בטקסט', pickFromEvent: 'כבר באירוע', seatEstimate: 'כ־{n} מקומות ישיבה', composed: 'עיצוב הבסיס מוכן ✨ {n} פריטים הוצבו — אפשר להזיז הכול', composedMissing: 'עיצוב הבסיס מוכן — {m} פריטים לא נכנסו, הוסיפי אותם ידנית', seatsAbout: '~{n} מקומות על ספות, כורסאות ופופים', findingPieces: 'מחפשת את הריהוט שלך במודבורד…', measure: '📏 מדידה', measureOn: '📏 מודדת… (Esc לסיום)', measureHint: 'הקישי על שתי נקודות כדי למדוד · Shift = קו ישר', clearMeasures: 'ניקוי מדידות', confirmDemo: 'להחליף את המקום הזה באולם הדוגמה?', traceFail: 'לא ניתן היה לשרטט את התמונה — היא נשארת כרקע', cornersStep: 'הקישי על הפינה השמאלית־עליונה של החדר, ואז על הפינה הימנית־תחתונה', askRoomWidth: 'רוחב החדר, משמאל לימין (מטרים או ס״מ). מולא מהתוכנית אם נמצא — בדקי:', askRoomLength: 'אורך החדר, מלמעלה למטה (מטרים או ס״מ). מולא מהתוכנית אם נמצא — בדקי:', roomDone: 'השרטוט מוכן: {w} × {l} מ׳ ✓ (התמונה נמצאת בשכבות ← PHOTO)', scaleStep1: 'הקישי על שני הקצוות של קיר או מידה ידועה', scaleAsk: 'האורך האמיתי בין שתי הנקודות, במטרים:', scaleDone: 'קנה המידה עודכן ✓', venueLibrary: 'או בחירת מקום שמור…', venueImgHint: 'אפשר גם צילום מסך או תמונה של התוכנית — תתבקשי להזין את רוחב החדר.', askWidth: 'מה רוחב החדר במציאות, במטרים? (הצד הארוך של התמונה, משמאל לימין)', imgLoaded: 'תמונת התוכנית הוצבה בגודל {w} × {h} מ׳ — אפשר לעצב מעליה', notDxf: 'הקובץ הזה אינו שרטוט DXF. בחרי את קובץ ה־dxf, או צילום מסך / תמונה של התוכנית.', libLoaded: '{name} נטען', units: 'יחידות', wallHeight: 'גובה קיר (ס״מ)', layers: 'שכבות', demoHall: 'אין עדיין קובץ? טעינת אולם לדוגמה',
  furnitureTitle: 'ריהוט', dragHint: 'גררי פריט אל התוכנית, או לחצי כדי להוסיף לאירוע.', search: 'חיפוש במלאי…', basics: 'שולחנות, במה ובסיס', add: 'הוספה', inThisEvent: 'באירוע הזה',
  layoutTitle: 'העמדה', suggest: '✨ הצעת העמדה', clear: 'ניקוי הפריטים מהתוכנית', downloadDxf: 'הורדת תוכנית DXF',
  fit: 'התאמה', snap: 'הצמדה 10 ס״מ', magnet: '🧲 מגנט', planHint: 'גרירה להזזה · ↻ או R לסיבוב · Shift+גרירה לבחירה מרובה · Del · Ctrl+D · Ctrl+Z · Alt+arrows = 1 cm',
  camGuest: 'מבט כללי', camEntrance: 'מהכניסה', camStage: 'מהבמה', camCorner: 'מהפינה', camTop: 'מלמעלה', camWalk: 'גובה עיניים',
  lightEvening: 'ערב חמים', lightCandle: 'אור נרות', lightDay: 'אור יום', lightParty: 'מסיבה',
  saveRender: '📷 שמירת הדמיה', renderAll: 'כל הזוויות', threeHint: 'לחיצה על פריט לבחירה · גרירה על הרצפה להזזה',
  moodNamePh: 'שם למוד — למשל ערב קטיפה חמה', keywordsPh: 'מילות תחושה: חמים, אינטימי, וינטג׳, נרות…', startFrom: 'להתחיל ממוד:',
  uploadMood: 'גררי לכאן את המודבורד — פאוורפוינט (pptx) או תמונות', palette: 'פלטה', addColor: '＋ צבע', extract: 'חילוץ מהתמונות',
  rolesTitle: 'איפה כל צבע', lighting: 'תאורה', notes: 'הערות', applyMood: '✨ החלת המוד על העיצוב',
  roleWalls: 'קירות', roleFloor: 'רצפה', roleLinen: 'מפות', roleChairs: 'כיסאות', roleAccent: 'נרות ומתכת', roleFlorals: 'פרחים',
  invTitle: 'מלאי ומידות', invHint: 'מודדים כל פריט בנקודות הרחבות ביותר (ס״מ). W = רוחב, D = עומק, H = גובה כולל, מושב = גובה מושב. מסמנים “נמדד” — התוכנית, ה־DXF והתלת־ממד מתעדכנים.',
  printSheet: '🖨 הדפסת דף מדידות', downloadAll: '⬇ הורדת כל המודלים (GLB + DXF)', exportInv: 'ייצוא מלאי', importInv: 'ייבוא מלאי',
  piece: 'פריט', seat: 'מושב', innerD: 'Ø פנימי', finish: 'גימור', stock: 'במלאי', supplier: 'ספק / מק״ט', measured: 'נמדד', files: 'קבצים',
  buildPresent: 'רענון המצגת', printPresent: '🖨 הדפסה / שמירה כ־PDF', showSuppliers: 'הצגת ספקים',
  saved: 'נשמר', saving: 'שומר…', untitled: 'אירוע ללא שם', newEventName: 'אירוע חדש',
  seatsOf: '{seats} מקומות ישיבה ל־{guests} אורחים', seatsOk: '✓ לכל האורחים יש מקום', seatsShort: 'חסרים {n} מקומות', seatsOnly: '{seats} מקומות ישיבה',
  overStock: '⚠ {name}: בשימוש {used}, במלאי {stock}', clashes: '⚠ {n} פריטים חופפים (באדום)',
  widthCm: 'רוחב', depthCm: 'עומק', heightCm: 'גובה', sizeSaved: 'מידות (ס״מ) — נשמרות כברירת המחדל של הפריט', sizeUpdated: 'המידות נשמרו ✓', x: 'X (ס״מ)', y: 'Y (ס״מ)', rotation: 'סיבוב°', label: 'תווית', lock: 'נעילה', duplicate: 'שכפול', delete: 'מחיקה', selectedN: '{n} נבחרו',
  rotateL: '⟲ 15°', rotateR: '⟳ 15°', place: 'הצבה בתוכנית', remove: 'הסרה', qty: 'כמות', placedOf: '{placed}/{qty} בתוכנית',
  layoutDone: 'הוצעה העמדה ✨ אפשר לגרור כל פריט לדיוק.', layoutMissing: 'הוצעה העמדה — {n} פריטים לא נכנסו.', addFirst: 'קודם מוסיפים ריהוט.', needVenue: 'קודם מעלים את תוכנית המקום.',
  demoLoaded: 'נטען אולם לדוגמה (28 × 18 מ׳)', dwgClosed: 'DWG הוא פורמט סגור — שמרי אותו קודם כ־DXF.', dxfLoaded: 'נטען {name}: {n} קווים', dxfError: 'לא ניתן לקרוא את ה־DXF: {msg}',
  reading: 'קוראת את המודבורד…', moodLoaded: 'מודבורד: {images} תמונות, {colors} צבעים', pptError: 'לא ניתן לקרוא את הקובץ: {msg}',
  moodApplied: 'המוד הוחל על העיצוב ✨', confirmDelete: 'למחוק את “{name}”? אי אפשר לבטל.', opened: 'האירוע נפתח', badFile: 'זה לא קובץ אירוע.',
  pickRole: 'לוחצים על צבע ואז על התפקיד', none: '—', removeImage: 'הסרה', custom: 'פריט מותאם…', building: 'בונה…',
  pCover: 'הצעת עיצוב', pMood: 'המוד', pPalette: 'פלטה', pPlan: 'תוכנית העמדה', pViews: 'החלל', pFurniture: 'ריהוט ועיצוב', pNotes: 'הערות',
  pGuests: 'אורחים', pPieces: 'פריט', pQty: 'כמות', pSize: 'מידות (ס״מ)', pPrepared: 'הוכן על ידי רותם קינן · עיצוב אירועים',
};

// Hebrew names for the inventory and the basic pieces.
export const HE_NAMES = {
  'low-round-black': 'שולחן נמוך עגול, שחור, רגלי קבריולה', 'low-round-linen': 'שולחן נמוך עגול + מפת פשתן', 'low-square-black': 'שולחן נמוך מרובע, שחור, רגלי קבריולה', 'low-square-linen': 'שולחן נמוך מרובע + מפת פשתן',
  'bistro-black': 'שולחן ביסטרו שחור', 'bistro-walnut': 'שולחן ביסטרו, פלטת אגוז', 'bistro-candle': 'ביסטרו + מפת פשתן ופמוט זכוכית', 'club-leather': 'כורסת עור חומה וינטג׳',
  'channel-sofa': 'ספת קטיפה תפורה, שוקולד', 'curved-green': 'ספה מעוגלת קטיפה, ירוקה', 'curved-rust': 'ספה מעוגלת קטיפה, חלודה', 'slipper-rust': 'כורסת קטיפה ללא ידיות, חלודה',
  'slipper-green': 'כורסת קטיפה ללא ידיות, ירוקה', 'channel-chair-green': 'כורסת קטיפה תפורה, זית', 'bench-burgundy': 'ספסל קטיפה ללא ידיות, בורדו', 'armchair-navy': 'כורסת קטיפה כחולה, מסגרת פלדה שחורה',
  'slipper-teal': 'כורסת קטיפה ללא ידיות, טורקיז', 'curved-navy': 'ספה מעוגלת קטיפה, כחול נייבי', 'curved-brown': 'ספה מעוגלת קטיפה, שוקולד', 'curved-burgundy': 'ספה מעוגלת קטיפה, בורדו', 'counter-marble': 'דלפק עץ, פסי פליז, משטח שיש שחור', 'pouf-damask': 'פוף פרנזים, קטיפה דמשק גותי',
  'pouf-tiger': 'פוף פרנזים, קטיפת טייגר', 'pouf-ikat': 'פוף פרנזים, קטיפת איקאט יין', 'pouf-acanthus': 'פוף פרנזים, קטיפת עלי אקנתוס', 'pouf-rust': 'פוף פרנזים, קטיפה חלודה חלקה', 'cushion-fringe': 'כרית קטיפה עם פרנזים, הדפס חרדל',
};
export const HE_KINDS = {
  'Round table Ø180': 'שולחן עגול Ø180', 'Round table Ø150': 'שולחן עגול Ø150', 'Banquet table 240×100': 'שולחן מלבני 240×100', 'Knight table 400×120': 'שולחן אבירים 400×120',
  'Bride & groom table': 'שולחן חתן וכלה', 'Cocktail table Ø70': 'שולחן בר Ø70', 'Lounge sofa': 'ספת לאונג׳', 'Armchair': 'כורסה', 'Bar counter': 'דלפק בר', 'Stage / DJ': 'במה / DJ',
  'Dance floor': 'רחבת ריקודים', 'Chuppah / Arch': 'חופה / קשת', 'Floral / plant': 'פרחים / צמחייה', 'Buffet station': 'עמדת מזנון', 'Chair': 'כיסא', 'Custom item': 'פריט מותאם',
};

let lang = 'en';
try { lang = localStorage.getItem('rk-lang') || 'en'; } catch { /* ignore */ }
export const getLang = () => lang;

export function t(key, vars = {}) {
  const s = (lang === 'he' ? HE : EN)[key] ?? EN[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Display name of a furniture item in the current language (custom names the user typed are kept).
export function itemName(it) {
  if (lang !== 'he' || !it) return it?.name || '';
  const key = it.invId || it.id;
  if (it.nameEdited) return it.name;
  return HE_NAMES[key] || HE_KINDS[it.name] || it.name;
}

export function applyLang(next = lang) {
  lang = next;
  try { localStorage.setItem('rk-lang', lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  document.querySelectorAll('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle)));
  const btn = document.getElementById('langToggle');
  if (btn) btn.textContent = lang === 'he' ? 'English' : 'עברית';
  document.title = `${t('appName')} · ${lang === 'he' ? 'רותם קינן' : 'Rotem Kenan'}`;
}
