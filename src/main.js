import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cfg = window.PAZARELDEN_CONFIG || {};

const supabase =
  cfg.supabaseUrl && cfg.supabaseAnonKey
    ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;

const cats = [
  'Vasıta','Emlak','Cep Telefonu','Bilgisayar','Elektronik',
  'Ev ve Yaşam','Giyim','Anne ve Bebek','Spor','Hobi','Kitap','Diğer'
];

const icons = [
  '🚗','🏠','📱','💻','📺','🛋️','👕','🧸','⚽','🎨','📚','📦'
];

let currentUser = null;
let currentProfile = null;
let currentActiveListingCount = 0;

/* =========================================================
   YARDIMCILAR
========================================================= */

function safe(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function dateText(value) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function isAdmin() {
  return currentProfile?.is_admin === true;
}

async function loadSession() {
  if (!supabase) return;

  const { data } = await supabase.auth.getSession();

  currentUser = data?.session?.user || null;
  currentProfile = null;
  currentActiveListingCount = 0;

  if (!currentUser) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .maybeSingle();

  currentProfile = profile || null;

  const { count } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', currentUser.id)
    .eq('status', 'active');

  currentActiveListingCount = count || 0;
}

function userName() {
  if (currentProfile?.full_name?.trim()) {
    return currentProfile.full_name.trim();
  }

  return 'Profilim';
}

/* =========================================================
   20 KADEMELİ ROZET
========================================================= */

const rankNames = [
  'Onbaşı',
  'Çavuş',
  'Başçavuş',
  'Kıdemli Başçavuş',
  'Uzman Satıcı',
  'Kıdemli Satıcı',
  'Usta Satıcı',
  'Bronz Satıcı',
  'Gümüş Satıcı',
  'Altın Satıcı',
  'Platin Satıcı',
  'Elmas Satıcı',
  'Seçkin Satıcı',
  'Profesyonel Satıcı',
  'Pazar Ustası',
  'Kıdemli Pazar Ustası',
  'Pazar Şampiyonu',
  'Pazar Eliti',
  'PazarElden Ustası',
  'PazarElden Efsanesi'
];

const rankIcons = [
  '🎖️','🎖️','⭐','⭐','🛡️','🛡️','🏅','🥉','🥈','🥇',
  '💠','💎','✨','🏆','🏆','👑','👑','🔥','🌟','💫'
];

function rankInfo(count = 0, admin = false) {
  if (admin) {
    return {
      name: 'PazarElden Yöneticisi',
      icon: '👑',
      level: 'Yönetici'
    };
  }

  if (count < 5) {
    return {
      name: 'Yeni Üye',
      icon: '🌱',
      level: 0
    };
  }

  const level = Math.min(20, Math.floor(count / 5));

  return {
    name: rankNames[level - 1],
    icon: rankIcons[level - 1],
    level
  };
}

function rankBadge(count = 0, admin = false) {
  const rank = rankInfo(count, admin);

  return `
    <span class="rankBadge">
      ${rank.icon} ${safe(rank.name)}
    </span>
  `;
}

/* =========================================================
   SAYFA İSKELETİ
========================================================= */

function shell(content) {
  const rank = rankInfo(
    currentActiveListingCount,
    isAdmin()
  );

  const account = currentUser
    ? `
      <div class="accountWrap">
        <button class="accountButton" onclick="toggleAccountMenu(event)">
          <span>👤</span>

          <span class="accountText">
            <b>${safe(userName())}</b>
            <small>${rank.icon} ${safe(rank.name)}</small>
          </span>

          <span>▾</span>
        </button>

        <div id="accountMenu" class="accountMenu">

          <div class="accountMenuHead">
            <b>${safe(userName())}</b>

            ${rankBadge(
              currentActiveListingCount,
              isAdmin()
            )}

            <small>
              ${currentActiveListingCount} aktif ilan
            </small>
          </div>

          ${
            isAdmin()
              ? `
                <a href="#/admin">
                  👑 Yönetici Paneli
                </a>
              `
              : ''
          }

          <a href="#/profile">
            👤 Profilim ve İlanlarım
          </a>

          <a href="#/favorites">
            ♡ Favorilerim
          </a>

          <a href="#/messages">
            💬 Mesajlarım
          </a>

          <button onclick="logout()">
            ↪ Çıkış Yap
          </button>
        </div>
      </div>
    `
    : `
      <a href="#/login">Giriş Yap</a>
      <a href="#/signup">Üye Ol</a>
    `;

  return `
    <style>
      .accountWrap{
        position:relative;
      }

      .accountButton{
        display:flex;
        align-items:center;
        gap:8px;
        background:#fff;
        color:#10233f;
        border:1px solid #e4e9f0;
        border-radius:10px;
        padding:7px 10px;
      }

      .accountText{
        display:flex;
        flex-direction:column;
        align-items:flex-start;
      }

      .accountText b{
        font-size:12px;
      }

      .accountText small{
        font-size:9px;
        color:#687386;
      }

      .accountMenu{
        display:none;
        position:absolute;
        right:0;
        top:calc(100% + 8px);
        width:230px;
        background:#fff;
        border:1px solid #e2e8f0;
        border-radius:12px;
        box-shadow:0 14px 35px rgba(0,0,0,.14);
        padding:7px;
        z-index:9999;
      }

      .accountMenu.open{
        display:block;
      }

      .accountMenuHead{
        padding:10px;
        border-bottom:1px solid #edf0f4;
        margin-bottom:5px;
        display:flex;
        flex-direction:column;
        gap:5px;
      }

      .accountMenu a,
      .accountMenu button{
        display:block;
        width:100%;
        padding:9px 10px;
        text-align:left;
        background:transparent;
        color:#10233f;
        border:0;
        border-radius:7px;
        font-size:12px;
        font-weight:600;
      }

      .accountMenu a:hover,
      .accountMenu button:hover{
        background:#f4f7fa;
      }

      .rankBadge{
        display:inline-flex;
        width:max-content;
        padding:4px 8px;
        border-radius:999px;
        background:#e9f8f8;
        color:#087f87;
        border:1px solid #cceaea;
        font-size:10px;
        font-weight:800;
      }

      .adminTitle{
        display:flex;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
      }

      .adminStats{
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:14px;
        margin:20px 0 30px;
      }

      .adminStat{
        background:#fff;
        border:1px solid #e2e8f0;
        border-radius:14px;
        padding:20px;
      }

      .adminStat span{
        display:block;
        color:#64748b;
        font-size:12px;
      }

      .adminStat strong{
        display:block;
        font-size:28px;
        color:#0c315e;
        margin-top:5px;
      }

      .adminTable{
        width:100%;
        border-collapse:collapse;
      }

      .adminTable th,
      .adminTable td{
        padding:11px 8px;
        border-bottom:1px solid #edf0f4;
        text-align:left;
        font-size:12px;
      }

      .adminTable th{
        color:#64748b;
      }

      .statusBadge{
        display:inline-block;
        padding:4px 8px;
        border-radius:999px;
        background:#eef2f7;
        font-size:10px;
        font-weight:700;
      }

      .actionRow{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:15px;
      }

      .actionRow button,
      .actionRow a{
        padding:9px 12px;
        border-radius:8px;
        font-size:11px;
        font-weight:700;
      }

      .dangerButton{
        background:#a51d2d !important;
      }

      .warningButton{
        background:#c67b00 !important;
      }

      .successButton{
        background:#087f87 !important;
      }

      .profileSummary{
        display:flex;
        justify-content:space-between;
        gap:15px;
        align-items:center;
        flex-wrap:wrap;
        padding:16px;
        background:#f8fafc;
        border:1px solid #e2e8f0;
        border-radius:12px;
        margin:15px 0;
      }

      .nameLocked{
        padding:11px 13px;
        background:#f8fafc;
        border:1px solid #e2e8f0;
        border-radius:8px;
        font-weight:700;
      }

      @media(max-width:900px){
        .adminStats{
          grid-template-columns:repeat(2,1fr);
        }

        .accountText small{
          display:none;
        }
      }

      @media(max-width:600px){
        .adminStats{
          grid-template-columns:1fr;
        }

        .adminTable{
          display:block;
          overflow-x:auto;
        }
      }
    </style>

    <header>
      <a class="brand" href="#/">
        Pazar<span>Elden</span>
      </a>

      <div class="topsearch">
        <input id="q" placeholder="Ürün, marka veya kategori ara...">
        <button onclick="searchNow()">Ara</button>
      </div>

      <nav>
        <a href="#/favorites">♡ Favorilerim</a>
        <a href="#/messages">◯ Mesajlarım</a>

        <a class="cta" href="#/ilan-ver">
          + Ücretsiz İlan Ver
        </a>

        ${account}
      </nav>
    </header>

    <main>
      ${content}
    </main>

    <footer>
      <b>PazarElden</b>
      <span>İkinci elin güvenli ve kolay pazarı.</span>
      <small>© 2026 PazarElden</small>
    </footer>
  `;
}

window.toggleAccountMenu = event => {
  event?.stopPropagation();
  document.querySelector('#accountMenu')?.classList.toggle('open');
};

document.addEventListener('click', event => {
  const wrap = document.querySelector('.accountWrap');

  if (wrap && !wrap.contains(event.target)) {
    document.querySelector('#accountMenu')?.classList.remove('open');
  }
});

window.searchNow = () => {
  const q = document.querySelector('#q')?.value.trim() || '';
  location.hash = `#/search?q=${encodeURIComponent(q)}`;
};

/* =========================================================
   FOTOĞRAFLAR
========================================================= */

async function firstImage(listingId) {
  const { data } = await supabase
    .from('listing_images')
    .select('image_url')
    .eq('listing_id', listingId)
    .order('sort_order', { ascending:true })
    .limit(1)
    .maybeSingle();

  return data?.image_url || null;
}

async function addFirstImages(listings = []) {
  return Promise.all(
    listings.map(async listing => ({
      ...listing,
      image: await firstImage(listing.id)
    }))
  );
}

/* =========================================================
   İLAN KARTI
========================================================= */

function card(x) {
  return `
    <a class="card" href="#/listing/${x.id}">
      <div class="pic">
        ${
          x.image
            ? `<img src="${safe(x.image)}" alt="${safe(x.title)}">`
            : '📷'
        }
      </div>

      <div class="pad">
        <b>${safe(x.title)}</b>
        <strong>${money(x.price)}</strong>

        <span>
          ${safe(x.city || '')}
          ${x.district ? ` / ${safe(x.district)}` : ''}
        </span>
      </div>
    </a>
  `;
}

/* =========================================================
   İLANLAR
========================================================= */

async function getListings({q='',category=''}={}) {
  let query = supabase
    .from('listings')
    .select('*')
    .eq('status','active')
    .order('created_at',{ascending:false});

  if (q) {
    query = query.ilike('title',`%${q}%`);
  }

  if (category) {
    query = query.eq('category',category);
  }

  const {data,error} = await query;

  if (error) {
    console.error(error);
    return [];
  }

  return addFirstImages(data || []);
}

/* =========================================================
   ANA SAYFA
========================================================= */

async function home() {
  const listings = await getListings();

  return shell(`
    <section class="hero">
      <div>
        <h1>
          İkinci elin
          <em>güvenli ve kolay pazarı.</em>
        </h1>

        <p>
          Kullanmadıklarını sat,
          aradığını uygun fiyata bul.
        </p>
      </div>
    </section>

    <section>
      <div class="sectionHead">
        <h2>Kategoriler</h2>
      </div>

      <div class="cats">
        ${cats.map((cat,i)=>`
          <a href="#/category/${encodeURIComponent(cat)}">
            <i>${icons[i]}</i>
            <b>${safe(cat)}</b>
          </a>
        `).join('')}
      </div>
    </section>

    <section>
      <div class="sectionHead">
        <h2>Son İlanlar</h2>
        <span>${listings.length} ilan</span>
      </div>

      <div class="grid">
        ${
          listings.length
            ? listings.slice(0,20).map(card).join('')
            : `<div class="empty">Henüz ilan bulunmuyor.</div>`
        }
      </div>
    </section>
  `);
}

/* =========================================================
   ARAMA
========================================================= */

async function searchPage() {
  const params = new URLSearchParams(
    location.hash.split('?')[1] || ''
  );

  const q = params.get('q') || '';
  const listings = await getListings({q});

  return shell(`
    <section>
      <div class="sectionHead">
        <h1>Arama Sonuçları</h1>
        <span>${listings.length} ilan</span>
      </div>

      ${q ? `<p>"<b>${safe(q)}</b>" için sonuçlar</p>` : ''}

      <div class="grid">
        ${
          listings.length
            ? listings.map(card).join('')
            : `<div class="empty">Sonuç bulunamadı.</div>`
        }
      </div>
    </section>
  `);
}

/* =========================================================
   KATEGORİ
========================================================= */

async function categoryPage(category) {
  const listings = await getListings({category});

  return shell(`
    <section>
      <div class="sectionHead">
        <h1>${safe(category)}</h1>
        <span>${listings.length} ilan</span>
      </div>

      <div class="grid">
        ${
          listings.length
            ? listings.map(card).join('')
            : `<div class="empty">Bu kategoride henüz ilan yok.</div>`
        }
      </div>
    </section>
  `);
}

/* =========================================================
   FAVORİ
========================================================= */

async function isFavorite(listingId) {
  if (!currentUser) return false;

  const {data} = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id',currentUser.id)
    .eq('listing_id',listingId)
    .maybeSingle();

  return !!data;
}

window.toggleFavorite = async listingId => {
  if (!currentUser) {
    location.hash='#/login';
    return;
  }

  const favorite = await isFavorite(listingId);

  if (favorite) {
    await supabase
      .from('favorites')
      .delete()
      .eq('user_id',currentUser.id)
      .eq('listing_id',listingId);
  } else {
    await supabase
      .from('favorites')
      .insert({
        user_id:currentUser.id,
        listing_id:listingId
      });
  }

  await render();
};

/* =========================================================
   İLAN DETAY
========================================================= */

async function listingDetail(id) {
  const {data:x,error} = await supabase
    .from('listings')
    .select('*')
    .eq('id',id)
    .maybeSingle();

  if (error || !x || x.status==='deleted') {
    return shell(`
      <section>
        <div class="empty">İlan bulunamadı.</div>
      </section>
    `);
  }

  const own = currentUser?.id === x.user_id;
  const admin = isAdmin();

  if (x.status !== 'active' && !own && !admin) {
    return shell(`
      <section>
        <div class="empty">
          Bu ilan şu anda yayında değil.
        </div>
      </section>
    `);
  }

  const {data:images} = await supabase
    .from('listing_images')
    .select('*')
    .eq('listing_id',id)
    .order('sort_order',{ascending:true});

  const {data:seller} = await supabase
    .from('profiles')
    .select('full_name,is_admin')
    .eq('id',x.user_id)
    .maybeSingle();

  const {count:sellerActiveCount} = await supabase
    .from('listings')
    .select('id',{count:'exact',head:true})
    .eq('user_id',x.user_id)
    .eq('status','active');

  const sellerName =
    seller?.full_name || 'PazarElden kullanıcısı';

  const favorite =
    own ? false : await isFavorite(id);

  let statusText = '';

  if (x.status === 'sold') statusText = '✅ SATILDI';
  if (x.status === 'inactive') statusText = '⏸️ YAYINDA DEĞİL';

  return shell(`
    <section>
      <div class="detail">

        <div>
          <div class="gallery">
            ${
              images?.length
                ? images.map(img=>`
                    <img
                      src="${safe(img.image_url)}"
                      alt="${safe(x.title)}"
                    >
                  `).join('')
                : `<div class="noimg">📷</div>`
            }
          </div>

          <div class="panel" style="width:100%;margin-top:20px">
            <h2>İlan Açıklaması</h2>
            <p>${safe(x.description || 'Açıklama eklenmemiş.')}</p>
          </div>
        </div>

        <aside>
          ${statusText ? `<h3>${statusText}</h3>` : ''}

          <h1>${safe(x.title)}</h1>

          <div class="price">
            ${money(x.price)}
          </div>

          <p>
            <b>Konum:</b>
            ${safe(x.city || '')}
            ${x.district ? ` / ${safe(x.district)}` : ''}
          </p>

          <p>
            <b>Durum:</b>
            ${safe(x.condition || '')}
          </p>

          <p><b>Satıcı</b></p>

          <p>${safe(sellerName)}</p>

          <p>
            ${rankBadge(
              sellerActiveCount || 0,
              seller?.is_admin === true
            )}

            <small>
              ${sellerActiveCount || 0} aktif ilan
            </small>
          </p>

          ${
            own || admin
              ? `
                <div class="actionRow">
                  <a href="#/edit/${x.id}">
                    ✏️ Düzenle
                  </a>

                  ${
                    x.status !== 'sold'
                      ? `
                        <button
                          class="successButton"
                          onclick="changeListingStatus('${x.id}','sold')"
                        >
                          ✅ Satıldı
                        </button>
                      `
                      : ''
                  }

                  ${
                    x.status === 'active'
                      ? `
                        <button
                          class="warningButton"
                          onclick="changeListingStatus('${x.id}','inactive')"
                        >
                          ⏸️ Yayından Kaldır
                        </button>
                      `
                      : `
                        <button
                          class="successButton"
                          onclick="changeListingStatus('${x.id}','active')"
                        >
                          ▶️ Tekrar Yayınla
                        </button>
                      `
                  }

                  <button
                    class="dangerButton"
                    onclick="deleteListing('${x.id}')"
                  >
                    🗑️ İlanı Sil
                  </button>
                </div>
              `
              : `
                <button
                  class="wide"
                  onclick="toggleFavorite('${x.id}')"
                >
                  ${favorite ? '♥ Favorilerden Çıkar' : '♡ Favorilere Ekle'}
                </button>

                <button
                  class="wide"
                  onclick="startConversation('${x.id}','${x.user_id}')"
                >
                  Satıcıya Mesaj Gönder
                </button>
              `
          }
        </aside>
      </div>
    </section>
  `);
}

/* =========================================================
   İLAN DURUMU
========================================================= */

window.changeListingStatus = async (id,status) => {
  if (!currentUser) return;

  const messages = {
    active:'İlan tekrar yayınlansın mı?',
    inactive:'İlan yayından kaldırılsın mı?',
    sold:'İlan satıldı olarak işaretlensin mi?'
  };

  if (!confirm(messages[status] || 'İşlem yapılsın mı?')) {
    return;
  }

  let query = supabase
    .from('listings')
    .update({status})
    .eq('id',id);

  if (!isAdmin()) {
    query = query.eq('user_id',currentUser.id);
  }

  const {error} = await query;

  if (error) {
    alert('İşlem yapılamadı: '+error.message);
    return;
  }

  await loadSession();
  await render();
};

/* =========================================================
   İLAN SİL
========================================================= */

window.deleteListing = async id => {
  if (!currentUser) return;

  if (!confirm('Bu ilanı silmek istediğinize emin misiniz?')) {
    return;
  }

  let query = supabase
    .from('listings')
    .update({status:'deleted'})
    .eq('id',id);

  if (!isAdmin()) {
    query = query.eq('user_id',currentUser.id);
  }

  const {error} = await query;

  if (error) {
    alert('İlan silinemedi: '+error.message);
    return;
  }

  await loadSession();

  location.hash =
    isAdmin() ? '#/admin' : '#/profile';
};

/* =========================================================
   İLAN DÜZENLE
========================================================= */

async function editListingPage(id) {
  if (!currentUser) {
    location.hash='#/login';
    return '';
  }

  const {data:x} = await supabase
    .from('listings')
    .select('*')
    .eq('id',id)
    .maybeSingle();

  if (!x) {
    return shell(`<div class="empty">İlan bulunamadı.</div>`);
  }

  if (x.user_id !== currentUser.id && !isAdmin()) {
    return shell(`<div class="empty">Bu ilanı düzenleme yetkiniz yok.</div>`);
  }

  return shell(`
    <section>
      <div class="panel">
        <h1>✏️ İlanı Düzenle</h1>

        <label>Başlık</label>
        <input id="editTitle" value="${safe(x.title)}">

        <label>Kategori</label>
        <select id="editCategory">
          ${cats.map(cat=>`
            <option
              value="${safe(cat)}"
              ${x.category===cat ? 'selected' : ''}
            >
              ${safe(cat)}
            </option>
          `).join('')}
        </select>

        <label>Fiyat</label>
        <input
          id="editPrice"
          type="number"
          value="${safe(x.price)}"
        >

        <label>Ürün Durumu</label>
        <select id="editCondition">
          ${['Sıfır','Yeni gibi','İyi','Kullanılmış'].map(c=>`
            <option
              value="${c}"
              ${x.condition===c ? 'selected' : ''}
            >
              ${c}
            </option>
          `).join('')}
        </select>

        <label>İl</label>
        <input id="editCity" value="${safe(x.city || '')}">

        <label>İlçe</label>
        <input id="editDistrict" value="${safe(x.district || '')}">

        <label>Açıklama</label>
        <textarea id="editDescription">${safe(x.description || '')}</textarea>

        <button onclick="saveListingEdit('${x.id}')">
          Değişiklikleri Kaydet
        </button>

        <p id="editMsg"></p>
      </div>
    </section>
  `);
}

window.saveListingEdit = async id => {
  const msg = document.querySelector('#editMsg');

  const title = document.querySelector('#editTitle')?.value.trim();
  const category = document.querySelector('#editCategory')?.value;
  const price = Number(document.querySelector('#editPrice')?.value || 0);
  const condition = document.querySelector('#editCondition')?.value;
  const city = document.querySelector('#editCity')?.value.trim();
  const district = document.querySelector('#editDistrict')?.value.trim();
  const description = document.querySelector('#editDescription')?.value.trim();

  if (!title || !category || price<=0) {
    msg.textContent='Başlık, kategori ve fiyat zorunludur.';
    return;
  }

  let query = supabase
    .from('listings')
    .update({
      title,
      category,
      price,
      condition,
      city,
      district,
      description
    })
    .eq('id',id);

  if (!isAdmin()) {
    query=query.eq('user_id',currentUser.id);
  }

  const {error}=await query;

  if (error) {
    msg.textContent='Kaydedilemedi: '+error.message;
    return;
  }

  location.hash=`#/listing/${id}`;
};

/* =========================================================
   ÜYELİK
========================================================= */

function auth(kind) {
  return shell(`
    <div class="auth panel">
      <h1>${kind==='login' ? 'Giriş Yap' : 'Üye Ol'}</h1>

      <input id="email" type="email" placeholder="E-posta">
      <input id="pass" type="password" placeholder="Şifre">

      <button onclick="doAuth('${kind}')">
        ${kind==='login' ? 'Giriş Yap' : 'Hesap Oluştur'}
      </button>

      ${
        kind==='signup'
          ? `<p>Profil adınızı giriş yaptıktan sonra bir kez belirleyebilirsiniz.</p>`
          : ''
      }

      <p id="authMsg"></p>
    </div>
  `);
}

window.doAuth = async kind => {
  const email=document.querySelector('#email')?.value.trim();
  const password=document.querySelector('#pass')?.value;
  const msg=document.querySelector('#authMsg');

  if (!email || !password) {
    msg.textContent='E-posta ve şifreyi girin.';
    return;
  }

  if (kind==='login') {
    const {error}=await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      msg.textContent=error.message;
      return;
    }

    await loadSession();
    location.hash='#/';
    await render();
    return;
  }

  const {data,error}=await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    msg.textContent=error.message;
    return;
  }

  if (data.user && data.session) {
    const {data:existing}=await supabase
      .from('profiles')
      .select('id')
      .eq('id',data.user.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('profiles').insert({
        id:data.user.id,
        full_name:''
      });
    }
  }

  msg.textContent=
    'Kayıt oluşturuldu. Giriş yaptıktan sonra profil adınızı belirleyebilirsiniz.';
};

