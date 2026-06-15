// Agnes AI API Key — loaded from server at startup
let AGNES_API_KEY = "";

(async function loadKey(){
    try {
        const r = await fetch("http://localhost:8080/config");
        const d = await r.json();
        AGNES_API_KEY = d.agnes_api_key || "";
        console.log("✅ API key loaded from server");
    } catch(e) {
        console.warn("⚠️ Could not reach server — asking user for key");
        const k = prompt("🔑 Paste your Agnes AI API key\n(or run: python3 server.py first)");
        if(k) AGNES_API_KEY = k.trim();
    }
})();
const AGNES_BASE_URL = "https://apihub.agnes-ai.com/v1";
const PROXY_BASE_URL = "http://localhost:8080/proxy"; // Local proxy for video API (CORS fix)

const AppState = {
    currentProfile: null, newsItems: [], currentNewsIndex: 0,
    chatMessages: [], isSpeaking: false, waterCount: 0, stepCount: 3247, stepGoal: 5000,
    ttsWords: [], ttsWordIndex: 0, ttsTimer: null, ttsDuration: 0, ttsElapsed: 0
};

const Profiles = {
    grandpa: { name:'Grandpa Wang',age:72,conditions:['Hypertension','Arthritis'],dialect:'mandarin',avatar:'👴',emergencyContact:'+65 9000 1234',medications:[{name:'Amlodipine',time:'08:00',dosage:'5mg',icon:'💊',taken:false},{name:'Aspirin',time:'12:00',dosage:'100mg',icon:'💉',taken:false},{name:'Losartan',time:'20:00',dosage:'50mg',icon:'💊',taken:false}],family:[{name:'Son - Wei Ming',avatar:'👨'},{name:'Daughter - Wei Ling',avatar:'👩'}]},
    grandma: { name:'Grandma Li',age:68,conditions:['Diabetes','High Cholesterol'],dialect:'cantonese',avatar:'👵',emergencyContact:'+65 9000 5678',medications:[{name:'Metformin',time:'07:00',dosage:'500mg',icon:'💊',taken:false},{name:'Insulin',time:'13:00',dosage:'10 units',icon:'💉',taken:false},{name:'Vitamin D',time:'19:00',dosage:'400IU',icon:'☀️',taken:false}],family:[{name:'Son - Zhang Wei',avatar:'👨'},{name:'Daughter - Zhang Fang',avatar:'👩'}]}
};

const HealthAdvice = {
    'Hypertension':{avoid:['Salt & salty foods (soy sauce, salted fish)','Processed meats (luncheon meat, sausages)','Fried foods','Too much caffeine (limit coffee to 1 cup)','Alcohol'],recommended:['Bananas, oranges (high in potassium)','Leafy greens (spinach, kailan)','Oats and whole grains','Low-fat dairy (yoghurt, milk)','Fish (salmon, mackerel — heart healthy)']},
    'Diabetes':{avoid:['White rice & white bread (high GI)','Sugary drinks (Milo, bubble tea, fruit juice)','Sweet desserts (kue, kueh, cakes)','High-GI fruits (durian, lychee, mango)','Fried snacks (curry puff, goreng pisang)'],recommended:['Brown rice or cauliflower rice','Non-starchy vegetables (broccoli, beans, tofu)','Low-GI fruits (papaya, guava, apple)','Eggs and lean proteins (chicken, fish)','Nuts (almonds, walnuts — small portions)']},
    'Heart Disease':{avoid:['Trans fats (margarine, processed snacks)','Saturated fats (fatty meats, chicken skin)','High sodium foods','Alcohol','Refined sugars and sweets'],recommended:['Oily fish (salmon, sardines, mackerel)','Olive oil (instead of palm oil)','Berries and citrus fruits','Whole grains (oats, brown rice)','Walnuts and almonds']},
    'Arthritis':{avoid:['Processed and refined sugar','Refined carbohydrates (white bread, pastries)','Alcohol','Fried and processed foods','Red meat in large quantities'],recommended:['Fatty fish rich in omega-3','Ginger and turmeric (anti-inflammatory)','Colourful vegetables (peppers, broccoli)','Olive oil','Berries (strawberries, blueberries)']},
    'Respiratory Issues':{avoid:['Dairy products (may worsen mucus)','Cold drinks and ice','Processed and preserved foods','Alcohol','Foods with sulphites (dried fruits, wine)'],recommended:['Honey and ginger tea','Garlic and onion','Warm herbal teas','Citrus fruits (high in Vitamin C)','Leafy green vegetables']},
    'High Cholesterol':{avoid:['Egg yolks (limit to 2-3 per week)','Fatty meats and organ meats (liver)','Full-fat dairy products','Coconut milk dishes (curry, laksa — eat less)','Fried foods'],recommended:['Oats and oat bran (lowers LDL)','Beans and lentils','Avocado','Unsalted nuts','Fish and skinless chicken breast']},
    'Kidney Disease':{avoid:['High potassium (banana, orange, potato)','High phosphorus (dairy, nuts, cola drinks)','High sodium (soy sauce, salted foods)','Excessive protein','Dark leafy greens if severe (spinach, kale)'],recommended:['White rice and white bread (lower potassium)','Cabbage, cauliflower, green beans','Apples and grapes (lower potassium)','Egg whites','Water — as advised by your doctor']},
    'Osteoporosis':{avoid:['Excessive caffeine (leaches calcium)','Alcohol (weakens bones)','High sodium foods','Cola drinks (phosphoric acid)','Smoking'],recommended:['Dairy products (milk, yoghurt, cheese)','Tofu and soy products','Sardines and anchovies with bones','Leafy greens (bok choy, kailan)','Calcium-fortified plant milk']},
    'Dementia':{avoid:['Alcohol','Processed and fried foods','Sugary foods and drinks','Trans fats (margarine, packaged snacks)','Excessive red meat'],recommended:['Blueberries (brain-protective antioxidants)','Leafy greens (kale, spinach)','Fatty fish (omega-3 for brain health)','Olive oil','Turmeric and curcumin']},
    "Parkinson's":{avoid:['High-protein meals close to Levodopa doses','Constipating foods (low fibre)','Alcohol','Excessive caffeine'],recommended:['High fibre foods (prunes, beans, oats)','Antioxidant-rich berries and greens','Adequate water intake','Omega-3 rich foods','Small frequent meals (easier to swallow)']}
};

