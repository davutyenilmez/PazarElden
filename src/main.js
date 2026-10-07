import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.PAZARELDEN_CONFIG || {};
const supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

let currentUser = null;
let currentProfile = null;
let currentActiveListingCount = 0;

const RULES_VERSION = '1.0';
const PREMIUM_PRICE = 99;

const categories = [
  ['Emlak','🏠'],
  ['Vasıta','🚗'],
  ['Elektronik','💻'],
  ['Ev & Yaşam','🛋️'],
  ['Giyim','👕'],
  ['Anne & Bebek','🍼'],
  ['Spor','⚽'],
  ['Hobi','🎸'],
  ['Kitap','📚'],
  ['Koleksiyon','🪙'],
  ['İş Makineleri','🚜'],
  ['Diğer','📦']
];

const $ = s => document.querySelector(s);

function safe(v='') {
  return String(v)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function money(v) {
  return new Intl.NumberFormat('tr-TR', {
    style:'currency',
    currency:'TRY',
    maximumFractionDigits:0
  }).format(Number(v || 0));
}

function dateText(v) {
  if (!v) return '-';
  return new Date(v).toLocaleString('tr-TR');
}

function isAdmin() {
  return currentProfile?.is_admin === true;
}

function isModerator() {
  return isAdmin() || currentProfile?.is_moderator === true;
}

function isPremium(profile=currentProfile) {
  return !!(
    profile?.premium_until &&
    new Date(profile.premium_until) > new Date()
  );
}

function premiumDays(profile=currentProfile) {
  if (!isPremium(profile)) return 0;
  return Math.max(
    1,
    Math.ceil(
      (new Date(profile.premium_until) - new Date()) /
      86400000
    )
  );
}

function rankInfo(count, profile=currentProfile) {
  if (profile?.is_admin)
    return ['👑','PazarElden Yöneticisi'];

  if (profile?.is_moderator)
    return ['🛡️','PazarElden Moderatörü'];

  if (isPremium(profile))
    return ['💎','Premium Satıcı'];

  const ranks = [
    'Yeni Üye',
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

  const level = Math.min(20, Math.floor(Number(count || 0) / 5));
  return ['🏅', ranks[level]];
}

function statusText(s) {
  return ({
    pending:'🕐 Onay Bekliyor',
    active:'🟢 Yayında',
    inactive:'⏸️ Pasif',
    sold:'✅ Satıldı',
    expired:'⌛ Süresi Doldu',
    rejected:'❌ Reddedildi',
    deleted:'🗑️ Silindi'
  })[s] || s;
}

function visitorId() {
  let id = localStorage.getItem('pazarelden_visitor_id');

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('pazarelden_visitor_id', id);
  }

  return id;
}

async function loadSession() {
  const { data } = await supabase.auth.getSession();

  currentUser = data.session?.user || null;
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
    .select('id',{ count:'exact', head:true })
    .eq('user_id',currentUser.id)
    .eq('status','active')
    .gt('expires_at',new Date().toISOString());

  currentActiveListingCount = count || 0;
}

async function expireOldListings() {
  try {
    await supabase.rpc('expire_old_listings');
  } catch {}
}

function shell(content) {
  const [icon,rank] = rankInfo(
    currentActiveListingCount,
    currentProfile
  );

  return `
    <header>
      <div class="topbar">
        <a class="logo" href="#/">Pazar<span>Elden</span></a>

        <form class="topsearch" onsubmit="doSearch(event)">
          <input id="topSearch" placeholder="Ne arıyorsunuz?">
          <button>Ara</button>
        </form>

        <nav>
          ${
            currentUser
              ? `
                <a href="#/favorites">♡ Favorilerim</a>
                <a href="#/messages">◯ Mesajlarım</a>
                <a href="#/notifications">🔔</a>
                <a class="cta" href="#/ilan-ver">+ Ücretsiz İlan Ver</a>

                <div class="account">
                  <button class="accountBtn" onclick="toggleAccountMenu()">
                    <b>${safe(currentProfile?.full_name || 'Hesabım')}</b>
                    <small>${icon} ${safe(rank)}</small>
                  </button>

                  <div id="accountMenu" class="accountMenu">
                    <a href="#/profile">Profilim</a>
                    <a href="#/premium">💎 Premium</a>
                    ${
                      isModerator()
                        ? `<a href="#/admin">🛡️ Yönetim Paneli</a>`
                        : ''
                    }
                    <button onclick="logout()">Çıkış Yap</button>
                  </div>
                </div>
              `
              : `
                <a href="#/login">Giriş Yap</a>
                <a href="#/signup">Üye Ol</a>
                <a class="cta" href="#/ilan-ver">+ İlan Ver</a>
              `
          }
        </nav>
      </div>
    </header>

    <main>${content}</main>

    <footer>
      <div>
        <b>PazarElden</b>
        <p>Güvenli ve kolay ikinci el alışveriş.</p>
      </div>

      <div class="footerlinks">
        <a href="#/rules">İlan Kuralları</a>
        <a href="#/terms">Kullanım Koşulları</a>
        <a href="#/privacy">Gizlilik / KVKK</a>
        <a href="#/premium">Premium</a>
      </div>
    </footer>

    <style>
      .account{position:relative}
      .accountBtn{background:white;border:1px solid #ddd;border-radius:10px;padding:7px 12px}
      .accountBtn small{display:block;font-size:10px}
      .accountMenu{display:none;position:absolute;right:0;top:52px;background:white;border:1px solid #ddd;border-radius:12px;padding:8px;width:190px;z-index:99;box-shadow:0 10px 30px #0002}
      .accountMenu.open{display:block}
      .accountMenu a,.accountMenu button{display:block;width:100%;padding:10px;text-align:left;background:none;border:0}
      .premiumBox{border:2px solid #d6a900;border-radius:16px;padding:18px;background:linear-gradient(135deg,#fffdf1,#fff)}
      .premiumCard{border:2px solid #e2bd35!important;box-shadow:0 5px 20px #d6a90022!important;position:relative}
      .premiumTag{display:inline-block;background:#171717;color:#ffd84d;border-radius:20px;padding:5px 10px;font-size:11px;font-weight:800;margin-bottom:7px}
      .statusBadge{display:inline-block;padding:5px 9px;border-radius:20px;background:#f1f3f5;font-size:12px}
      .warningBox{background:#fff8e1;border:1px solid #e7c34c;border-radius:12px;padding:16px;margin:15px 0}
      .dangerBox{background:#fff1f1;border:1px solid #e8aaaa;border-radius:12px;padding:15px}
      .successBox{background:#eefbf1;border:1px solid #9dd7a8;border-radius:12px;padding:15px}
      .photoPreview{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:10px}
      .photoPreview img{width:100%;height:90px;object-fit:cover;border-radius:8px}
      .galleryMain{width:100%;max-height:520px;object-fit:contain;border-radius:14px;background:#f4f4f4}
      .thumbs{display:flex;gap:8px;margin-top:10px;overflow:auto}
      .thumbs img{width:80px;height:65px;object-fit:cover;border-radius:8px;cursor:pointer}
      .rulesList li{margin:8px 0}
      .moderationRow{border-bottom:1px solid #eee;padding:15px 0}
      .phoneCard{border:1px solid #94c5e8;background:#eef8ff;padding:15px;border-radius:12px}
      .premiumSection{margin:25px 0}
      .premiumSection h2{font-size:24px}
    </style>
  `;
}

window.toggleAccountMenu = () => {
  $('#accountMenu')?.classList.toggle('open');
};

window.doSearch = e => {
  e.preventDefault();
  const q = $('#topSearch')?.value.trim() || '';
  location.hash = '#/search?q=' + encodeURIComponent(q);
};

window.logout = async () => {
  await supabase.auth.signOut();
  location.hash = '#/';
  await render();
};

/* =========================
   İLAN KARTI
========================= */

function card(item) {
  const cover =
    item.listing_images?.find(x => x.is_cover) ||
    item.listing_images?.[0];

  const premium = item.sellerPremium === true;

  return `
    <a
      class="card ${premium ? 'premiumCard' : ''}"
      href="#/listing/${item.id}"
    >
      ${
        premium
          ? `<div class="premiumTag">💎 PREMIUM İLAN</div>`
          : ''
      }

      <div class="cardimg">
        ${
          cover?.image_url
            ? `<img src="${safe(cover.image_url)}" alt="">`
            : `<div class="noimg">📷</div>`
        }
      </div>

      <div class="cardbody">
        <h3>${safe(item.title)}</h3>
        <strong>${money(item.price)}</strong>
        <p>${safe(item.city || '')} ${item.district ? '/ '+safe(item.district) : ''}</p>
      </div>
    </a>
  `;
}

async function getActiveListings(q='') {
  let query = supabase
    .from('listings')
    .select(`
      *,
      listing_images(
        image_url,
        is_cover,
        sort_order
      ),
      profiles!listings_user_id_fkey(
        premium_until
      )
    `)
    .eq('status','active')
    .gt('expires_at',new Date().toISOString())
    .order('created_at',{ascending:false});

  if (q) query = query.ilike('title',`%${q}%`);

  const { data,error } = await query;

  if (error) {
    console.error(error);
    return [];
  }

  return (data || []).map(x => ({
    ...x,
    sellerPremium:
      x.profiles?.premium_until &&
      new Date(x.profiles.premium_until) > new Date()
  }));
}

/* =========================
   ANA SAYFA
========================= */

async function home() {
  const listings = await getActiveListings();

  const premium = listings.filter(x => x.sellerPremium);
  const normal = listings.filter(x => !x.sellerPremium);

  return shell(`
    <section class="hero">
      <h1>PazarElden</h1>
      <p>Al, sat, değerlendir. İkinci elin güvenli pazarı.</p>
      <a class="cta" href="#/ilan-ver">Ücretsiz İlan Ver</a>
    </section>

    <section>
      <h2>Kategoriler</h2>

      <div class="cats">
        ${categories.map(c => `
          <a href="#/search?q=${encodeURIComponent(c[0])}">
            <span>${c[1]}</span>
            <b>${c[0]}</b>
          </a>
        `).join('')}
      </div>
    </section>

    ${
      premium.length
        ? `
          <section class="premiumSection premiumBox">
            <h2>💎 Premium İlanlar</h2>
            <p>Premium satıcılardan öne çıkan ilanlar.</p>

            <div class="grid">
              ${premium.map(card).join('')}
            </div>
          </section>
        `
        : ''
    }

    <section>
      <h2>Son İlanlar</h2>

      <div class="grid">
        ${
          normal.length
            ? normal.map(card).join('')
            : `<div class="empty">Henüz normal ilan bulunmuyor.</div>`
        }
      </div>
    </section>
  `);
}

/* =========================
   KAYIT / GİRİŞ
========================= */

function authPage(mode) {
  const signup = mode === 'signup';

  return shell(`
    <div class="panel form authbox">
      <h1>${signup ? 'Üye Ol' : 'Giriş Yap'}</h1>

      <input id="email" type="email" placeholder="E-posta">
      <input id="password" type="password" placeholder="Şifre">

      ${
        signup
          ? `
            <input
              id="phone"
              type="tel"
              placeholder="Telefon: 05XX XXX XX XX"
            >

            <div class="warningBox">
              <label>
                <input type="checkbox" id="termsAccept">
                Kullanım Koşullarını okudum ve kabul ediyorum.
              </label>

              <br><br>

              <label>
                <input type="checkbox" id="rulesAccept">
                PazarElden v1.0 Site ve İlan Kurallarını okudum ve kabul ediyorum.
              </label>

              <br><br>

              <label>
                <input type="checkbox" id="privacyAccept">
                Gizlilik/KVKK Aydınlatma Metnini okudum.
              </label>
            </div>
          `
          : ''
      }

      <button onclick="${signup ? 'signup()' : 'login()'}">
        ${signup ? 'Üye Ol' : 'Giriş Yap'}
      </button>

      <p id="authMsg"></p>

      <p>
        ${
          signup
            ? `Zaten hesabınız var mı? <a href="#/login">Giriş yapın</a>`
            : `Hesabınız yok mu? <a href="#/signup">Üye olun</a>`
        }
      </p>
    </div>
  `);
}

window.signup = async () => {
  const email = $('#email')?.value.trim();
  const password = $('#password')?.value;
  const phone = $('#phone')?.value.trim();
  const msg = $('#authMsg');

  if (!email || !password || !phone) {
    msg.textContent = 'E-posta, şifre ve telefon zorunludur.';
    return;
  }

  if (
    !$('#termsAccept')?.checked ||
    !$('#rulesAccept')?.checked ||
    !$('#privacyAccept')?.checked
  ) {
    msg.textContent =
      'Zorunlu koşulları ve bilgilendirmeleri onaylamalısınız.';
    return;
  }

  msg.textContent = 'Hesap oluşturuluyor...';

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options:{
      data:{
        phone,
        terms_accepted:true,
        rules_accepted:true,
        privacy_acknowledged:true,
        rules_version:RULES_VERSION
      }
    }
  });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  msg.textContent =
    'Üyelik oluşturuldu. E-posta doğrulaması gerekiyorsa e-postanızı kontrol edin.';
};