window.logout = async () => {
  await supabase.auth.signOut();

  currentUser=null;
  currentProfile=null;
  currentActiveListingCount=0;

  location.hash='#/';
  await render();
};

/* =========================================================
   PROFİL
========================================================= */

async function profilePage() {
  if (!currentUser) {
    location.hash='#/login';
    return '';
  }

  const {data}=await supabase
    .from('listings')
    .select('*')
    .eq('user_id',currentUser.id)
    .neq('status','deleted')
    .order('created_at',{ascending:false});

  const listings=await addFirstImages(data || []);

  const chosenName=currentProfile?.full_name?.trim() || '';

  const nameArea=isAdmin()
    ? `
      <label>Profil adı</label>
      <input id="profileName" value="${safe(chosenName)}">
      <button onclick="saveProfileName()">Profil Adını Kaydet</button>
      <p id="profileMsg"></p>
      <p>👑 Yönetici olarak profil adınızı değiştirebilirsiniz.</p>
    `
    : chosenName
      ? `
        <label>Profil adı</label>
        <div class="nameLocked">${safe(chosenName)} 🔒</div>
        <p>Profil adı bir kez belirlenir ve değiştirilemez.</p>
      `
      : `
        <label>Profil adı</label>
        <input id="profileName" placeholder="Profil adınız">
        <p>Bu adı yalnızca bir kez belirleyebilirsiniz.</p>
        <button onclick="saveProfileName()">Profil Adını Kaydet</button>
        <p id="profileMsg"></p>
      `;

  return shell(`
    <section>
      <div class="panel">
        <h1>Profilim</h1>

        <div class="profileSummary">
          <div>
            <strong>${safe(chosenName || 'Profil adınızı belirleyin')}</strong>
            ${rankBadge(currentActiveListingCount,isAdmin())}
          </div>

          <div>
            ${currentActiveListingCount} aktif ilan
          </div>
        </div>

        <p>
          <b>E-posta:</b>
          ${safe(currentUser.email || '')}
        </p>

        ${nameArea}
      </div>

      <div class="sectionHead">
        <h2>İlanlarım</h2>
        <span>${listings.length} ilan</span>
      </div>

      <div class="grid">
        ${
          listings.length
            ? listings.map(card).join('')
            : `<div class="empty">Henüz ilanınız bulunmuyor.</div>`
        }
      </div>
    </section>
  `);
}