const DialectNames = { singlish:'Singlish',mandarin:'Mandarin Chinese',cantonese:'Cantonese',hokkien:'Hokkien',teochew:'Teochew',hakka:'Hakka',malay:'Malay',tamil:'Tamil',english:'English',vietnamese:'Vietnamese',thai:'Thai',tagalog:'Tagalog (Filipino)',indonesian:'Bahasa Indonesia',burmese:'Burmese',khmer:'Khmer',lao:'Lao',hindi:'Hindi',bengali:'Bengali',punjabi:'Punjabi',gujarati:'Gujarati',urdu:'Urdu' };
const LangCodes = { singlish:'en-SG',mandarin:'zh-CN',cantonese:'zh-HK',hokkien:'zh-TW',teochew:'zh-TW',hakka:'zh-TW',malay:'ms-MY',tamil:'ta-IN',english:'en-US',vietnamese:'vi-VN',thai:'th-TH',tagalog:'fil-PH',indonesian:'id-ID',burmese:'my-MM',khmer:'km-KH',lao:'lo-LA',hindi:'hi-IN',bengali:'bn-IN',punjabi:'pa-IN',gujarati:'gu-IN',urdu:'ur-PK' };

const NewsData = {
    english:[
        {category:'Health',title:'Benefits of Daily Walking',content:'Just 30 minutes of walking per day can significantly reduce heart disease risk and improve mental wellbeing. Even a gentle morning stroll counts! Try walking to the nearby park or around the neighbourhood after breakfast.'},
        {category:'Nutrition',title:'Key Vitamins for Seniors',content:'Vitamin D helps bones stay strong, B12 supports memory and energy, and Omega-3 fatty acids protect the heart. Ask your doctor about supplements that are right for you.'},
        {category:'Community',title:'Senior Wellness Events This Week',content:'Your local community centre is hosting gentle yoga on Tuesday at 9am, social card games on Thursday at 2pm, and a free health screening this Saturday morning. Do consider joining!'},
        {category:'Wellness',title:'Better Sleep Tips for Seniors',content:'Quality sleep improves mood and sharpens the mind. Try going to bed at the same time each night, keep the bedroom cool and dark, avoid heavy meals after 7pm, and limit screen time before bed.'},
        {category:'Safety',title:'Preventing Falls at Home',content:'Install grab bars in the bathroom, keep walkways clear of clutter, wear non-slip slippers indoors, ensure good lighting especially at night, and consider a non-slip mat in the shower.'}
    ],
    mandarin:[
        {category:'健康',title:'每日步行的好处',content:'每天步行30分钟可以显著降低心脏病风险，改善老年人的心理健康。早晨的轻松散步也很有效！可以去附近的公园或者在小区里走走。'},
        {category:'营养',title:'老年人的关键维生素',content:'维生素D帮助骨骼强健，B12支持记忆和精力，Omega-3脂肪酸保护心脏健康。可以询问您的医生是否需要补充剂。'},
        {category:'社区',title:'本周老年健康活动',content:'社区中心本周举办温和瑜伽、社交棋牌活动和免费健康检查。欢迎参加，增进健康和友谊！'},
        {category:'健康',title:'老年人优质睡眠小贴士',content:'优质睡眠改善情绪，增强思维能力。建议每晚定时睡觉，保持卧室凉爽黑暗，避免睡前使用手机和平板电脑。'},
        {category:'安全',title:'居家防跌倒安全提示',content:'在浴室安装扶手，保持通道畅通，穿防滑拖鞋，确保全屋光线充足，尤其是夜间，防止跌倒受伤。'}
    ],
    cantonese:[
        {category:'健康',title:'每日步行嘅好處',content:'每日步行30分鐘可以顯著降低心臟病風險，改善長者心理健康。每朝早嘅輕鬆散步都好有效！可以去附近公園行行。'},
        {category:'營養',title:'長者必需嘅維生素',content:'維生素D幫助骨骼強健，B12支持記憶力同精力，Omega-3脂肪酸保護心臟健康。可以問下醫生係咪需要補充劑。'},
        {category:'社區',title:'本週長者健康活動',content:'社區中心本週有溫和瑜伽、社交麻雀活動同免費健康檢查，歡迎參加，增進健康同友誼！'},
        {category:'健康',title:'長者優質睡眠貼士',content:'優質睡眠改善情緒，增強思維能力。建議每晚定時瞓覺，保持睡房涼爽，瞓前唔好玩手機。'},
        {category:'安全',title:'居家防跌倒安全貼士',content:'喺浴室裝扶手，保持走道暢通，著防滑拖鞋，確保全屋光線充足，尤其係夜間，防止跌倒受傷。'}
    ],
    malay:[
        {category:'Kesihatan',title:'Manfaat Berjalan Setiap Hari',content:'Hanya 30 minit berjalan sehari boleh mengurangkan risiko penyakit jantung dan meningkatkan kesihatan mental warga emas. Cuba berjalan di taman berdekatan setiap pagi!'},
        {category:'Pemakanan',title:'Vitamin Penting untuk Warga Emas',content:'Vitamin D menguatkan tulang, B12 menyokong ingatan dan tenaga, manakala Omega-3 melindungi jantung. Tanya doktor anda tentang suplemen yang sesuai.'},
        {category:'Komuniti',title:'Aktiviti Komuniti Minggu Ini',content:'Pusat komuniti menganjurkan yoga lembut, permainan sosial, dan pemeriksaan kesihatan percuma minggu ini. Jom sertai untuk kesihatan dan persahabatan!'},
        {category:'Kesejahteraan',title:'Tips Tidur Lebih Baik',content:'Tidur berkualiti meningkatkan mood dan ketajaman minda. Cuba tidur pada waktu yang sama setiap malam dan elakkan skrin sebelum tidur.'},
        {category:'Keselamatan',title:'Selamat di Rumah',content:'Pasang bar pegangan di bilik mandi, pastikan laluan bebas, pakai selipar tidak licin, dan pastikan pencahayaan baik untuk mengelak jatuh.'}
    ]
};