window.login = async () => {
  const email = $('#email')?.value.trim();
  const password = $('#password')?.value;
  const msg = $('#authMsg');

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  await loadSession();
  location.hash = '#/';
};

/* =========================
   İLAN VER
========================= */

function newListingPage() {
  if (!currentUser) {
    location.hash = '#/login';
    return shell(`<div class="panel">Giriş yapmalısınız.</div>`);
  }

  const blocked =
    currentProfile?.listing_blocked_until &&
    new Date(currentProfile.listing_blocked_until) > new Date();

  if (blocked) {
    return shell(`
      <div class="dangerBox">
        <h2>⛔ İlan verme kısıtlaması</h2>
        <p>
          Yeni ilan verme hakkınız
          <b>${dateText(currentProfile.listing_blocked_until)}</b>
          tarihine kadar kısıtlanmıştır.
        </p>
      </div>
    `);
  }

  return shell(`
    <section>
      <h1>Yeni İlan Ver</h1>

      <div class="warningBox">
        <h3>⚠️ İlan vermeden önce</h3>

        <p>
          Müstehcen/küfürlü içerik, telefon veya açık iletişim
          bilgisi, sahte/çalıntı/yasaklı ürün, yanıltıcı bilgi
          ve ürüne ait olmayan fotoğraflar yasaktır.
        </p>

        <p>
          İlanınız yayınlanmadan önce kontrol edilir.
          Kurallara aykırı ilanlar reddedilir.
          <b>5 ihlalde 72 saat ilan verme kısıtlaması uygulanır.</b>
        </p>

        <a href="#/rules">Tüm İlan Kurallarını Gör</a>
      </div>

      <div class="panel form">
        <input id="title" placeholder="İlan başlığı">

        <input
          id="price"
          type="number"
          min="0"
          placeholder="Fiyat"
        >

        <select id="category">
          <option value="">Kategori seçin</option>
          ${categories.map(c => `
            <option value="${safe(c[0])}">${c[1]} ${c[0]}</option>
          `).join('')}
        </select>

        <input id="city" placeholder="Şehir">
        <input id="district" placeholder="İlçe">

        <select id="condition">
          <option value="İkinci El">İkinci El</option>
          <option value="Sıfır">Sıfır</option>
        </select>

        <textarea
          id="description"
          maxlength="5000"
          placeholder="Ürününüzü açıklayın..."
        ></textarea>

        <label>
          <b>Fotoğraflar — en fazla 5 adet</b>
        </label>

        <input
          id="photos"
          type="file"
          accept="image/*"
          multiple
          onchange="previewPhotos()"
        >

        <div id="photoPreview" class="photoPreview"></div>

        <p>
          İlk fotoğraf otomatik olarak kapak fotoğrafı olacaktır.
        </p>

        <label>
          <input type="checkbox" id="listingRules">
          İlan verme kurallarını okudum ve kabul ediyorum.
        </label>

        <button onclick="publishListing()">
          İncelemeye Gönder
        </button>

        <p id="publishMsg"></p>
      </div>
    </section>
  `);
}