window.saveProfileName=async()=>{
  const name=document.querySelector('#profileName')?.value.trim();
  const msg=document.querySelector('#profileMsg');

  if (!name) {
    msg.textContent='Profil adı boş bırakılamaz.';
    return;
  }

  if (!isAdmin() && currentProfile?.full_name?.trim()) {
    msg.textContent='Profil adınız daha önce belirlenmiş.';
    return;
  }

  if (!isAdmin()) {
    if (!confirm(`Profil adınız "${name}" olacak ve daha sonra değiştirilemeyecek. Onaylıyor musunuz?`)) {
      return;
    }
  }

  let result;

  if (currentProfile) {
    result=await supabase
      .from('profiles')
      .update({full_name:name})
      .eq('id',currentUser.id);
  } else {
    result=await supabase
      .from('profiles')
      .insert({
        id:currentUser.id,
        full_name:name
      });
  }

  if (result.error) {
    msg.textContent='Kaydedilemedi: '+result.error.message;
    return;
  }

  await loadSession();
  await render();
};

/* =========================================================
   İLAN VER
========================================================= */

function newListingPage() {
  if (!currentUser) {
    location.hash='#/login';
    return '';
  }

  return shell(`
    <section>
      <div class="panel">
        <h1>Ücretsiz İlan Ver</h1>

        <label>İlan başlığı</label>
        <input id="listingTitle">

        <label>Kategori</label>
        <select id="listingCategory">
          <option value="">Kategori seçin</option>
          ${cats.map(c=>`<option value="${safe(c)}">${safe(c)}</option>`).join('')}
        </select>

        <label>Fiyat</label>
        <input id="listingPrice" type="number">

        <label>Ürün durumu</label>
        <select id="listingCondition">
          <option>Sıfır</option>
          <option>Yeni gibi</option>
          <option>İyi</option>
          <option>Kullanılmış</option>
        </select>

        <label>İl</label>
        <input id="listingCity">

        <label>İlçe</label>
        <input id="listingDistrict">

        <label>Açıklama</label>
        <textarea id="listingDescription"></textarea>

        <label>Fotoğraflar</label>
        <input id="listingPhotos" type="file" accept="image/*" multiple>

        <button onclick="publishListing()">İlanı Yayınla</button>

        <p id="listingMsg"></p>
      </div>
    </section>
  `);
}