function getNews(d){ return NewsData[d]||NewsData.english; }

// ── SCREENS & TABS ──
function showScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById(id).classList.add('active'); window.scrollTo(0,0); }
function switchTab(tabName){
    document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    document.getElementById('tab-'+tabName).classList.add('active');
    event.currentTarget.classList.add('active');
    if(tabName==='health') renderHealthTab();
    if(tabName==='schedule') renderScheduleTab();
    if(tabName==='profile') renderProfileTab();
}

// ── PROFILE ──
function selectProfile(key){ if(key==='custom'){showScreen('profileSetupScreen');return;} AppState.currentProfile=JSON.parse(JSON.stringify(Profiles[key])); AppState.waterCount=0; init(); showScreen('dashboardScreen'); }
function addMedicationField(){ const l=document.getElementById('medicationList'); const d=document.createElement('div'); d.className='med-item'; d.innerHTML='<input type="text" placeholder="Medication name" class="med-name"><input type="time" class="med-time"><select class="med-dosage"><option>Once daily</option><option>Twice daily</option><option>Three times daily</option></select>'; l.appendChild(d); }

const FAMILY_OPTS = `<option value="👨">👨 Son</option><option value="👩">👩 Daughter</option><option value="👴">👴 Husband</option><option value="👵">👵 Wife</option><option value="👦">👦 Grandson</option><option value="👧">👧 Granddaughter</option><option value="👶">👶 Grandchild</option><option value="🧑">🧑 Sibling</option><option value="👨‍⚕️">👨‍⚕️ Caregiver</option><option value="🤝">🤝 Friend</option><option value="👤">👤 Other</option>`;

function addFamilyField(){
    const list=document.getElementById('familyInputList');
    if(!list) return;
    const div=document.createElement('div');
    div.className='family-input-row';
    div.innerHTML=`<input type="text" placeholder="Name" class="family-name"><input type="tel" placeholder="+65 9123 4567" class="family-phone"><select class="family-avatar">${FAMILY_OPTS}</select>`;
    list.appendChild(div);
}
function saveProfile(e){
    e.preventDefault();
    const name=document.getElementById('userName').value;
    const age=parseInt(document.getElementById('userAge').value);
    const dialect=document.getElementById('userDialect').value;
    const ec=document.getElementById('emergencyContact').value;
    const conditions=[];
    document.querySelectorAll('.checkbox-grid input:checked').forEach(cb=>conditions.push(cb.value));
    if(!conditions.length) conditions.push('General wellness');
    const avatar=age>70?'👴':'👵';
    const meds=[];
    document.querySelectorAll('#medicationList .med-item').forEach(item=>{
        const n=item.querySelector('.med-name').value, t=item.querySelector('.med-time').value;
        if(n&&t) meds.push({name:n,time:t,dosage:item.querySelector('.med-dosage').value,icon:'💊',taken:false});
    });
    if(!meds.length) meds.push({name:'Morning Vitamin',time:'08:00',dosage:'Once daily',icon:'💊',taken:false});
    // Collect family members with phone numbers
    const family=[];
    document.querySelectorAll('#familyInputList .family-input-row').forEach(row=>{
        const fname=row.querySelector('.family-name')?.value?.trim();
        const fphone=row.querySelector('.family-phone')?.value?.trim()||'';
        const favatar=row.querySelector('.family-avatar')?.value||'👤';
        if(fname) family.push({name:fname,phone:fphone,avatar:favatar});
    });
    if(!family.length){ family.push({name:'Family Member 1',avatar:'👨',phone:''}); family.push({name:'Family Member 2',avatar:'👩',phone:''}); }
    AppState.currentProfile={name,age,conditions,dialect,avatar,emergencyContact:ec,medications:meds,family};
    AppState.waterCount=0; init(); showScreen('dashboardScreen');
}