window.previewPhotos = () => {
  const files = [...($('#photos')?.files || [])];
  const box = $('#photoPreview');

  if (files.length > 5) {
    alert('En fazla 5 fotoğraf seçebilirsiniz.');
    $('#photos').value = '';
    box.innerHTML = '';
    return;
  }

  box.innerHTML = files.map((f,i) => `
    <div>
      <img src="${URL.createObjectURL(f)}">
      <small>${i === 0 ? '⭐ Kapak' : `Fotoğraf ${i+1}`}</small>
    </div>
  `).join('');
};

window.publishListing = async () => {
  if (!currentUser) return;

  const msg = $('#publishMsg');

  if (!$('#listingRules')?.checked) {
    msg.textContent =
      'İlan kurallarını kabul etmelisiniz.';
    return;
  }

  const title = $('#title')?.value.trim();
  const price = Number($('#price')?.value);
  const category = $('#category')?.value;
  const city = $('#city')?.value.trim();
  const district = $('#district')?.value.trim();
  const condition = $('#condition')?.value;
  const description = $('#description')?.value.trim();
  const files = [...($('#photos')?.files || [])];

  if (!title || !price || !category || !description) {
    msg.textContent =
      'Başlık, fiyat, kategori ve açıklama zorunludur.';
    return;
  }

  if (files.length > 5) {
    msg.textContent = 'En fazla 5 fotoğraf yükleyebilirsiniz.';
    return;
  }

  msg.textContent = 'İlanınız hazırlanıyor...';

  const { data:item,error } = await supabase
    .from('listings')
    .insert({
      user_id:currentUser.id,
      title,
      price,
      category,
      city,
      district,
      condition,
      description,
      status:'pending',
      moderation_status:'pending',
      submitted_at:new Date().toISOString(),
      rules_version:RULES_VERSION
    })
    .select()
    .single();

  if (error) {
    msg.textContent = 'İlan oluşturulamadı: ' + error.message;
    return;
  }

  for (let i=0; i<files.length; i++) {
    const file = files[i];

    const ext =
      file.name.split('.').pop()?.toLowerCase() || 'jpg';

    const path =
      `${currentUser.id}/${item.id}/${crypto.randomUUID()}.${ext}`;

    const { error:uploadError } =
      await supabase.storage
        .from('listing-images')
        .upload(path,file);

    if (uploadError) {
      console.error(uploadError);
      continue;
    }

    const { data:urlData } =
      supabase.storage
        .from('listing-images')
        .getPublicUrl(path);

    await supabase
      .from('listing_images')
      .insert({
        listing_id:item.id,
        image_url:urlData.publicUrl,
        is_cover:i === 0,
        sort_order:i
      });
  }

  msg.innerHTML = `
    <div class="successBox">
      <b>🕐 İlanınız incelemeye gönderildi.</b>
      <p>
        Admin veya moderatör onayından sonra yayınlanacaktır.
        ${
          isPremium()
            ? 'Premium ilanınızın 30 günlük süresi onaylandığında başlayacaktır.'
            : '72 saatlik ücretsiz yayın süreniz onaylandığında başlayacaktır.'
        }
      </p>
    </div>
  `;

  setTimeout(() => {
    location.hash = '#/profile';
  },1800);
};