window.publishListing=async()=>{
  const msg=document.querySelector('#listingMsg');

  const title=document.querySelector('#listingTitle')?.value.trim();
  const category=document.querySelector('#listingCategory')?.value;
  const price=Number(document.querySelector('#listingPrice')?.value || 0);
  const condition=document.querySelector('#listingCondition')?.value;
  const city=document.querySelector('#listingCity')?.value.trim();
  const district=document.querySelector('#listingDistrict')?.value.trim();
  const description=document.querySelector('#listingDescription')?.value.trim();

  const files=Array.from(
    document.querySelector('#listingPhotos')?.files || []
  );

  if (!title || !category || !price) {
    msg.textContent='Başlık, kategori ve fiyat zorunludur.';
    return;
  }

  msg.textContent='İlan yayınlanıyor...';

  const {data:listing,error}=await supabase
    .from('listings')
    .insert({
      user_id:currentUser.id,
      title,
      category,
      price,
      condition,
      city,
      district,
      description,
      status:'active'
    })
    .select()
    .single();

  if (error) {
    msg.textContent='İlan oluşturulamadı: '+error.message;
    return;
  }

  for (let i=0;i<files.length;i++) {
    const file=files[i];
    const ext=file.name.split('.').pop() || 'jpg';

    const path=
      `${currentUser.id}/${listing.id}/${Date.now()}-${i}.${ext}`;

    const {error:uploadError}=await supabase
      .storage
      .from('listing-images')
      .upload(path,file);

    if (uploadError) continue;

    const {data:urlData}=supabase
      .storage
      .from('listing-images')
      .getPublicUrl(path);

    await supabase
      .from('listing_images')
      .insert({
        listing_id:listing.id,
        image_url:urlData.publicUrl,
        sort_order:i
      });
  }

  await loadSession();
  location.hash=`#/listing/${listing.id}`;
};