// ── DASHBOARD ──
function init(){
    const p=AppState.currentProfile;
    document.getElementById('navUserName').textContent=p.name;
    document.getElementById('navAvatar').textContent=p.avatar;
    const h=new Date().getHours();
    const g=h<12?'Good Morning':h<17?'Good Afternoon':'Good Evening';
    document.getElementById('greetingText').textContent=`${g}, ${p.name.split(' ').pop()}! ${p.avatar}`;
    document.getElementById('dateDisplay').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    renderMeds(); renderNews(); renderFamily(); renderWater();
    AppState.chatMessages=[{role:'assistant',content:`Hello ${p.name.split(' ').pop()}! 😊 I'm your AI companion. I know you have ${p.conditions.join(' and ')}. Ask me about your water intake (${AppState.waterCount}/8 glasses), food advice for your conditions, medications, or just chat. How are you feeling today?`}];
}

// ── MEDICATIONS ──
function renderMeds(){
    const meds=AppState.currentProfile.medications;
    const taken=meds.filter(m=>m.taken).length;
    document.getElementById('medCompleted').textContent=`${taken}/${meds.length} Taken`;
    document.getElementById('medicationCards').innerHTML=meds.map((m,i)=>`
        <div class="med-item-dashboard${m.taken?' taken':''}">
            <div class="med-icon">${m.icon}</div>
            <div class="med-info">
                <span class="med-name">${m.name} — ${m.dosage}</span>
                <span class="med-time"><i class="fas fa-clock"></i> ${fmtTime(m.time)}</span>
            </div>
            <div class="med-btn-group">
                ${m.taken
                    ? `<button class="med-taken-btn">✓ Taken</button>
                       <button class="med-undo-btn-new" onclick="undoMed(${i})">↩ Undo</button>`
                    : `<button class="med-take-btn-new" onclick="takeMed(${i})">Mark Taken</button>`
                }
            </div>
        </div>`).join('');
}
function takeMed(i){AppState.currentProfile.medications[i].taken=true;renderMeds();}
function undoMed(i){AppState.currentProfile.medications[i].taken=false;renderMeds();}
function fmtTime(t){if(!t)return'';const[h,m]=t.split(':').map(Number);return`${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;}

// ── WATER ──
function renderWater(){
    let h=''; for(let i=0;i<8;i++) h+=`<span class="water-cup" onclick="setWater(${i+1})">${i<AppState.waterCount?'🥤':'🫙'}</span>`;
    document.getElementById('waterCups').innerHTML=h;
    document.getElementById('waterCount').textContent=`${AppState.waterCount} / 8 glasses`;
}
function updateWater(d){AppState.waterCount=Math.max(0,Math.min(8,AppState.waterCount+d));renderWater();}
function setWater(n){AppState.waterCount=n;renderWater();}

// ── FAMILY ──
const _WA_ICON=`<svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.99 0C5.376 0 0 5.373 0 11.988c0 2.114.554 4.1 1.523 5.827L.057 24l6.304-1.654A11.942 11.942 0 0011.99 24C18.603 24 24 18.627 24 12.012 24 5.374 18.603 0 11.99 0zm.01 21.785a9.783 9.783 0 01-4.988-1.365l-.357-.212-3.743.981 1.001-3.651-.232-.374a9.757 9.757 0 01-1.499-5.234c0-5.404 4.399-9.8 9.818-9.8 5.42 0 9.818 4.396 9.818 9.8 0 5.405-4.398 9.855-9.818 9.855z"/></svg>`;
function renderFamily(){
    const p=AppState.currentProfile;
    document.getElementById('familyMembers').innerHTML=p.family.map((f,i)=>`
        <div class="family-member">
            <div class="member-avatar">${f.avatar}</div>
            <div class="member-info"><span class="member-name">${f.name}</span><span class="member-status">Connected ✓</span></div>
            <button type="button" onclick="whatsappMember(${i})" style="background:#25D366;color:white;border:none;border-radius:20px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;font-family:Nunito,sans-serif;white-space:nowrap;flex-shrink:0">${_WA_ICON} WhatsApp</button>
        </div>`).join('');
    const wb=document.getElementById('whatsappButtons');
    if(wb) wb.innerHTML=`<button type="button" onclick="whatsappAllFamily()" style="width:100%;background:#25D366;color:white;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:Nunito,sans-serif;margin-top:8px;box-shadow:0 4px 12px rgba(37,211,102,0.3)">${_WA_ICON} WhatsApp Daily Update to All Family</button>`;
    const r=document.getElementById('familyRecipients');
    if(r) r.innerHTML='<h4 style="margin-bottom:8px">Send to:</h4>'+p.family.map((f,i)=>`<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer"><input type="checkbox" checked> ${f.avatar} ${f.name}</label>`).join('');
}

function whatsappMember(i){
    const p=AppState.currentProfile; const f=p.family[i];
    const meds=p.medications.filter(m=>m.taken).map(m=>m.name).join(', ')||'None yet';
    const msg=encodeURIComponent(`💛 Daily Update from ${p.name}\n\n💊 Medications: ${meds}\n🥤 Water: ${AppState.waterCount}/8 glasses\n😊 Feeling well and thinking of you!\n\nSent via DailyCare 🌅`);
    const phone=f.phone?f.phone.replace(/\D/g,''):'';
    window.open(phone?`https://wa.me/${phone}?text=${msg}`:`https://wa.me/?text=${msg}`,'_blank');
}

function whatsappAllFamily(){
    const p=AppState.currentProfile;
    const meds=p.medications.filter(m=>m.taken).map(m=>m.name).join(', ')||'None yet';
    const date=new Date().toLocaleDateString('en-SG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    const msg=encodeURIComponent(`💛 Daily Update from ${p.name}\n\nGood day family! Here's today's summary:\n\n💊 Medications taken: ${meds}\n🥤 Water: ${AppState.waterCount}/8 glasses\n📅 ${date}\n😊 All is well and thinking of everyone!\n\nSent with love via DailyCare 🌅`);
    window.open(`https://wa.me/?text=${msg}`,'_blank');
}

// ── NEWS ──
function renderNews(){
    AppState.newsItems=getNews(AppState.currentProfile.dialect);
    AppState.currentNewsIndex=0;
    document.getElementById('newsCards').innerHTML=AppState.newsItems.map((n,i)=>`
        <div class="news-item" onclick="startNewsReading(${i})">
            <span class="news-category">${n.category}</span>
            <h4>${n.title}</h4>
            <p>${n.content.substring(0,90)}...</p>
        </div>`).join('');
}

// ── TTS — SIMPLE & RELIABLE ──
function startNewsReading(index){
    if(index!==undefined) AppState.currentNewsIndex=index;
    displayNewsItem();
    document.getElementById('newsReadingOverlay').classList.add('active');
    document.getElementById('readingDialectNote').textContent='Reading in '+(DialectNames[AppState.currentProfile.dialect]||'English');
    const n=AppState.newsItems[AppState.currentNewsIndex];
    speakText(n.title+'. '+n.content);
}

function stopNewsReading(){ stopSpeaking(); document.getElementById('newsReadingOverlay').classList.remove('active'); }

function displayNewsItem(){
    const n=AppState.newsItems[AppState.currentNewsIndex];
    document.getElementById('readingTitle').textContent=n.title;
    document.getElementById('newsTextDisplay').textContent=n.content;
    document.getElementById('readingPage').textContent=`${AppState.currentNewsIndex+1} / ${AppState.newsItems.length}`;
    document.getElementById('readingProgress').style.width=`${(AppState.currentNewsIndex+1)/AppState.newsItems.length*100}%`;
}

function nextNews(){ stopSpeaking(); if(AppState.currentNewsIndex<AppState.newsItems.length-1){AppState.currentNewsIndex++;displayNewsItem();const n=AppState.newsItems[AppState.currentNewsIndex];speakText(n.title+'. '+n.content);} }
function prevNews(){ stopSpeaking(); if(AppState.currentNewsIndex>0){AppState.currentNewsIndex--;displayNewsItem();const n=AppState.newsItems[AppState.currentNewsIndex];speakText(n.title+'. '+n.content);} }

function toggleNewsReading(){
    const btn=document.getElementById('playPauseBtn');
    if(!window.speechSynthesis) return;
    if(AppState.isSpeaking){
        window.speechSynthesis.pause();
        AppState.isSpeaking=false;
        btn.innerHTML='<i class="fas fa-play"></i>';
    } else if(window.speechSynthesis.paused){
        window.speechSynthesis.resume();
        AppState.isSpeaking=true;
        btn.innerHTML='<i class="fas fa-pause"></i>';
    } else {
        const n=AppState.newsItems[AppState.currentNewsIndex];
        speakText(n.title+'. '+n.content);
    }
}

function speakText(text){
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang=LangCodes[AppState.currentProfile?.dialect]||'en-US';
    u.rate=0.85; u.pitch=1.0; u.volume=1.0;
    u.onstart=()=>{ AppState.isSpeaking=true; const b=document.getElementById('playPauseBtn'); if(b) b.innerHTML='<i class="fas fa-pause"></i>'; };
    u.onend=()=>{ AppState.isSpeaking=false; const b=document.getElementById('playPauseBtn'); if(b) b.innerHTML='<i class="fas fa-play"></i>'; };
    u.onerror=()=>{ AppState.isSpeaking=false; };
    AppState.currentUtterance=u;
    window.speechSynthesis.speak(u);
    // Chrome keep-alive fix
    const ka=setInterval(()=>{ if(!window.speechSynthesis.speaking){clearInterval(ka);return;} window.speechSynthesis.pause(); window.speechSynthesis.resume(); },10000);
}

function stopSpeaking(){ window.speechSynthesis.cancel(); AppState.isSpeaking=false; const b=document.getElementById('playPauseBtn'); if(b) b.innerHTML='<i class="fas fa-play"></i>'; }

// ── AI CHAT ──
let chatAudioOn = true;

function chatWithAI(){ const c=document.getElementById('aiChatCard'); c.style.display='block'; renderChat(); c.scrollIntoView({behavior:'smooth'}); }
function closeChat(){ document.getElementById('aiChatCard').style.display='none'; stopSpeaking(); }
function handleChatKeypress(e){ if(e.key==='Enter') sendMessage(); }

function toggleChatAudio(){
    chatAudioOn = !chatAudioOn;
    const btn = document.getElementById('audioToggleBtn');
    if(chatAudioOn){
        btn.innerHTML = '<i class="fas fa-volume-up"></i>';
        btn.style.color = '#4ECDC4';
        btn.title = 'Audio ON';
    } else {
        stopSpeaking();
        btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        btn.style.color = '#9ca3af';
        btn.title = 'Audio OFF';
    }
}

function renderChat(){
    const body=document.getElementById('chatBody');
    body.innerHTML=AppState.chatMessages.map(m=>`<div class="chat-message ${m.role==='assistant'?'ai-message':'user-message'}"><div class="message-content">${m.content}</div></div>`).join('');
    body.scrollTop=body.scrollHeight;
}

async function sendMessage(){
    const input=document.getElementById('chatInput');
    const text=input.value.trim(); if(!text) return;
    if(!AGNES_API_KEY){ try{ const r=await fetch("http://localhost:8080/config"); const d=await r.json(); AGNES_API_KEY=d.agnes_api_key||""; }catch(e){} }
    if(!AGNES_API_KEY){ const k=prompt("🔑 Paste your Agnes AI API key:"); if(k) AGNES_API_KEY=k.trim(); }
    AppState.chatMessages.push({role:'user',content:text}); input.value=''; renderChat();
    const body=document.getElementById('chatBody');
    body.insertAdjacentHTML('beforeend','<div class="chat-message ai-message" id="typing"><div class="message-content">💭 Thinking...</div></div>');
    body.scrollTop=body.scrollHeight;
    try{
        const p=AppState.currentProfile;
        const takenMeds=p.medications.filter(m=>m.taken).map(m=>m.name).join(', ')||'none yet';
        const pendingMeds=p.medications.filter(m=>!m.taken).map(m=>`${m.name} at ${fmtTime(m.time)}`).join(', ')||'none';
        const avoid=[...new Set(p.conditions.flatMap(c=>HealthAdvice[c]?.avoid.slice(0,3)||[]))].join(', ');
        const good=[...new Set(p.conditions.flatMap(c=>HealthAdvice[c]?.recommended.slice(0,3)||[]))].join(', ');
        const sys=`You are a warm caring AI companion for ${p.name}, age ${p.age}.
CONDITIONS: ${p.conditions.join(', ')}
MEDICATIONS TAKEN TODAY: ${takenMeds}
MEDICATIONS STILL PENDING: ${pendingMeds}
WATER DRUNK TODAY: ${AppState.waterCount} out of 8 glasses
FOODS TO AVOID for their conditions: ${avoid}
RECOMMENDED FOODS for their conditions: ${good}
LANGUAGE: ${DialectNames[p.dialect]||'English'}
EMERGENCY CONTACT: ${p.emergencyContact}

IMPORTANT RULES:
- Always use the profile info above when answering — never say you don't know
- Water question: tell them exactly "${AppState.waterCount} out of 8 glasses" and encourage more if needed
- Food questions: give SPECIFIC advice based on their conditions (${p.conditions.join(', ')})
- Medication questions: refer to their actual med list above
- Keep responses SHORT (2-4 sentences), warm, simple — like a caring family member
- If they seem unwell or in pain, gently suggest calling ${p.emergencyContact}
- Try to respond in simple ${DialectNames[p.dialect]||'English'} when possible`;
        const res=await fetch(`${AGNES_BASE_URL}/chat/completions`,{method:'POST',headers:{'Authorization':`Bearer ${AGNES_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'agnes-2.0-flash',messages:[{role:'system',content:sys},...AppState.chatMessages.slice(-12)],max_tokens:280})});
        document.getElementById('typing')?.remove();
        if(!res.ok) throw new Error(res.status);
        const data=await res.json();
        const reply=data.choices[0].message.content;
        AppState.chatMessages.push({role:'assistant',content:reply}); renderChat();
        if(chatAudioOn) speakText(reply);
    }catch(err){
        document.getElementById('typing')?.remove();
        const msg='😊 Connection issue. Check server.py is running at localhost:8080!';
        AppState.chatMessages.push({role:'assistant',content:msg}); renderChat();
    }
}

// ── HEALTH TAB ──
function renderHealthTab(){
    const p=AppState.currentProfile;
    document.getElementById('healthConditions').innerHTML=p.conditions.map(c=>`<span class="condition-tag">${c}</span>`).join('');
    const avoid=[...new Set(p.conditions.flatMap(c=>HealthAdvice[c]?.avoid||[]))];
    const rec=[...new Set(p.conditions.flatMap(c=>HealthAdvice[c]?.recommended||[]))];
    document.getElementById('foodsToAvoid').innerHTML=avoid.map(f=>`<div class="food-item food-bad">❌ ${f}</div>`).join('')||'<p style="color:#888">No specific restrictions.</p>';
    document.getElementById('foodsRecommended').innerHTML=rec.map(f=>`<div class="food-item food-good">✅ ${f}</div>`).join('')||'<p style="color:#888">Follow a balanced diet.</p>';
    document.getElementById('healthMedications').innerHTML=p.medications.map(m=>`<div class="food-item">💊 <strong>${m.name}</strong> — ${m.dosage} — ${fmtTime(m.time)} ${m.taken?'<span style="color:#4ECDC4">✅ Taken</span>':'<span style="color:#f59e0b">⏳ Pending</span>'}</div>`).join('');
}

// ── SCHEDULE TAB ──
function renderScheduleTab(){
    const p=AppState.currentProfile;
    let items=p.medications.map(m=>({time:m.time,icon:m.icon,task:`Take ${m.name} (${m.dosage})`,done:m.taken}));
    items=items.concat([{time:'07:00',icon:'🌅',task:'Morning stretch (10 mins)',done:false},{time:'08:30',icon:'🥣',task:'Breakfast',done:false},{time:'10:00',icon:'🚶',task:'Morning walk (30 mins)',done:false},{time:'12:30',icon:'🍱',task:'Lunch',done:false},{time:'15:00',icon:'🫖',task:'Afternoon tea & rest',done:false},{time:'18:00',icon:'🍽️',task:'Dinner',done:false},{time:'21:00',icon:'😴',task:'Wind down for sleep',done:false}]);
    items.sort((a,b)=>a.time.localeCompare(b.time));
    document.getElementById('scheduleList').innerHTML=items.map(i=>`<div class="schedule-item"><span class="schedule-time">${fmtTime(i.time)}</span><span class="schedule-icon">${i.icon}</span><span class="schedule-task">${i.task}</span>${i.done?'<span style="color:#4ECDC4;font-weight:800">✅</span>':''}</div>`).join('');
}

// ── PROFILE TAB ──
function renderProfileTab(){
    const p=AppState.currentProfile;
    document.getElementById('profileInfo').innerHTML=`
        <div class="profile-info-row"><span class="profile-info-label">Name</span><span class="profile-info-value">${p.avatar} ${p.name}</span></div>
        <div class="profile-info-row"><span class="profile-info-label">Age</span><span class="profile-info-value">${p.age} years old</span></div>
        <div class="profile-info-row"><span class="profile-info-label">Conditions</span><span class="profile-info-value">${p.conditions.join(', ')}</span></div>
        <div class="profile-info-row"><span class="profile-info-label">Language</span><span class="profile-info-value">${DialectNames[p.dialect]||p.dialect}</span></div>
        <div class="profile-info-row">
            <span class="profile-info-label">📞 Emergency</span>
            <input type="tel" value="${p.emergencyContact}" onchange="AppState.currentProfile.emergencyContact=this.value"
                style="font-weight:800;font-size:15px;border:2px solid #f0e8e0;border-radius:10px;padding:6px 12px;font-family:Nunito,sans-serif;width:180px">
        </div>
        <div class="profile-info-row"><span class="profile-info-label">Water Today</span><span class="profile-info-value">${AppState.waterCount} / 8 🥤</span></div>`;
    const sel=document.getElementById('languageChange'); if(sel) sel.value=p.dialect;
    // Render editable family numbers
    const fEl=document.getElementById('familyEditList');
    if(fEl) fEl.innerHTML=p.family.map((f,i)=>`
        <div style="display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1.5px solid #f0e8e0">
            <span style="font-size:26px">${f.avatar}</span>
            <div style="flex:1">
                <div style="font-weight:800;font-size:14px;margin-bottom:4px">${f.name}</div>
                <input type="tel" value="${f.phone||''}" placeholder="+65 9123 4567"
                    onchange="updateFamilyPhone(${i},this.value)"
                    style="width:100%;padding:8px 12px;border:2px solid #f0e8e0;border-radius:10px;font-size:14px;font-family:Nunito,sans-serif">
            </div>
        </div>`).join('');
}

function updateFamilyPhone(i,phone){
    AppState.currentProfile.family[i].phone=phone.trim();
    const inputs=document.querySelectorAll('#familyEditList input[type=tel]');
    if(inputs[i]){ inputs[i].style.borderColor='#4ECDC4'; setTimeout(()=>{inputs[i].style.borderColor='#f0e8e0';},1500); }
}

function changeLanguage(d){ AppState.currentProfile.dialect=d; renderNews(); document.getElementById('languageChanged').style.display='block'; setTimeout(()=>{document.getElementById('languageChanged').style.display='none';},2000); }

// ── VIDEO SUMMARY ──
function sendDailySummary(){
    renderFamily();
    // Reset video area
    const vid = document.getElementById('generatedVideo');
    const ph = document.getElementById('videoPlaceholderInner');
    const st = document.getElementById('generationStatus');
    if(vid){ vid.style.display='none'; vid.src=''; }
    if(ph){ ph.style.display='flex'; ph.innerHTML='<div style="text-align:center;color:rgba(255,255,255,0.6);padding:40px"><i class="fas fa-film" style="font-size:48px;display:block;margin-bottom:12px"></i><p>Agnes AI will generate a personalised video</p></div>'; }
    if(st){ st.textContent=''; }
    document.getElementById('videoSummaryModal').classList.add('active');
}
function closeVideoModal(){ document.getElementById('videoSummaryModal').classList.remove('active'); }

async function generateAndSendSummary(){
    const p=AppState.currentProfile;
    const takenMeds=p.medications.filter(m=>m.taken).map(m=>m.name).join(', ')||'None yet';
    const statusEl=document.getElementById('generationStatus');
    const placeholder=document.getElementById('videoPlaceholderInner');
    const videoEl=document.getElementById('generatedVideo');

    videoEl.style.display='none';
    placeholder.style.display='flex';
    placeholder.innerHTML=`<div style="text-align:center;color:rgba(255,255,255,0.85);padding:32px"><span style="font-size:40px;animation:spin 2s linear infinite;display:block;margin-bottom:12px">🎬</span><p style="font-size:14px;font-weight:700">Agnes AI is creating your video...</p><p style="font-size:12px;opacity:0.7;margin-top:6px">This takes 1-2 minutes — please wait!</p></div>`;
    statusEl.style.color='#4A90D9'; statusEl.textContent='⏳ Submitting video job to Agnes AI...';

    const prompt=`A warm heartwarming morning scene for elderly care. Soft sunlight through lace curtains, a cup of hot tea on a wooden table with fresh flowers. Gentle slow motion. Warm golden tones. ${p.name} sends love to family today. Medications taken: ${takenMeds}. Water: ${AppState.waterCount} of 8 glasses.`;

    try{
        const res=await fetch('http://localhost:8080/generate-video',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({prompt})
        });
        if(!res.ok) throw new Error(`Server error ${res.status} — is server.py running?`);
        const {job_id}=await res.json();
        statusEl.textContent=`🎬 Generating video... job: ${job_id}`;
        await pollLocalJob(job_id,statusEl,placeholder,videoEl);
    }catch(err){
        console.error('Video error:',err);
        statusEl.style.color='#D9534F';
        statusEl.textContent='❌ '+err.message+'. Run: python3 server.py in terminal!';
    }
}

async function pollLocalJob(jobId,statusEl,placeholder,videoEl){
    for(let i=0;i<60;i++){
        await new Promise(r=>setTimeout(r,5000));
        try{
            const res=await fetch(`http://localhost:8080/video-status/${jobId}`);
            const job=await res.json();
            if(job.status==='completed'&&job.file){
                const videoUrl=`http://localhost:8080${job.file}`;
                // Make sure modal is still open
                document.getElementById('videoSummaryModal').classList.add('active');
                // Set video source without triggering navigation
                videoEl.setAttribute('src', videoUrl);
                videoEl.style.display='block';
                videoEl.controls=true;
                videoEl.load(); // Force reload the video element
                placeholder.style.display='none';
                statusEl.style.color='#4ECDC4';
                statusEl.textContent='✅ Video ready! Press ▶️ play below 💛';
                // Add WhatsApp share button
                let shareBtn = document.getElementById('waShareBtn');
                if(!shareBtn){
                    shareBtn = document.createElement('button');
                    shareBtn.id = 'waShareBtn';
                    shareBtn.type = 'button';
                    shareBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white" style="vertical-align:middle;margin-right:6px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.99 0C5.376 0 0 5.373 0 11.988c0 2.114.554 4.1 1.523 5.827L.057 24l6.304-1.654A11.942 11.942 0 0011.99 24C18.603 24 24 18.627 24 12.012 24 5.374 18.603 0 11.99 0zm.01 21.785a9.783 9.783 0 01-4.988-1.365l-.357-.212-3.743.981 1.001-3.651-.232-.374a9.757 9.757 0 01-1.499-5.234c0-5.404 4.399-9.8 9.818-9.8 5.42 0 9.818 4.396 9.818 9.8 0 5.405-4.398 9.855-9.818 9.855z"/></svg> Share on WhatsApp`;
                    shareBtn.style.cssText='width:100%;background:#25D366;color:white;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;margin-top:12px;font-family:Nunito,sans-serif;display:flex;align-items:center;justify-content:center;';
                    shareBtn.onclick = function(e){ e.preventDefault(); whatsappAllFamily(); };
                    statusEl.parentNode.appendChild(shareBtn);
                }
                return;
            }
            if(job.status==='failed'){
                statusEl.style.color='#D9534F';
                statusEl.textContent='❌ Video failed. Try again.';
                return;
            }
            statusEl.textContent=`🎬 Generating... ${job.progress||0}% (${i+1}/60)`;
        }catch(e){ console.warn('Poll error:',e); }
    }
    statusEl.style.color='#D9534F'; statusEl.textContent='⏰ Timed out — try again';
}


function showVideoSuccess(statusEl,placeholder){
    placeholder.innerHTML='<div class="video-placeholder-inner"><i class="fas fa-check-circle" style="color:#4ECDC4"></i><p>Summary ready!</p></div>';
    statusEl.style.color='#4ECDC4'; statusEl.textContent='✅ Daily summary sent to family! 💛';
}

function toggleStepEdit(){
    const inp=document.getElementById('stepCountInput'),disp=document.getElementById('stepCountDisplay'),btn=document.getElementById('stepEditBtn');
    if(!inp) return;
    if(inp.style.display==='none'){ inp.style.display='inline-block'; inp.value=AppState.stepCount; disp.style.display='none'; btn.textContent='✓ Done'; }
    else{ updateSteps(inp.value); inp.style.display='none'; disp.style.display='inline-block'; btn.textContent='✏️ Edit'; }
}
function updateSteps(val){ AppState.stepCount=parseInt(val)||0; const d=document.getElementById('stepCountDisplay'); if(d) d.textContent=AppState.stepCount.toLocaleString(); refreshStepBar(); }
function updateStepGoal(val){ AppState.stepGoal=parseInt(val)||5000; const d=document.getElementById('stepGoalDisplay'); if(d) d.textContent=AppState.stepGoal.toLocaleString(); refreshStepBar(); }
function refreshStepBar(){ const b=document.getElementById('stepProgressBar'); if(b) b.style.width=Math.min(AppState.stepCount/AppState.stepGoal*100,100)+'%'; }

function callEmergency(){ const c=AppState.currentProfile?.emergencyContact||'emergency'; if(confirm(`🚨 Call ${c}?`)) window.location.href=`tel:${c.replace(/\s/g,'')}`; }

function whatsappAllFamily(){
    const p=AppState.currentProfile;
    const takenMeds=p.medications.filter(m=>m.taken).map(m=>m.name).join(', ')||'None yet';
    const msg=encodeURIComponent(`💛 Daily Update from ${p.name}\n\nGood day family! Here is today's health summary:\n\n💊 Medications taken: ${takenMeds}\n🥤 Water intake: ${AppState.waterCount}/8 glasses\n📅 ${new Date().toLocaleDateString('en-SG')}\n😊 All is well and thinking of everyone!\n\nSent with love via DailyCare 🌅`);
    window.open(`https://wa.me/?text=${msg}`,'_blank');
}

function whatsappMember(index){
    const p=AppState.currentProfile;
    const f=p.family[index];
    const takenMeds=p.medications.filter(m=>m.taken).map(m=>m.name).join(', ')||'None yet';
    const msg=encodeURIComponent(`💛 Daily Update from ${p.name}\n\n💊 Medications: ${takenMeds}\n🥤 Water: ${AppState.waterCount}/8 glasses\n😊 Feeling well!\n\nSent via DailyCare 🌅`);
    const phone=f.phone?f.phone.replace(/\D/g,''):'';
    window.open(phone?`https://wa.me/${phone}?text=${msg}`:`https://wa.me/?text=${msg}`,'_blank');
}