/* =========================
   İLAN DETAY
========================= */

async function listingPage(id) {
  const { data:item,error } = await supabase
    .from('listings')
    .select('*')
    .eq('id',id)
    .maybeSingle();

  if (error || !item)
    return shell(`<div class="panel">İlan bulunamadı.</div>`);

  const own = currentUser?.id === item.user_id;

  if (
    item.status !== 'active' &&
    !own &&
    !isModerator()
  ) {
    return shell(`<div class="panel">Bu ilan yayında değil.</div>`);
  }

  try {
    await supabase.rpc('register_listing_view',{
      p_listing_id:id,
      p_visitor_id:visitorId()
    });
  } catch {}

  const { data:images } = await supabase
    .from('listing_images')
    .select('*')
    .eq('listing_id',id)
    .order('sort_order');

  const { data:seller } = await supabase
    .from('profiles')
    .select('*')
    .eq('id',item.user_id)
    .maybeSingle();

  const { count:activeCount } = await supabase
    .from('listings')
    .select('id',{count:'exact',head:true})
    .eq('user_id',item.user_id)
    .eq('status','active')
    .gt('expires_at',new Date().toISOString());

  const { data:counts } = await supabase.rpc(
    'get_listing_counts',
    {p_listing_id:id}
  );

  const countData = Array.isArray(counts) ? counts[0] : counts;

  const [rankIcon,rank] =
    rankInfo(activeCount || 0,seller);

  const premium = isPremium(seller);

  const cover =
    images?.find(x => x.is_cover) ||
    images?.[0];

  return shell(`
    <section class="detail">
      <div>
        ${
          premium
            ? `<div class="premiumTag">💎 PREMIUM İLAN</div>`
            : ''
        }

        ${
          cover
            ? `<img id="mainPhoto" class="galleryMain" src="${safe(cover.image_url)}">`
            : `<div class="noimg">📷 Fotoğraf yok</div>`
        }

        ${
          images?.length
            ? `
              <div class="thumbs">
                ${images.map(img => `
                  <img
                    src="${safe(img.image_url)}"
                    onclick="document.querySelector('#mainPhoto').src=this.src"
                  >
                `).join('')}
              </div>
            `
            : ''
        }
      </div>

      <aside class="panel">
        <span class="statusBadge">${statusText(item.status)}</span>

        <h1>${safe(item.title)}</h1>
        <h2>${money(item.price)}</h2>

        <p>${safe(item.city || '')} / ${safe(item.district || '')}</p>
        <p>Durum: <b>${safe(item.condition || '-')}</b></p>

        <hr>

        <h3>Satıcı</h3>

        <a href="#/seller/${item.user_id}">
          <b>${safe(seller?.full_name || 'PazarElden kullanıcısı')}</b>
        </a>

        <p>${rankIcon} ${safe(rank)}</p>
        <p>${activeCount || 0} aktif ilan</p>

        ${
          item.status === 'active'
            ? `
              <p>
                👁️ ${countData?.view_count || 0}
                &nbsp; ♡ ${countData?.favorite_count || 0}
              </p>
            `
            : ''
        }

        ${
          currentUser && !own
            ? `
              <button onclick="toggleFavorite('${item.id}')">
                ♡ Favorilere Ekle
              </button>

              <button onclick="openConversation('${item.id}','${item.user_id}')">
                Mesaj Gönder
              </button>

              <button onclick="reportListing('${item.id}','${item.user_id}')">
                ⚠️ Şikâyet Et
              </button>
            `
            : ''
        }

        ${
          own
            ? ownerActions(item)
            : ''
        }

        ${
          isModerator() && item.status === 'pending'
            ? `
              <hr>
              <h3>🛡️ Moderasyon</h3>

              <button onclick="approveListing('${item.id}')">
                ✅ İlanı Onayla
              </button>

              <button onclick="rejectListing('${item.id}')">
                ❌ İlanı Reddet
              </button>
            `
            : ''
        }
      </aside>
    </section>

    <section class="panel">
      <h2>Açıklama</h2>
      <p>${safe(item.description || 'Açıklama yok.')}</p>
    </section>

    ${
      item.rejection_reason && own
        ? `
          <div class="dangerBox">
            <b>İlan reddedildi</b>
            <p>${safe(item.rejection_reason)}</p>
          </div>
        `
        : ''
    }
  `);
}

function ownerActions(item) {
  if (item.status === 'pending') {
    return `
      <div class="warningBox">
        🕐 İlanınız moderatör onayı bekliyor.
      </div>
    `;
  }

  if (item.status === 'rejected') {
    return `
      <div class="dangerBox">
        <b>İlanınız reddedildi.</b>
        <p>${safe(item.rejection_reason || '')}</p>
        <button onclick="resubmitListing('${item.id}')">
          Düzelttim, Tekrar İncelemeye Gönder
        </button>
      </div>
    `;
  }

  if (item.status === 'expired') {
    return `
      <div class="warningBox">
        <b>İlanınızın yayın süresi doldu.</b>
        <button onclick="reactivateListing('${item.id}')">
          Yeniden Aktifleştir
        </button>
        <a class="cta" href="#/premium">💎 Premium'a Geç</a>
      </div>
    `;
  }

  return `
    <hr>
    <p><b>Bu ilan size ait.</b></p>

    <button onclick="markSold('${item.id}')">
      Satıldı Olarak İşaretle
    </button>

    <button onclick="deleteListing('${item.id}')">
      İlanı Sil
    </button>
  `;
}