/* =========================================================
   FAVORİLER
========================================================= */

async function favoritesPage() {
  if (!currentUser) {
    location.hash='#/login';
    return '';
  }

  const {data:favs}=await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id',currentUser.id);

  const ids=(favs || []).map(x=>x.listing_id);

  if (!ids.length) {
    return shell(`
      <section>
        <h1>Favorilerim</h1>
        <div class="empty">Henüz favori ilanınız yok.</div>
      </section>
    `);
  }

  const {data}=await supabase
    .from('listings')
    .select('*')
    .in('id',ids)
    .eq('status','active');

  const listings=await addFirstImages(data || []);

  return shell(`
    <section>
      <div class="sectionHead">
        <h1>Favorilerim</h1>
        <span>${listings.length} ilan</span>
      </div>

      <div class="grid">
        ${listings.map(card).join('')}
      </div>
    </section>
  `);
}

/* =========================================================
   MESAJLAR
========================================================= */

async function messagesPage() {
  if (!currentUser) {
    location.hash='#/login';
    return '';
  }

  const {data,error}=await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
    .order('created_at',{ascending:false});

  if (error) {
    return shell(`<div class="empty">Mesajlar yüklenemedi.</div>`);
  }

  const groups=new Map();

  for (const message of data || []) {
    const other=
      message.sender_id===currentUser.id
        ? message.receiver_id
        : message.sender_id;

    const key=`${message.listing_id}:${other}`;

    if (!groups.has(key)) {
      groups.set(key,{...message,otherUserId:other});
    }
  }

  const conversations=[];

  for (const item of groups.values()) {
    const {data:profile}=await supabase
      .from('profiles')
      .select('full_name')
      .eq('id',item.otherUserId)
      .maybeSingle();

    const {data:listing}=await supabase
      .from('listings')
      .select('title')
      .eq('id',item.listing_id)
      .maybeSingle();

    conversations.push({
      ...item,
      name:profile?.full_name || 'PazarElden kullanıcısı',
      title:listing?.title || 'İlan'
    });
  }

  return shell(`
    <section>
      <h1>Mesajlarım</h1>

      ${
        conversations.length
          ? conversations.map(x=>`
              <a
                class="panel"
                style="display:block;margin:12px auto"
                href="#/conversation/${x.listing_id}/${x.otherUserId}"
              >
                <b>${safe(x.name)}</b>
                <p>${safe(x.title)}</p>
                <p>${safe(x.content || '')}</p>
                <small>${dateText(x.created_at)}</small>
              </a>
            `).join('')
          : `<div class="empty">Henüz mesajınız yok.</div>`
      }
    </section>
  `);
}