/* =========================
   MODERASYON
========================= */

window.approveListing = async id => {
  if (!confirm('Bu ilanı yayınlamak istediğinize emin misiniz?'))
    return;

  const { error } =
    await supabase.rpc('approve_listing',{
      p_listing_id:id
    });

  if (error) {
    alert(error.message);
    return;
  }

  alert('İlan onaylandı ve yayına alındı.');
  await render();
};

window.rejectListing = async id => {
  const reason = prompt(
    'İlanın reddedilme nedenini açıkça yazın:'
  );

  if (!reason) return;

  const { error } =
    await supabase.rpc('reject_listing',{
      p_listing_id:id,
      p_reason:reason
    });

  if (error) {
    alert(error.message);
    return;
  }

  alert('İlan reddedildi.');
  await render();
};

window.resubmitListing = async id => {
  const { error } = await supabase
    .from('listings')
    .update({
      status:'pending',
      moderation_status:'pending',
      submitted_at:new Date().toISOString(),
      rejection_reason:null
    })
    .eq('id',id)
    .eq('user_id',currentUser.id);

  if (error) {
    alert(error.message);
    return;
  }

  alert('İlan yeniden incelemeye gönderildi.');
  await render();
};

window.reactivateListing = async id => {
  const { error } = await supabase
    .from('listings')
    .update({
      status:'pending',
      moderation_status:'pending',
      submitted_at:new Date().toISOString()
    })
    .eq('id',id)
    .eq('user_id',currentUser.id);

  if (error) {
    alert(error.message);
    return;
  }

  alert('İlan yeniden incelemeye gönderildi.');
  await render();
};

window.markSold = async id => {
  if (!confirm('İlan satıldı olarak işaretlensin mi?'))
    return;

  const { error } = await supabase
    .from('listings')
    .update({status:'sold'})
    .eq('id',id)
    .eq('user_id',currentUser.id);

  if (error) alert(error.message);
  else await render();
};

window.deleteListing = async id => {
  if (!confirm('İlanı silmek istediğinize emin misiniz?'))
    return;

  const { error } = await supabase
    .from('listings')
    .update({status:'deleted'})
    .eq('id',id)
    .eq('user_id',currentUser.id);

  if (error) alert(error.message);
  else location.hash = '#/profile';
};

/* =========================
   ADMIN / MODERATÖR
========================= */

async function adminPage() {
  if (!isModerator())
    return shell(`<div class="panel">Bu sayfaya erişim yetkiniz yok.</div>`);

  const { data:pending } = await supabase
    .from('listings')
    .select('*')
    .eq('status','pending')
    .order('submitted_at',{ascending:true});

  const { data:reports } = await supabase
    .from('reports')
    .select('*')
    .eq('status','open')
    .order('created_at',{ascending:false});

  return shell(`
    <section>
      <h1>🛡️ Yönetim Paneli</h1>

      <div class="panel">
        <h2>Onay Bekleyen İlanlar (${pending?.length || 0})</h2>

        ${
          pending?.length
            ? pending.map(x => `
                <div class="moderationRow">
                  <b>${safe(x.title)}</b>
                  <p>${money(x.price)} · ${dateText(x.submitted_at)}</p>

                  <a href="#/listing/${x.id}">
                    İlanı İncele
                  </a>

                  <button onclick="approveListing('${x.id}')">
                    ✅ Onayla
                  </button>

                  <button onclick="rejectListing('${x.id}')">
                    ❌ Reddet
                  </button>
                </div>
              `).join('')
            : `<p>Onay bekleyen ilan yok.</p>`
        }
      </div>

      <div class="panel">
        <h2>Şikâyetler (${reports?.length || 0})</h2>

        ${
          reports?.length
            ? reports.map(r => `
                <div class="moderationRow">
                  <b>${safe(r.reason)}</b>
                  <p>${safe(r.details || '')}</p>
                  <small>${dateText(r.created_at)}</small>
                </div>
              `).join('')
            : `<p>Açık şikâyet bulunmuyor.</p>`
        }
      </div>
    </section>
  `);
}

/* =========================
   PROFİL
========================= */

async function profilePage() {
  if (!currentUser)
    return shell(`<div class="panel">Giriş yapmalısınız.</div>`);

  const { data:listings } = await supabase
    .from('listings')
    .select('*,listing_images(image_url,is_cover,sort_order)')
    .eq('user_id',currentUser.id)
    .neq('status','deleted')
    .order('created_at',{ascending:false});

  const [icon,rank] =
    rankInfo(currentActiveListingCount,currentProfile);

  return shell(`
    <section>
      <h1>Profilim</h1>

      <div class="panel form">
        <h2>${safe(currentProfile?.full_name || 'Profil')}</h2>

        <p>${icon} ${safe(rank)}</p>

        ${
          isPremium()
            ? `
              <div class="premiumBox">
                <b>💎 Premium Üyelik Aktif</b>
                <p>
                  ${premiumDays()} gün kaldı.
                  Bitiş: ${dateText(currentProfile.premium_until)}
                </p>
              </div>
            `
            : `
              <a class="cta" href="#/premium">
                💎 Premium'a Geç
              </a>
            `
        }

        <label>Profil adı</label>
        <input
          id="profileName"
          value="${safe(currentProfile?.full_name || '')}"
          ${!isAdmin() && currentProfile?.full_name ? 'disabled' : ''}
        >

        <label>Şehir</label>
        <input
          id="profileCity"
          value="${safe(currentProfile?.city || '')}"
          maxlength="50"
        >

        <label>Hakkımda</label>
        <textarea
          id="aboutMe"
          maxlength="500"
          placeholder="Kendinizden kısaca bahsedin..."
        >${safe(currentProfile?.about_me || '')}</textarea>

        <button onclick="saveProfile()">
          Profili Kaydet
        </button>

        <p id="profileMsg"></p>

        ${
          currentProfile?.violation_count
            ? `
              <p>
                Kural ihlali:
                <b>${currentProfile.violation_count}</b>
              </p>
            `
            : ''
        }
      </div>

      <h2>İlanlarım</h2>

      <div class="grid">
        ${
          listings?.length
            ? listings.map(x => `
                <div>
                  ${card(x)}
                  <p class="statusBadge">${statusText(x.status)}</p>
                  ${
                    x.rejection_reason
                      ? `<small>Ret nedeni: ${safe(x.rejection_reason)}</small>`
                      : ''
                  }
                </div>
              `).join('')
            : `<div class="empty">Henüz ilanınız yok.</div>`
        }
      </div>
    </section>
  `);
}

window.saveProfile = async () => {
  const update = {
    city:$('#profileCity')?.value.trim(),
    about_me:$('#aboutMe')?.value.trim()
  };

  if (isAdmin() || !currentProfile?.full_name)
    update.full_name = $('#profileName')?.value.trim();

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id',currentUser.id);

  $('#profileMsg').textContent =
    error ? error.message : 'Profil kaydedildi.';

  if (!error) await loadSession();
};

/* =========================
   SATICI PROFİLİ
========================= */

async function sellerPage(id) {
  const { data:p } = await supabase
    .from('profiles')
    .select('id,full_name,about_me,city,created_at,premium_until,is_admin,is_moderator')
    .eq('id',id)
    .maybeSingle();

  if (!p)
    return shell(`<div class="panel">Satıcı bulunamadı.</div>`);

  const { data:listings } = await supabase
    .from('listings')
    .select('*,listing_images(image_url,is_cover,sort_order)')
    .eq('user_id',id)
    .eq('status','active')
    .gt('expires_at',new Date().toISOString());

  const [icon,rank] =
    rankInfo(listings?.length || 0,p);

  return shell(`
    <section>
      <div class="panel">
        <h1>${safe(p.full_name || 'PazarElden kullanıcısı')}</h1>
        <p>${icon} ${safe(rank)}</p>
        <p>📍 ${safe(p.city || 'Şehir belirtilmedi')}</p>
        <p>📅 Üyelik: ${dateText(p.created_at)}</p>

        <h3>Hakkımda</h3>
        <p>${safe(p.about_me || 'Henüz bir açıklama eklenmemiş.')}</p>

        <p>
          <b>${listings?.length || 0}</b> aktif ilan
        </p>

        <p>
          🔒 Telefon ve özel bilgiler herkese açık değildir.
        </p>
      </div>

      <h2>Satıcının İlanları</h2>

      <div class="grid">
        ${
          listings?.length
            ? listings.map(x => ({
                ...x,
                sellerPremium:isPremium(p)
              })).map(card).join('')
            : `<div class="empty">Aktif ilan bulunmuyor.</div>`
        }
      </div>
    </section>
  `);
}

/* =========================
   PREMIUM
========================= */

function premiumPage() {
  return shell(`
    <section>
      <div class="premiumBox">
        <div class="premiumTag">💎 PAZARELDEN PREMIUM</div>

        <h1>${PREMIUM_PRICE} TL / 30 Gün</h1>

        <h3>Premium avantajları</h3>

        <ul>
          <li>İlanlar 72 saat yerine 30 gün yayında kalır.</li>
          <li>Ana sayfada özel 💎 Premium İlanlar bölümünde görünür.</li>
          <li>Premium ilan kartları normal ilanlardan daha dikkat çekicidir.</li>
          <li>💎 Premium Satıcı rozeti kazanırsınız.</li>
          <li>Arama ve kategori sonuçlarında öncelikli gösterim altyapısı sağlanır.</li>
          <li>Premium olmak moderasyon kurallarını kaldırmaz.</li>
        </ul>

        ${
          isPremium()
            ? `
              <div class="successBox">
                <b>Premium üyeliğiniz aktif.</b>
                <p>${premiumDays()} gün kaldı.</p>
              </div>
            `
            : `
              <button onclick="premiumComingSoon()">
                💎 99 TL'ye Premium Al
              </button>
            `
        }

        <p>
          <small>
            Otomatik kart çekimi yapılmaz. 30 gün sonunda üyelik
            kendiliğinden normal üyeliğe döner.
          </small>
        </p>
      </div>
    </section>
  `);
}

window.premiumComingSoon = () => {
  alert(
    'Premium altyapısı hazır. Gerçek 99 TL ödeme işlemi ödeme kuruluşu bağlandığında aktif olacaktır.'
  );
};

/* =========================
   FAVORİ
========================= */