window.startConversation=(listingId,sellerId)=>{
  if (!currentUser) {
    location.hash='#/login';
    return;
  }

  location.hash=`#/conversation/${listingId}/${sellerId}`;
};

async function conversationPage(listingId,otherUserId) {
  if (!currentUser) {
    location.hash='#/login';
    return '';
  }

  const {data:listing}=await supabase
    .from('listings')
    .select('title')
    .eq('id',listingId)
    .maybeSingle();

  const {data:profile}=await supabase
    .from('profiles')
    .select('full_name')
    .eq('id',otherUserId)
    .maybeSingle();

  const {data:messages}=await supabase
    .from('messages')
    .select('*')
    .eq('listing_id',listingId)
    .or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
    )
    .order('created_at',{ascending:true});

  await supabase
    .from('messages')
    .update({is_read:true})
    .eq('listing_id',listingId)
    .eq('receiver_id',currentUser.id)
    .eq('sender_id',otherUserId);

  return shell(`
    <section>
      <div class="panel">
        <h1>${safe(profile?.full_name || 'PazarElden kullanıcısı')}</h1>
        <p><b>İlan:</b> ${safe(listing?.title || 'İlan')}</p>

        <div style="display:flex;flex-direction:column;gap:10px;margin:20px 0">
          ${
            messages?.length
              ? messages.map(m=>`
                  <div style="
                    max-width:80%;
                    padding:10px;
                    border-radius:10px;
                    ${
                      m.sender_id===currentUser.id
                        ? 'margin-left:auto;background:#e7f7f7'
                        : 'margin-right:auto;background:#f0f2f5'
                    }
                  ">
                    ${safe(m.content || '')}
                    <br>
                    <small>${dateText(m.created_at)}</small>
                  </div>
                `).join('')
              : `<div class="empty">Henüz mesaj yok.</div>`
          }
        </div>

        <textarea id="messageText" placeholder="Mesajınızı yazın..."></textarea>

        <button onclick="sendMessage('${listingId}','${otherUserId}')">
          Mesaj Gönder
        </button>

        <p id="messageMsg"></p>
      </div>
    </section>
  `);
}