window.toggleFavorite = async listingId => {
  if (!currentUser) {
    location.hash = '#/login';
    return;
  }

  const { data:existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id',currentUser.id)
    .eq('listing_id',listingId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('favorites')
      .delete()
      .eq('id',existing.id);
  } else {
    await supabase
      .from('favorites')
      .insert({
        user_id:currentUser.id,
        listing_id:listingId
      });
  }

  alert(existing ? 'Favorilerden çıkarıldı.' : 'Favorilere eklendi.');
};

async function favoritesPage() {
  if (!currentUser)
    return shell(`<div class="panel">Giriş yapmalısınız.</div>`);

  const { data:favs } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id',currentUser.id);

  const ids = (favs || []).map(x => x.listing_id);

  if (!ids.length)
    return shell(`
      <section>
        <h1>Favorilerim</h1>
        <div class="empty">Favori ilanınız yok.</div>
      </section>
    `);

  const { data:listings } = await supabase
    .from('listings')
    .select('*,listing_images(image_url,is_cover,sort_order)')
    .in('id',ids)
    .eq('status','active')
    .gt('expires_at',new Date().toISOString());

  return shell(`
    <section>
      <h1>Favorilerim</h1>
      <div class="grid">
        ${(listings || []).map(card).join('')}
      </div>
    </section>
  `);
}

/* =========================
   MESAJLAR + TELEFON
========================= */

window.openConversation = (listingId,otherId) => {
  location.hash =
    `#/conversation/${listingId}/${otherId}`;
};

async function conversationPage(listingId,otherId) {
  if (!currentUser)
    return shell(`<div class="panel">Giriş yapmalısınız.</div>`);

  const { data:other } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id',otherId)
    .maybeSingle();

  const { data:messages } = await supabase
    .from('messages')
    .select('*')
    .eq('listing_id',listingId)
    .or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUser.id})`
    )
    .order('created_at',{ascending:true});

  const { data:shared } = await supabase.rpc(
    'get_shared_phone',
    {
      p_owner_id:otherId,
      p_listing_id:listingId
    }
  );

  const phone =
    Array.isArray(shared) ? shared[0] : shared;

  return shell(`
    <section>
      <h1>${safe(other?.full_name || 'Mesajlaşma')}</h1>

      ${(messages || []).map(m => `
        <div class="panel">
          <b>${m.sender_id === currentUser.id ? 'Siz' : safe(other?.full_name || 'Kullanıcı')}</b>
          <p>${safe(m.content || '')}</p>
          <small>${dateText(m.created_at)}</small>
        </div>
      `).join('')}

      ${
        phone?.phone
          ? `
            <div class="phoneCard">
              <b>📞 Kullanıcı telefonunu sizinle paylaştı</b>
              <p>${safe(phone.phone)}</p>
              <small>
                ${dateText(phone.expires_at)} tarihine kadar görüntülenebilir.
              </small>
            </div>
          `
          : ''
      }

      <div class="panel form">
        <textarea
          id="messageText"
          placeholder="Mesajınızı yazın..."
        ></textarea>

        <button onclick="sendMessage('${listingId}','${otherId}')">
          Mesaj Gönder
        </button>

        <button onclick="sharePhone('${listingId}','${otherId}')">
          📞 Telefonumu 24 Saat Paylaş
        </button>

        <button onclick="revokePhone('${listingId}','${otherId}')">
          🔒 Telefon Paylaşımını Kapat
        </button>

        <p id="messageMsg"></p>
      </div>
    </section>
  `);
}

window.sendMessage = async (listingId,receiverId) => {
  const content = $('#messageText')?.value.trim();
  const msg = $('#messageMsg');

  if (!content) return;

  const { error } = await supabase
    .from('messages')
    .insert({
      sender_id:currentUser.id,
      receiver_id:receiverId,
      listing_id:listingId,
      content,
      is_read:false
    });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  await render();
};

window.sharePhone = async (listingId,viewerId) => {
  if (!confirm(
    'Telefon numaranız yalnızca bu kullanıcıya 24 saat süreyle gösterilecektir. Onaylıyor musunuz?'
  )) return;

  const { error } = await supabase.rpc(
    'share_my_phone',
    {
      p_viewer_id:viewerId,
      p_listing_id:listingId
    }
  );

  if (error) alert(error.message);
  else alert('Telefonunuz 24 saat süreyle paylaşıldı.');
};

window.revokePhone = async (listingId,viewerId) => {
  const { error } = await supabase.rpc(
    'revoke_my_phone_share',
    {
      p_viewer_id:viewerId,
      p_listing_id:listingId
    }
  );

  if (error) alert(error.message);
  else alert('Telefon paylaşımı kapatıldı.');
};

/* =========================
   MESAJ LİSTESİ
========================= */

async function messagesPage() {
  if (!currentUser)
    return shell(`<div class="panel">Giriş yapmalısınız.</div>`);

  const { data:messages } = await supabase
    .from('messages')
    .select('*')
    .or(
      `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
    )
    .order('created_at',{ascending:false});

  const map = new Map();

  for (const m of messages || []) {
    const other =
      m.sender_id === currentUser.id
        ? m.receiver_id
        : m.sender_id;

    const key = `${m.listing_id}_${other}`;

    if (!map.has(key))
      map.set(key,{...m,other});
  }

  const rows = [];

  for (const m of map.values()) {
    const { data:p } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id',m.other)
      .maybeSingle();

    rows.push(`
      <div class="panel">
        <b>${safe(p?.full_name || 'PazarElden kullanıcısı')}</b>
        <p>${safe(m.content || '')}</p>
        <button onclick="openConversation('${m.listing_id}','${m.other}')">
          Mesajları Aç
        </button>
      </div>
    `);
  }

  return shell(`
    <section>
      <h1>Mesajlarım</h1>
      ${rows.join('') || `<div class="empty">Henüz mesajınız yok.</div>`}
    </section>
  `);
}

/* =========================
   ŞİKAYET
========================= */

window.reportListing = async (listingId,userId) => {
  if (!currentUser) {
    location.hash = '#/login';
    return;
  }

  const reason = prompt(
    'Şikâyet nedeninizi yazın:'
  );

  if (!reason) return;

  const details = prompt(
    'Varsa ayrıntı yazabilirsiniz:'
  ) || '';

  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id:currentUser.id,
      listing_id:listingId,
      reported_user_id:userId,
      reason,
      details
    });

  if (error) alert(error.message);
  else alert('Şikâyetiniz alındı.');
};

/* =========================
   BİLDİRİMLER
========================= */

async function notificationsPage() {
  if (!currentUser)
    return shell(`<div class="panel">Giriş yapmalısınız.</div>`);

  const { data:items } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id',currentUser.id)
    .order('created_at',{ascending:false});

  return shell(`
    <section>
      <h1>Bildirimler</h1>

      ${
        items?.length
          ? items.map(n => `
              <div class="panel">
                <b>${safe(n.title)}</b>
                <p>${safe(n.content || '')}</p>
                <small>${dateText(n.created_at)}</small>
              </div>
            `).join('')
          : `<div class="empty">Bildirim bulunmuyor.</div>`
      }
    </section>
  `);
}

/* =========================
   KURALLAR
========================= */