window.sendMessage=async(listingId,receiverId)=>{
  const input=document.querySelector('#messageText');
  const content=input?.value.trim();

  if (!content) return;

  const {error}=await supabase
    .from('messages')
    .insert({
      sender_id:currentUser.id,
      receiver_id:receiverId,
      listing_id:listingId,
      content,
      is_read:false
    });

  if (error) {
    alert('Mesaj gönderilemedi: '+error.message);
    return;
  }

  input.value='';
  await render();
};

/* =========================================================
   YÖNETİCİ PANELİ
========================================================= */

async function adminPage() {
  if (!currentUser || !isAdmin()) {
    return shell(`
      <section>
        <div class="empty">
          Bu sayfaya erişim yetkiniz yok.
        </div>
      </section>
    `);
  }

  const {count:userCount}=await supabase
    .from('profiles')
    .select('id',{count:'exact',head:true});

  const {count:activeCount}=await supabase
    .from('listings')
    .select('id',{count:'exact',head:true})
    .eq('status','active');

  const {count:soldCount}=await supabase
    .from('listings')
    .select('id',{count:'exact',head:true})
    .eq('status','sold');

  const {count:inactiveCount}=await supabase
    .from('listings')
    .select('id',{count:'exact',head:true})
    .eq('status','inactive');

  const {data:listings}=await supabase
    .from('listings')
    .select('*')
    .neq('status','deleted')
    .order('created_at',{ascending:false})
    .limit(100);

  const {data:profiles}=await supabase
    .from('profiles')
    .select('id,full_name,is_admin')
    .limit(100);

  const profileMap={};

  for (const p of profiles || []) {
    profileMap[p.id]=p;
  }

  return shell(`
    <section>

      <div class="adminTitle">
        <h1>👑 PazarElden Yönetici Paneli</h1>
        ${rankBadge(currentActiveListingCount,true)}
      </div>

      <p>
        PazarElden yönetim ve kontrol merkezi.
      </p>

      <div class="adminStats">

        <div class="adminStat">
          <span>Toplam Üye</span>
          <strong>${userCount || 0}</strong>
        </div>

        <div class="adminStat">
          <span>Aktif İlan</span>
          <strong>${activeCount || 0}</strong>
        </div>

        <div class="adminStat">
          <span>Satılan İlan</span>
          <strong>${soldCount || 0}</strong>
        </div>

        <div class="adminStat">
          <span>Yayından Kaldırılan</span>
          <strong>${inactiveCount || 0}</strong>
        </div>

      </div>

      <div class="panel" style="width:100%;max-width:none">
        <h2>📋 İlan Yönetimi</h2>

        ${
          listings?.length
            ? `
              <table class="adminTable">
                <thead>
                  <tr>
                    <th>İlan</th>
                    <th>Satıcı</th>
                    <th>Fiyat</th>
                    <th>Durum</th>
                    <th>İşlem</th>
                  </tr>
                </thead>

                <tbody>
                  ${listings.map(x=>{
                    const p=profileMap[x.user_id];

                    return `
                      <tr>
                        <td>
                          <a href="#/listing/${x.id}">
                            ${safe(x.title)}
                          </a>
                        </td>

                        <td>
                          ${safe(p?.full_name || 'Kullanıcı')}
                          ${p?.is_admin ? ' 👑' : ''}
                        </td>

                        <td>${money(x.price)}</td>

                        <td>
                          <span class="statusBadge">
                            ${safe(x.status)}
                          </span>
                        </td>

                        <td>
                          <a href="#/edit/${x.id}">
                            ✏️ Düzenle
                          </a>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            `
            : `<div class="empty">İlan bulunmuyor.</div>`
        }
      </div>

      <div class="panel" style="width:100%;max-width:none;margin-top:20px">
        <h2>👥 Üyeler</h2>

        ${
          profiles?.length
            ? `
              <table class="adminTable">
                <thead>
                  <tr>
                    <th>Profil Adı</th>
                    <th>Yetki</th>
                  </tr>
                </thead>

                <tbody>
                  ${profiles.map(p=>`
                    <tr>
                      <td>
                        ${safe(p.full_name || 'Profil adı belirlenmemiş')}
                      </td>

                      <td>
                        ${
                          p.is_admin
                            ? '👑 Yönetici'
                            : '👤 Üye'
                        }
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `
            : `<div class="empty">Üye bulunmuyor.</div>`
        }
      </div>

    </section>
  `);
}

/* =========================================================
   ROUTER
========================================================= */

async function render() {
  const app=document.querySelector('#app');

  if (!app) return;

  await loadSession();

  const hash=location.hash || '#/';
  const route=hash.replace(/^#/,'').split('?')[0];

  if (route==='/' || route==='') {
    app.innerHTML=await home();
    return;
  }

  if (route==='/login') {
    app.innerHTML=auth('login');
    return;
  }

  if (route==='/signup') {
    app.innerHTML=auth('signup');
    return;
  }

  if (route==='/ilan-ver' || route==='/new') {
    app.innerHTML=newListingPage();
    return;
  }

  if (route==='/profile') {
    app.innerHTML=await profilePage();
    return;
  }

  if (route==='/favorites') {
    app.innerHTML=await favoritesPage();
    return;
  }

  if (route==='/messages') {
    app.innerHTML=await messagesPage();
    return;
  }

  if (route==='/search') {
    app.innerHTML=await searchPage();
    return;
  }

  if (route==='/admin') {
    app.innerHTML=await adminPage();
    return;
  }

  if (route.startsWith('/edit/')) {
    const id=route.replace('/edit/','');
    app.innerHTML=await editListingPage(id);
    return;
  }

  if (route.startsWith('/category/')) {
    const category=decodeURIComponent(
      route.replace('/category/','')
    );

    app.innerHTML=await categoryPage(category);
    return;
  }

  if (route.startsWith('/listing/')) {
    const id=route.replace('/listing/','');

    app.innerHTML=await listingDetail(id);
    return;
  }

  if (route.startsWith('/conversation/')) {
    const parts=route
      .replace('/conversation/','')
      .split('/');

    app.innerHTML=await conversationPage(
      parts[0],
      parts[1]
    );

    return;
  }

  app.innerHTML=shell(`
    <section>
      <div class="empty">
        Sayfa bulunamadı.
      </div>
    </section>
  `);
}

/* =========================================================
   BAŞLAT
========================================================= */

window.addEventListener('hashchange',render);

render();