function rulesPage() {
  return shell(`
    <section class="panel">
      <h1>PazarElden v1.0 Site ve İlan Kuralları</h1>

      <ol class="rulesList">
        <li>Yasa dışı, çalıntı, sahte veya satışı mevzuata aykırı ürünler yasaktır.</li>
        <li>Ateşli silah, mühimmat, patlayıcı ve tehlikeli silah ilanları yasaktır.</li>
        <li>Uyuşturucu, tütün, alkol ve yasaklı maddeler ilan edilemez.</li>
        <li>Reçeteli ilaç ve satışı kısıtlanmış sağlık ürünleri ilan edilemez.</li>
        <li>Pornografik, açık cinsel veya müstehcen içerik yasaktır.</li>
        <li>Küfür, tehdit, taciz, nefret söylemi ve aşağılayıcı ifadeler yasaktır.</li>
        <li>İlan bilgileri ve fotoğrafları gerçek ürünü doğru şekilde göstermelidir.</li>
        <li>İlanlarda telefon, e-posta veya harici iletişim bilgisi yayınlanamaz.</li>
        <li>TC kimlik, banka/kart bilgisi ve açık adres gibi hassas bilgiler yayınlanmamalıdır.</li>
        <li>Spam ve görünürlüğü artırmak amacıyla tekrar ilan vermek yasaktır.</li>
        <li>Yanıltıcı veya gerçeği yansıtmayan fiyat kullanılamaz.</li>
        <li>Bir ilana en fazla 5 uygun fotoğraf yüklenebilir.</li>
        <li>İlanlar yayınlanmadan önce moderasyon kontrolünden geçer.</li>
        <li>Temel ilan bilgileri değiştirildiğinde ilan tekrar incelemeye alınabilir.</li>
        <li>Kurallara aykırı reddedilen ilan ihlal olarak kaydedilebilir. Her 5 ihlalde 72 saat ilan verme kısıtlaması uygulanır.</li>
        <li>Dolandırıcılık, sahte ödeme belgesi ve kimlik taklidi yasaktır.</li>
        <li>Kullanıcılar birbirleriyle saygılı iletişim kurmalıdır.</li>
        <li>PazarElden, kuralları ihlal eden ilanları kaldırabilir ve hesapları kısıtlayabilir.</li>
      </ol>
    </section>
  `);
}

function termsPage() {
  return shell(`
    <section class="panel">
      <h1>Kullanım Koşulları</h1>

      <p>
        PazarElden kullanıcıların ilan yayınlayabildiği bir ilan platformudur.
        Kullanıcı yayınladığı ilan ve içeriklerin doğruluğundan sorumludur.
      </p>

      <p>
        Kurallara aykırı ilanlar reddedilebilir, kaldırılabilir veya hesap
        geçici olarak kısıtlanabilir.
      </p>

      <p>
        Premium üyelik 99 TL karşılığında 30 günlük kullanım sağlar.
        İlk sürümde otomatik yenileme ve otomatik kart çekimi yapılmaz.
      </p>
    </section>
  `);
}

function privacyPage() {
  return shell(`
    <section class="panel">
      <h1>Gizlilik ve KVKK</h1>

      <p>
        Telefon numarası herkese açık profilde veya ilanlarda gösterilmez.
      </p>

      <p>
        Kullanıcı telefonunu yalnız kendi açık işlemiyle belirli bir
        kullanıcıya 24 saat süreyle paylaşabilir ve süre dolmadan paylaşımı
        iptal edebilir.
      </p>

      <p>
        Hesap, ilan, mesajlaşma ve güvenlik için gerekli veriler hizmetin
        işletilmesi amacıyla işlenir.
      </p>

      <p>
        Bu metin yayına alınmadan önce işletmenin gerçek unvanı, iletişim
        bilgileri, veri sorumlusu bilgileri, saklama süreleri ve KVKK
        kapsamındaki başvuru yöntemleri eklenmelidir.
      </p>
    </section>
  `);
}

/* =========================
   ARAMA
========================= */

async function searchPage() {
  const p =
    new URLSearchParams(
      location.hash.split('?')[1] || ''
    );

  const q = p.get('q') || '';

  const listings = await getActiveListings(q);

  const premium = listings.filter(x => x.sellerPremium);
  const normal = listings.filter(x => !x.sellerPremium);

  return shell(`
    <section>
      <h1>Arama Sonuçları</h1>
      <p>“${safe(q)}” için sonuçlar</p>

      ${
        premium.length
          ? `
            <div class="premiumBox">
              <h2>💎 Premium Sonuçlar</h2>
              <div class="grid">
                ${premium.map(card).join('')}
              </div>
            </div>
          `
          : ''
      }

      <div class="grid">
        ${
          normal.length
            ? normal.map(card).join('')
            : premium.length
              ? ''
              : `<div class="empty">Sonuç bulunamadı.</div>`
        }
      </div>
    </section>
  `);
}

/* =========================
   ROUTER
========================= */

async function render() {
  await expireOldListings();
  await loadSession();

  const raw =
    location.hash.replace('#','') || '/';

  const path = raw.split('?')[0];

  let html;

  try {
    if (path === '/') {
      html = await home();

    } else if (path === '/login') {
      html = currentUser
        ? await profilePage()
        : authPage('login');

    } else if (path === '/signup') {
      html = currentUser
        ? await profilePage()
        : authPage('signup');

    } else if (
      path === '/ilan-ver' ||
      path === '/new'
    ) {
      html = newListingPage();

    } else if (path.startsWith('/listing/')) {
      html = await listingPage(
        path.split('/')[2]
      );

    } else if (path.startsWith('/seller/')) {
      html = await sellerPage(
        path.split('/')[2]
      );

    } else if (path === '/profile') {
      html = await profilePage();

    } else if (path === '/favorites') {
      html = await favoritesPage();

    } else if (path === '/messages') {
      html = await messagesPage();

    } else if (path.startsWith('/conversation/')) {
      const a = path.split('/');
      html = await conversationPage(a[2],a[3]);

    } else if (path === '/notifications') {
      html = await notificationsPage();

    } else if (path === '/premium') {
      html = premiumPage();

    } else if (path === '/admin') {
      html = await adminPage();

    } else if (path === '/search') {
      html = await searchPage();

    } else if (path === '/rules') {
      html = rulesPage();

    } else if (path === '/terms') {
      html = termsPage();

    } else if (path === '/privacy') {
      html = privacyPage();

    } else {
      html = shell(`
        <div class="panel">
          <h1>Sayfa bulunamadı</h1>
          <a href="#/">Ana sayfaya dön</a>
        </div>
      `);
    }

  } catch (err) {
    console.error(err);

    html = shell(`
      <div class="panel">
        <h1>Bir hata oluştu</h1>
        <p>${safe(err?.message || 'Bilinmeyen hata')}</p>
        <a href="#/">Ana sayfaya dön</a>
      </div>
    `);
  }

  $('#app').innerHTML = html;
}

supabase.auth.onAuthStateChange(async (_event,session) => {
  currentUser = session?.user || null;
});

window.addEventListener('hashchange',render);

render();
