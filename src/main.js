import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* =========================================================
   PAZARELDEN - ANA DOSYA
   ========================================================= */

const cfg = window.PAZARELDEN_CONFIG || {};

const supabase =
  cfg.supabaseUrl && cfg.supabaseAnonKey
    ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;


/* =========================================================
   SABİTLER
   ========================================================= */

const cats = [
  'Vasıta',
  'Emlak',
  'Cep Telefonu',
  'Bilgisayar',
  'Elektronik',
  'Ev ve Yaşam',
  'Giyim',
  'Anne ve Bebek',
  'Spor',
  'Hobi',
  'Kitap',
  'Diğer'
];

const icons = [
  '🚗',
  '🏠',
  '📱',
  '💻',
  '📺',
  '🛋️',
  '👕',
  '🧸',
  '⚽',
  '🎨',
  '📚',
  '📦'
];

const rankNames = [
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
  'PazarElden Ustası'
];

const rankIcons = [
  '🌱',
  '🎖️',
  '🎖️',
  '⭐',
  '⭐',
  '🛡️',
  '🛡️',
  '🏅',
  '🥉',
  '🥈',
  '🥇',
  '💠',
  '💎',
  '✨',
  '🏆',
  '👑',
  '👑',
  '🔥',
  '🌟',
  '💫'
];

let currentUser = null;
let currentProfile = null;
let currentActiveListingCount = 0;


/* =========================================================
   YARDIMCI FONKSİYONLAR
   ========================================================= */

function safe(value = '') {
  return String(value)
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
  }).format(Number(value) || 0);
}

function dateText(value) {
  if (!value) return '';

  try {
    return new Date(value).toLocaleString('tr-TR');
  } catch {
    return '';
  }
}

function timeLeft(date) {
  if (!date) return '';

  const end = new Date(date).getTime();
  const now = Date.now();

  const diff = end - now;

  if (diff <= 0) {
    return 'Süre doldu';
  }

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    return `${days} gün ${remainingHours} saat`;
  }

  return `${hours} saat ${minutes} dakika`;
}

function isPremium() {
  if (!currentProfile) return false;

  if (!currentProfile.premium_until) return false;

  return new Date(currentProfile.premium_until).getTime() > Date.now();
}

function userName() {
  if (currentProfile?.full_name?.trim()) {
    return currentProfile.full_name.trim();
  }

  if (currentUser?.email) {
    return currentUser.email.split('@')[0];
  }

  return 'Profilim';
}

function rankInfo() {
  if (currentProfile?.is_admin === true) {
    return {
      name: 'PazarElden Yöneticisi',
      icon: '👑',
      level: 99
    };
  }

  const customRank = currentProfile?.rank_name;

  if (customRank) {
    return {
      name: customRank,
      icon: '🏅',
      level: currentProfile?.rank_level || 1
    };
  }

  const level = Math.min(
    rankNames.length - 1,
    Math.floor(currentActiveListingCount / 5)
  );

  return {
    name: rankNames[level],
    icon: rankIcons[level],
    level
  };
}

function rankBadge() {
  const r = rankInfo();

  return `
    <span class="rankBadge">
      ${r.icon} ${safe(r.name)}
    </span>
  `;
}

async function safeTable(table, operation) {
  if (!supabase) return null;

  try {
    return await operation();
  } catch (error) {
    console.warn(`Opsiyonel tablo hatası: ${table}`, error);
    return null;
  }
}


/* =========================================================
   OTURUM
   ========================================================= */

async function loadSession() {
  if (!supabase) return;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  currentUser = user || null;
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
    .select('id', {
      count: 'exact',
      head: true
    })
    .eq('user_id', currentUser.id)
    .eq('status', 'active');

  currentActiveListingCount = count || 0;
}


/* =========================================================
   GENEL SAYFA
   ========================================================= */

function shell(content) {

  const rank = rankInfo();

  const accountNav = currentUser
    ? `
      <div class="accountArea">

        <a href="#/profile">
          👤 ${safe(userName())}
        </a>

        ${rankBadge()}

        ${
          isPremium()
            ? `<span class="premiumMini">💎 PREMIUM</span>`
            : ''
        }

        <a href="#" onclick="logout();return false;">
          Çıkış
        </a>

      </div>
    `
    : `
      <a class="loginLink" href="#/login">Giriş Yap</a>
      <a class="signupQuick" href="#/signup">👤 Üye Ol</a>
    `;

  return `

    <header>

      <a class="brand" href="#/">
        Pazar<span>Elden</span>
      </a>

      <div class="topsearch">

        <input
          id="q"
          placeholder="Ürün, marka veya kategori ara..."
        >

        <button onclick="searchNow()">
          Ara
        </button>

      </div>

      <nav>

        <a href="#/favorites">
          ♡ Favorilerim
        </a>

        <a href="#/following">
          🔔 Takiplerim
        </a>

        <a href="#/messages">
          💬 Mesajlar
          <span id="messageBadge"></span>
        </a>

        <a href="#/notifications">
          🔔 Bildirimler
        </a>

        ${accountNav}

        <a
          class="cta"
          href="#/ilan-ver"
        >
          + İlan Ver
        </a>

      </nav>

    </header>

    <main>
      ${content}
    </main>

    <footer>

      <div>
        <b>PazarElden</b>
        <p>
          İkinci elin güvenli ve kolay pazarı.
        </p>
      </div>

      <div>
        <a href="#/about">
          Hakkımızda
        </a>

        <a href="#/rules">
          Site Kuralları
        </a>

        <a href="#/privacy">
          Gizlilik
        </a>

        <a href="#/support">
          Destek
        </a>
      </div>

      <small>
        © 2026 PazarElden
      </small>

    </footer>

  `;
}


/* =========================================================
   ARAMA
   ========================================================= */

window.searchNow = () => {

  const q =
    document.querySelector('#q')?.value || '';

  location.hash =
    '#/search?q=' +
    encodeURIComponent(q);
};


/* =========================================================
   İLANLAR
   ========================================================= */

async function getListings(q = '') {

  if (!supabase) return [];

  let query = supabase
    .from('listings')
    .select(`
      *,
      listing_images(image_url)
    `)
    .eq('status', 'active')
    .order('created_at', {
      ascending: false
    })
    .limit(50);

  if (q) {

    query = query.ilike(
      'title',
      `%${q}%`
    );

  }

  const { data, error } = await query;

  if (error) {

    console.error(error);

    return [];

  }

  return data || [];
}


/* =========================================================
   İLAN KARTI
   ========================================================= */

function card(x) {

  const img =
    x.listing_images?.[0]?.image_url;

  const premium =
    x.is_premium === true;

  return `

    <a
      class="card ${premium ? 'premiumCard' : ''}"
      href="#/listing/${x.id}"
    >

      ${
        premium
          ? `
            <div class="premiumRibbon">
              💎 PREMIUM
            </div>
          `
          : ''
      }

      <div class="pic">

        ${
          img
            ? `
              <img
                src="${safe(img)}"
                alt="${safe(x.title)}"
              >
            `
            : '📷'
        }

      </div>

      <div class="pad">

        <b>
          ${safe(x.title)}
        </b>

        <strong>
          ${money(x.price)}
        </strong>

        <span>
          ${safe(x.city || '')}

          ${
            x.district
              ? ' / ' + safe(x.district)
              : ''
          }
        </span>

        ${
          x.delivery_type
            ? `
              <small>
                ${
                  x.delivery_type === 'shipping'
                    ? '📦 Kargo'
                    : '🤝 Elden Teslim'
                }
              </small>
            `
            : ''
        }

      </div>

    </a>

  `;
}


/* =========================================================
   ANA SAYFA
   ========================================================= */

async function home() {

  const listings = await getListings();

  let userCount = 0;
  let activeCount = listings.length;
  let soldCount = 0;

  if (supabase) {
    const users = await safeTable('profiles', () =>
      supabase.from('profiles').select('id', { count: 'exact', head: true })
    );
    userCount = users?.count || 0;

    const active = await safeTable('listings', () =>
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active')
    );
    activeCount = active?.count || activeCount;

    const sold = await safeTable('listings', () =>
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'sold')
    );
    soldCount = sold?.count || 0;
  }

  let monthMember = null;
  if (supabase) {
    const winnerResult = await safeTable('member_of_month', () =>
      supabase
        .from('member_of_month')
        .select('user_id, month_key')
        .eq('winner', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    );

    if (winnerResult?.data?.user_id) {
      const profileResult = await safeTable('profiles', () =>
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, city')
          .eq('id', winnerResult.data.user_id)
          .maybeSingle()
      );
      if (profileResult?.data) {
        monthMember = { ...profileResult.data, month_key: winnerResult.data.month_key };
      }
    }
  }

  const premiumListings = listings.filter(x => x.is_premium === true).slice(0, 5);
  const normalListings = listings.filter(x => x.is_premium !== true).slice(0, 10);

  return shell(`
    <section class="hero professionalHero">
      <div class="heroInner">
        <div class="heroEyebrow">GÜVENLİ • KOLAY • KONTROLLÜ</div>
        <h1>Aradığın ikinci el ürün<br><em>PazarElden’de seni bekliyor.</em></h1>
        <p>İhtiyacın olan ürünü kolayca bul, ilanını dakikalar içinde yayınla.</p>

        <div class="heroSearch professionalSearch">
          <span class="searchIcon">⌕</span>
          <input id="heroQ" type="search" autocomplete="off"
            placeholder="Ürün, marka veya kategori ara..."
            onkeydown="if(event.key==='Enter'){location.hash='#/search?q='+encodeURIComponent(this.value)}">
          <button onclick="location.hash='#/search?q='+encodeURIComponent(document.querySelector('#heroQ').value)">Ara</button>
          ${!currentUser ? '<a class="heroSignupBtn" href="#/signup">👤 Hemen Üye Ol</a>' : ''}
        </div>

        <div class="quickSearch">
          <span>Popüler:</span>
          <a href="#/search?q=iPhone">📱 iPhone</a>
          <a href="#/search?q=Araba">🚗 Araba</a>
          <a href="#/search?q=Kiralık%20Ev">🏠 Kiralık Ev</a>
          <a href="#/search?q=Laptop">💻 Laptop</a>
          <a href="#/search?q=Giyim">👕 Giyim</a>
        </div>
      </div>
    </section>

    <section class="stats professionalStats">
      <div><span class="statIcon">👥</span><strong>${userCount.toLocaleString('tr-TR')}</strong><span>Kayıtlı Üye</span></div>
      <div><span class="statIcon">📣</span><strong>${activeCount.toLocaleString('tr-TR')}</strong><span>Aktif İlan</span></div>
      <div><span class="statIcon">✅</span><strong>${soldCount.toLocaleString('tr-TR')}</strong><span>Satılan İlan</span></div>
      <div><span class="statIcon onlineDot">●</span><strong class="systemActive">Aktif</strong><span>Sistem Durumu</span></div>
    </section>

    <section class="monthMemberSpot">
      <div class="monthMemberTitle"><span>🏆</span><div><small>PAZARELDEN</small><b>Ayın Üyesi</b></div></div>
      ${monthMember ? `
        <a class="monthMemberPerson" href="#/seller/${monthMember.id}">
          <div class="monthMemberAvatar">${monthMember.avatar_url ? '<img src="' + safe(monthMember.avatar_url) + '" alt="Ayın Üyesi">' : '👤'}</div>
          <div><strong>${safe(monthMember.full_name || 'PazarElden Üyesi')}</strong><span>${safe(monthMember.city || 'PazarElden topluluğu')}</span></div>
          <em>Profili Gör →</em>
        </a>
      ` : `
        <div class="monthMemberEmpty"><span>⭐</span><div><strong>Bu ayın üyesi yakında burada</strong><small>Topluluğumuzun öne çıkan üyesi bu alanda gösterilecek.</small></div></div>
      `}
    </section>

    <section class="homeCommunityHub">
      <div class="sectionHead"><div><small class="sectionLabel">PAZARELDEN TOPLULUĞU</small><h2>Kazan, keşfet, güvenle kullan</h2></div></div>
      <div class="communityCards">
        <article class="communityCard"><span>🎁</span><h3>Puan & Davet Sistemi</h3><p>Davet bağlantını paylaş, topluluğa katkı sağla ve PazarElden puanlarını biriktir.</p><div class="miniSteps"><b>🤝 Başarılı davet +10 P</b><b>📢 Uygun paylaşım +1 P</b><b>⭐ Olumlu satış değerlendirmesi +5 P</b></div>
        ${currentUser ? '<a href="#/profile">Puanlarımı Gör →</a>' : '<a href="#/signup">Devamı için ücretsiz üye ol →</a>'}</article>
        <article class="communityCard"><span>🏆</span><h3>Kampanyalar & Hediyeler</h3><p>Ayın Üyesi, Premium gün hediyeleri ve dönemsel topluluk kampanyaları burada duyurulacak.</p>${currentUser ? '<a href="#/profile">Ödül Merkezine Git →</a>' : '<a href="#/signup">Kampanyalara katılmak için üye ol →</a>'}</article>
        <article class="communityCard"><span>💡</span><h3>Bugünün PazarElden Tüyosu</h3><p>Net fotoğraf, açıklayıcı başlık ve gerçekçi fiyat ilanının daha güvenilir görünmesine yardımcı olur.</p>${currentUser ? '<a href="#/ilan-ver">İlan Vermeye Başla →</a>' : '<a href="#/signup">Daha fazla tüyo için üye ol →</a>'}</article>
      </div>
      <div class="comingSocial"><div><span>📸</span><div><small>SOSYAL MEDYA</small><strong>PazarElden Instagram</strong><p>Kampanyalar, yeni ilanlar, güvenli alışveriş tüyoları ve topluluk paylaşımları için hazırlanıyor.</p></div></div><b>Yakında</b></div>
    </section>
    <section class="categorySection">
      <div class="sectionHead">
        <div><small class="sectionLabel">KEŞFET</small><h2>Kategoriler</h2></div>
        <a href="#/categories">Tümünü Gör →</a>
      </div>
      <div class="cats professionalCats">
        ${cats.map((c,i)=>`<a href="#/search?q=${encodeURIComponent(c)}"><i>${icons[i]}</i><b>${safe(c)}</b></a>`).join('')}
      </div>
    </section>

    <section class="marketSection premiumSection">
      <div class="sectionHead">
        <div><small class="sectionLabel premiumLabel">PAZARELDEN PREMIUM</small><h2>💎 Öne Çıkan Premium İlanlar</h2></div>
        <a href="#/categories">Tümünü Gör →</a>
      </div>
      <div class="grid premiumGrid">
        ${premiumListings.length ? premiumListings.map(card).join('') :
          '<div class="empty premiumEmpty"><div class="emptyIcon">💎</div><b>Henüz Premium ilan bulunmuyor</b><p>Premium ilanlar burada özel olarak öne çıkarılacak.</p></div>'}
      </div>
    </section>

    <section class="marketSection">
      <div class="sectionHead">
        <div><small class="sectionLabel">YENİ İLANLAR</small><h2>Son Eklenen İlanlar</h2></div>
        <a href="#/categories">Tümünü Gör →</a>
      </div>
      <div class="grid">
        ${normalListings.length ? normalListings.map(card).join('') :
          '<div class="empty"><div class="emptyIcon">📦</div><b>Henüz aktif ilan bulunmuyor</b><p>Yeni ilanlar yayınlandığında burada görüntülenecek.</p></div>'}
      </div>
    </section>

    <section class="homeInfo professionalInfo">
      <div class="infoTitle">
        <small class="sectionLabel">NEDEN PAZARELDEN?</small>
        <h2>İkinci el alışverişin kolay yolu</h2>
        <p>Alıcı ve satıcıyı sade, güvenli ve kontrollü bir platformda buluşturuyoruz.</p>
      </div>
      <div class="infoCards">
        <article><span>🔎</span><h3>Kolayca Keşfet</h3><p>Arama ve kategoriler ile aradığın ürüne hızlıca ulaş.</p></article>
        <article><span>📸</span><h3>Kolay İlan Ver</h3><p>Ürününü ekle ve ilanını PazarElden’de yayınla.</p></article>
        <article><span>🛡️</span><h3>Kontrollü Sistem</h3><p>İlanlar kurallar ve moderasyon sistemiyle kontrol edilir.</p></article>
        <article><span>💬</span><h3>Doğrudan İletişim</h3><p>Alıcı ve satıcı PazarElden üzerinden iletişim kurabilir.</p></article>
      </div>
    </section>
  `);
}


/* =========================================================
   KATEGORİLER
   ========================================================= */
function categoriesPage() {
  return shell(`
    <section class="categoriesPage">
      <div class="categoryPageHero">
        <small class="sectionLabel">PAZARELDEN KATEGORİLERİ</small>
        <h1>🧭 Tüm Kategoriler</h1>
        <p>Aradığın ürünü kategorisine göre keşfet. Yeni kategoriler eklendikçe bu sayfa büyümeye devam edecek.</p>
      </div>
      <div class="allCategoryGrid">
        ${cats.map((c,i)=>`
          <a class="allCategoryCard" href="#/search?q=${encodeURIComponent(c)}">
            <span>${icons[i]}</span>
            <div><b>${safe(c)}</b><small>İlanları görüntüle →</small></div>
          </a>`).join('')}
      </div>
      <div class="categoryHelp panel">
        <b>Aradığın kategoriyi bulamadın mı?</b>
        <p>Şimdilik en yakın kategoriyi veya “Diğer” seçeneğini kullanabilirsin. PazarElden büyüdükçe alt kategoriler de eklenecek.</p>
        ${currentUser ? '<a href="#/ilan-ver">+ İlan Ver</a>' : '<a href="#/signup">Ücretsiz üye ol →</a>'}
      </div>
    </section>
  `);
}

/* =========================================================
   FAVORİ
   ========================================================= */

async function isFavorite(listingId) {

  if (!currentUser) return false;

  const result =
    await safeTable(
      'favorites',
      () =>
        supabase
          .from('favorites')
          .select('listing_id')
          .eq('user_id', currentUser.id)
          .eq('listing_id', listingId)
          .maybeSingle()
    );

  return !!result?.data;
}

window.toggleFavorite =
  async listingId => {

    if (!currentUser) {

      location.hash =
        '#/login';

      return;
    }

    const favorite =
      await isFavorite(listingId);

    if (favorite) {

      await safeTable(
        'favorites',
        () =>
          supabase
            .from('favorites')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('listing_id', listingId)
      );

    } else {

      await safeTable(
        'favorites',
        () =>
          supabase
            .from('favorites')
            .insert({
              user_id: currentUser.id,
              listing_id: listingId
            })
      );

    }

    await render();

  };


/* =========================================================
   İLAN DETAY
   ========================================================= */

async function listing(id) {

  if (!supabase) {

    return shell(`
      <div class="panel">
        Supabase bağlantısı yok.
      </div>
    `);

  }

  const { data: x, error } =
    await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

  if (error || !x) {

    return shell(`
      <div class="panel">

        <h1>
          İlan bulunamadı
        </h1>

        <a href="#/">
          Ana sayfaya dön
        </a>

      </div>
    `);

  }

  const { data: images } =
    await supabase
      .from('listing_images')
      .select('*')
      .eq('listing_id', id)
      .order('created_at', {
        ascending: true
      });

  let sellerName =
    'PazarElden kullanıcısı';

  if (x.user_id) {

    const { data: seller } =
      await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', x.user_id)
        .maybeSingle();

    if (seller?.full_name) {

      sellerName =
        seller.full_name;

    }

  }

  const favorite =
    await isFavorite(id);

  const mine =
    currentUser?.id === x.user_id;

  return shell(`

    <section class="detail">

      <div>

        <div class="gallery">

          ${
            images?.length
              ? images
                  .map(
                    image => `
                      <img
                        src="${safe(image.image_url)}"
                        alt="${safe(x.title)}"
                      >
                    `
                  )
                  .join('')
              : `
                  <div class="noimg">
                    📷
                  </div>
                `
          }

        </div>

      </div>


      <aside>

        ${
          x.is_premium
            ? `
              <div class="premiumBox">
                💎 PREMIUM İLAN
              </div>
            `
            : ''
        }

        <h1>
          ${safe(x.title)}
        </h1>

        <div class="price">
          ${money(x.price)}
        </div>

        <p>
          📍
          ${safe(x.city || '')}
          ${
            x.district
              ? ' / ' + safe(x.district)
              : ''
          }
        </p>

        ${
          x.delivery_type
            ? `
              <p>
                ${
                  x.delivery_type === 'shipping'
                    ? '📦 Kargo ile gönderim'
                    : '🤝 Elden teslim'
                }
              </p>
            `
            : ''
        }

        <hr>

        <h3>
          Ürün Durumu
        </h3>

        <p>
          ${safe(x.condition || '-')}
        </p>

        <h3>
          Açıklama
        </h3>

        <p>
          ${safe(x.description || '')}
        </p>


        <div class="sellerBox">

          <h3>
            👤 Satıcı
          </h3>

          <p>
            ${safe(sellerName)}
          </p>

          <a
            href="#/seller/${x.user_id}"
          >
            Satıcı Profilini Gör
          </a>

        </div>


        <div class="listingActions">

          <button
            onclick="toggleFavorite('${x.id}')"
          >
            ${
              favorite
                ? '❤️ Favorilerden Çıkar'
                : '♡ Favorilere Ekle'
            }
          </button>

          <button
            onclick="followListing('${x.id}')"
          >
            🔔 İlanı Takip Et
          </button>

          <button
            onclick="priceAlert('${x.id}')"
          >
            💰 Fiyat Takibi
          </button>

          ${
            !mine
              ? `
                <button
                  onclick="
                    openConversation(
                      '${x.id}',
                      '${x.user_id}'
                    )
                  "
                >
                  💬 Satıcıya Mesaj Gönder
                </button>

                <button
                  onclick="
                    makeOffer(
                      '${x.id}',
                      ${Number(x.price) || 0},
                      '${x.user_id}'
                    )
                  "
                >
                  🤝 Teklif Ver
                </button>

                <button
                  onclick="
                    reportListing(
                      '${x.id}',
                      '${x.user_id}'
                    )
                  "
                >
                  🚩 Şikâyet Et
                </button>
              `
              : ''
          }

        </div>

        ${
          (mine || currentProfile?.is_admin)
            ? `
              <div class="ownerPanel">

                <h3>
                  İlan Yönetimi
                </h3>

                <button
                  onclick="pauseListing('${x.id}')"
                >
                  ⏸️ Yayından Kaldır
                </button>

                <button
                  onclick="resumeListing('${x.id}')"
                >
                  ▶️ Yeniden Aktifleştir
                </button>

                <button
                  class="dangerBtn"
                  onclick="deleteListing('${x.id}')"
                >
                  🗑️ İlanı Sil
                </button>

                <p>
                  Yayından kaldırılan ilan tekrar moderasyona gönderilebilir.
                  Yönetici silme işlemi ilanı veritabanından kalıcı olarak kaldırır.
                </p>

              </div>
            `
            : ''
        }

      </aside>

    </section>

  `);
}


/* =========================================================
   TAKİP
   ========================================================= */

window.followListing =
  async listingId => {

    if (!currentUser) {

      location.hash = '#/login';

      return;
    }

    await safeTable(
      'listing_follows',
      () =>
        supabase
          .from('listing_follows')
          .upsert({
            user_id: currentUser.id,
            listing_id: listingId
          })
    );

    alert(
      'İlan takip listenize eklendi.'
    );

  };


/* =========================================================
   FİYAT TAKİBİ
   ========================================================= */

window.priceAlert =
  async listingId => {

    if (!currentUser) {

      location.hash =
        '#/login';

      return;
    }

    const value =
      prompt(
        'Bu ilan için hedef fiyatınızı yazın:'
      );

    if (!value) return;

    const target =
      Number(
        value
          .replaceAll('.', '')
          .replace(',', '.')
      );

    if (!target || target <= 0) {

      alert(
        'Geçerli bir fiyat girin.'
      );

      return;
    }

    await safeTable(
      'price_alerts',
      () =>
        supabase
          .from('price_alerts')
          .upsert({
            user_id: currentUser.id,
            listing_id: listingId,
            target_price: target
          })
    );

    alert(
      'Fiyat takibiniz oluşturuldu.'
    );

  };


/* =========================================================
   TEKLİF
   ========================================================= */

window.makeOffer = async (listingId, listingPrice) => {
  if (!currentUser) { location.hash = '#/login'; return; }
  const minimum = listingPrice * 0.80;
  const priceText = prompt(`İlan fiyatı: ${money(listingPrice)}\nMinimum teklif: ${money(minimum)}\n\nTeklifinizi girin:`);
  if (!priceText) return;
  const offer = Number(priceText.replaceAll('.', '').replace(',', '.'));
  if (!offer || offer < minimum || offer > listingPrice) {
    alert(`Teklif ilan fiyatının %80'i ile %100'ü arasında olmalıdır.\nMinimum: ${money(minimum)}\nMaksimum: ${money(listingPrice)}`);
    return;
  }
  const { error } = await supabase.rpc('submit_offer', { p_listing_id: listingId, p_amount: offer, p_message: null });
  if (error) { alert(error.message); return; }
  alert('Teklifiniz satıcıya güvenli şekilde gönderildi.');
};

/* =========================================================
   ŞİKAYET
   ========================================================= */

window.reportListing =
  async (listingId, sellerId) => {

    if (!currentUser) {

      location.hash =
        '#/login';

      return;
    }

    const reason =
      prompt(
        'Şikâyet nedeninizi yazın:'
      );

    if (!reason?.trim()) return;

    await safeTable(
      'reports',
      () =>
        supabase
          .from('reports')
          .insert({
            reporter_id: currentUser.id,
            listing_id: listingId,
            reported_user_id: sellerId,
            reason: reason.trim(),
            details: reason.trim(),
            status: 'open'
          })
    );

    alert(
      'Şikâyetiniz yönetime iletildi.'
    );

  };


/* =========================================================
   İLAN YAYINDAN KALDIR / AKTİF ET
   ========================================================= */

window.pauseListing =
  async id => {

    if (!currentUser) return;

    await supabase
      .from('listings')
      .update({
        status: 'inactive'
      })
      .eq('id', id)
      .eq('user_id', currentUser.id);

    await render();

  };


window.resumeListing =
  async id => {

    if (!currentUser) return;

    await supabase
      .from('listings')
      .update({
        status: 'pending',
        moderation_status: 'pending',
        submitted_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', currentUser.id);

    await render();

  };


window.deleteListing =
  async id => {

    if (!currentUser) return;

    const allowed =
      currentProfile?.is_admin === true ||
      currentProfile?.role === 'admin';

    if (!allowed) {
      alert('Bu işlem yalnızca yönetici tarafından yapılabilir.');
      return;
    }

    if (!confirm('Bu ilanı silmek istediğinize emin misiniz?')) return;

    const { error } = await supabase.rpc('admin_hard_delete_listing', {
      p_listing_id: id
    });

    if (error) {
      alert('İlan kalıcı olarak silinemedi: ' + error.message);
      return;
    }

    alert('İlan kalıcı olarak silindi.');
    location.hash = '#/admin';

  };


/* =========================================================
   İLAN VERME
   ========================================================= */

function newListing() {

  return shell(`

    <div class="panel form">

      <h1>
        📢 İlan Ver
      </h1>

      <div class="warningBox">

        <b>
          İlan vermeden önce okuyun
        </b>

        <ul>

          <li>
            Müstehcen içerik yasaktır.
          </li>

          <li>
            Küfür, hakaret ve tehdit yasaktır.
          </li>

          <li>
            Başkasının telefon numarası
            veya kişisel bilgileri paylaşılmaz.
          </li>

          <li>
            Sahte, yanıltıcı veya hukuka aykırı
            ilanlar yayınlanmaz.
          </li>

          <li>
            İlanlar yayınlanmadan önce
            moderasyon kontrolünden geçebilir.
          </li>

          <li>
            5 hatalı ilan sonrasında
            ilan verme yetkisi geçici olarak
            kısıtlanabilir.
          </li>

        </ul>

      </div>


      <input
        id="title"
        placeholder="İlan başlığı"
        maxlength="120"
      >


      <select id="category">

        <option value="">
          Kategori seç
        </option>

        ${
          cats
            .map(
              c =>
                `<option value="${safe(c)}">${safe(c)}</option>`
            )
            .join('')
        }

      </select>


      <textarea
        id="desc"
        placeholder="İlan açıklaması"
        maxlength="3000"
      ></textarea>


      <input
        id="price"
        type="number"
        min="0"
        placeholder="Fiyat"
      >


      <select id="condition">

        <option value="">
          Ürün durumu
        </option>

        <option>
          Sıfır
        </option>

        <option>
          Yeni Gibi
        </option>

        <option>
          İyi
        </option>

        <option>
          Orta
        </option>

        <option>
          Yıpranmış
        </option>

      </select>


      <input
        id="city"
        placeholder="Şehir"
      >


      <input
        id="district"
        placeholder="İlçe"
      >


      <select id="delivery">

        <option value="">
          Teslimat seçeneği
        </option>

        <option value="shipping">
          📦 Kargo
        </option>

        <option value="hand">
          🤝 Elden Teslim
        </option>

        <option value="both">
          📦 Kargo + Elden Teslim
        </option>

      </select>


      <label>
        Fotoğraflar
      </label>

      <input
        id="photos"
        type="file"
        accept="image/*"
        multiple
        onchange="checkPhotos()"
      >

      <small>
        En fazla 5 fotoğraf.
        İlk fotoğraf kapak fotoğrafıdır.
      </small>


      <div class="premiumListingNote">
        💎 Premium üyeliğiniz aktifse ilanınız onaylandıktan sonra Premium avantajları otomatik uygulanır.
      </div>


      <label>
        <input
          id="terms"
          type="checkbox"
        >

        Site kurallarını okudum ve kabul ediyorum.
      </label>


      <button
        id="publishBtn"
        onclick="publishListing()"
      >
        İlanı Gönder
      </button>


      <p id="formMsg"></p>

    </div>

  `);
}


window.checkPhotos =
  () => {

    const input =
      document.querySelector('#photos');

    const msg =
      document.querySelector('#formMsg');

    if (!input) return;

    if (input.files.length > 5) {

      msg.textContent =
        'En fazla 5 fotoğraf yükleyebilirsiniz.';

      input.value = '';

      return false;
    }

    return true;

  };


/* =========================================================
   KELİME KONTROLÜ
   ========================================================= */

const blockedWords = [
  'orospu',
  'siktir',
  'amk',
  'piç',
  'şerefsiz',
  'yavşak',
  'porno',
  'porn',
  'seks',
  'fahişe'
];

function containsBlockedWord(text = '') {

  const value =
    text
      .toLocaleLowerCase('tr-TR')
      .replaceAll('*', '')
      .replaceAll('.', '')
      .replaceAll('-', ' ');

  return blockedWords.some(
    word =>
      value.includes(
        word.toLocaleLowerCase('tr-TR')
      )
  );
}


/* =========================================================
   TELEFON NUMARASI KONTROLÜ
   ========================================================= */

function containsPhone(text = '') {

  const digits =
    text.replace(/\D/g, '');

  return (
    digits.length >= 10 &&
    digits.length <= 13
  );

}


/* =========================================================
   İLAN OLUŞTUR
   ========================================================= */

window.publishListing =
  async () => {

    if (!supabase) {

      alert(
        'Supabase bağlantısı bulunamadı.'
      );

      return;
    }

    const {
      data: {
        user
      }
    } =
      await supabase.auth.getUser();

    if (!user) {

      location.hash =
        '#/login';

      return;
    }

    const msg =
      document.querySelector('#formMsg');

    const title =
      document.querySelector('#title')
        ?.value.trim();

    const description =
      document.querySelector('#desc')
        ?.value.trim();

    const price =
      Number(
        document.querySelector('#price')
          ?.value
      );

    const condition =
      document.querySelector('#condition')
        ?.value;

    const city =
      document.querySelector('#city')
        ?.value.trim();

    const district =
      document.querySelector('#district')
        ?.value.trim();

    const catName =
      document.querySelector('#category')
        ?.value;

    const delivery =
      document.querySelector('#delivery')
        ?.value;

    const photos =
      document.querySelector('#photos')
        ?.files;

    const terms =
      document.querySelector('#terms')
        ?.checked;

    if (!terms) {

      msg.textContent =
        'Site kurallarını kabul etmelisiniz.';

      return;
    }


    if (!title) {

      msg.textContent =
        'İlan başlığını yazın.';

      return;
    }


    if (!catName) {

      msg.textContent =
        'Kategori seçin.';

      return;
    }


    if (!price || price <= 0) {

      msg.textContent =
        'Geçerli bir fiyat girin.';

      return;
    }


    if (!condition) {

      msg.textContent =
        'Ürün durumunu seçin.';

      return;
    }


    if (!city) {

      msg.textContent =
        'Şehir bilgisini girin.';

      return;
    }


    if (
      photos &&
      photos.length > 5
    ) {

      msg.textContent =
        'En fazla 5 fotoğraf yükleyebilirsiniz.';

      return;
    }


    const fullText =
      `${title} ${description}`;


    if (containsBlockedWord(fullText)) {

      msg.textContent =
        'İlanınız uygunsuz veya yasaklı içerik içeriyor.';

      return;
    }


    if (containsPhone(fullText)) {

      msg.textContent =
        'İlan açıklamasında telefon numarası paylaşamazsınız.';

      return;
    }


    const categoryResult =
      await supabase
        .from('categories')
        .select('id')
        .eq('name', catName)
        .maybeSingle();

    const category_id =
      categoryResult.data?.id || null;


    msg.textContent =
      'İlanınız kontrol için gönderiliyor...';


    const { data: newItem, error } =
      await supabase
        .from('listings')
        .insert({

          user_id:
            user.id,

          category_id,

          title,

          description,

          price,

          condition,

          city,

          district,

          delivery_type:
            delivery || null,

          status:
            'pending'

        })
        .select('*')
        .single();


    if (error) {

      msg.textContent =
        'İlan kaydedilemedi: ' +
        error.message;

      return;
    }


    for (
      const file of
      [...(photos || [])]
    ) {

      const cleanName =
        file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          '_'
        );

      const path =
        `${user.id}/${newItem.id}/${crypto.randomUUID()}-${cleanName}`;


      const upload =
        await supabase.storage
          .from('listing-images')
          .upload(
            path,
            file
          );


      if (upload.error) {

        console.error(
          upload.error
        );

        continue;
      }


      const {
        data: publicData
      } =
        supabase.storage
          .from('listing-images')
          .getPublicUrl(path);


      if (publicData?.publicUrl) {

        await supabase
          .from('listing_images')
          .insert({

            listing_id:
              newItem.id,

            image_url:
              publicData.publicUrl

          });

      }

    }


    msg.textContent =
      'İlanınız moderasyon kontrolüne gönderildi.';


    setTimeout(
      () => {

        location.hash =
          '#/listing/' +
          newItem.id;

      },
      1200
    );

  };


/* =========================================================
   FAVORİLER
   ========================================================= */

async function favoritesPage() {

  if (!currentUser) {

    return shell(`
      <div class="panel">

        <h1>
          Favorilerim
        </h1>

        <p>
          Favorilerinizi görmek için giriş yapmalısınız.
        </p>

        <a href="#/login">
          Giriş Yap
        </a>

      </div>
    `);

  }


  const { data } =
    await supabase
      .from('favorites')
      .select('listing_id')
      .eq(
        'user_id',
        currentUser.id
      );


  const ids =
    [...new Set(
      (data || [])
        .map(x => x.listing_id)
    )];


  let listings = [];


  if (ids.length) {

    const result =
      await supabase
        .from('listings')
        .select(`
          *,
          listing_images(image_url)
        `)
        .in('id', ids)
        .eq(
          'status',
          'active'
        );

    listings =
      result.data || [];

  }


  return shell(`

    <section>

      <h1>
        ❤️ Favorilerim
      </h1>

      <div class="grid">

        ${
          listings.length
            ? listings
                .map(card)
                .join('')
            : `
              <div class="empty">
                Henüz favori ilanınız yok.
              </div>
            `
        }

      </div>

    </section>

  `);

}


/* =========================================================
   MESAJLAŞMA
   ========================================================= */

window.openConversation =
  (listingId, sellerId) => {

    if (!currentUser) {

      location.hash =
        '#/login';

      return;
    }

    location.hash =
      '#/messages?listing=' +
      encodeURIComponent(listingId) +
      '&user=' +
      encodeURIComponent(sellerId);

  };


async function messagesPage() {

  if (!currentUser) {

    return shell(`
      <div class="panel">

        <h1>
          Mesajlarım
        </h1>

        <p>
          Mesajlarınızı görmek için giriş yapın.
        </p>

      </div>
    `);

  }


  const { data: messages } =
    await supabase
      .from('messages')
      .select('*')
      .or(
        `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );


  const conversations =
    new Map();


  for (
    const m of messages || []
  ) {

    const other =
      m.sender_id === currentUser.id
        ? m.receiver_id
        : m.sender_id;

    const key =
      `${m.listing_id || 'none'}_${other}`;


    if (
      !conversations.has(key)
    ) {

      conversations.set(
        key,
        {
          ...m,
          other
        }
      );

    }

  }


  const rows = [];


  for (
    const m of conversations.values()
  ) {

    let person =
      'PazarElden kullanıcısı';

    let title =
      'İlan';


    const { data: profile } =
      await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', m.other)
        .maybeSingle();


    if (profile?.full_name) {

      person =
        profile.full_name;

    }


    if (m.listing_id) {

      const { data: item } =
        await supabase
          .from('listings')
          .select('title')
          .eq('id', m.listing_id)
          .maybeSingle();


      if (item?.title) {

        title =
          item.title;

      }

    }


    rows.push(`

      <div class="panel">

        <b>
          ${safe(title)}
        </b>

        <p>
          ${safe(person)}
        </p>

        <p>
          ${safe(m.content || '')}
        </p>

        <small>
          ${dateText(m.created_at)}
        </small>

        <button
          onclick="
            openConversation(
              '${m.listing_id || ''}',
              '${m.other}'
            )
          "
        >
          Mesajları Aç
        </button>

      </div>

    `);

  }


  return shell(`

    <section>

      <h1>
        💬 Mesajlarım
      </h1>

      ${
        rows.length
          ? rows.join('')
          : `
            <div class="empty">
              Henüz mesajınız bulunmuyor.
            </div>
          `
      }

    </section>

  `);

}


/* =========================================================
   PROFİL
   ========================================================= */

async function profilePage() {
  if (!currentUser) {
    location.hash = '#/login';
    return shell('<div class="panel">Giriş yapmanız gerekiyor.</div>');
  }

  const { data: mine } = await supabase
    .from('listings')
    .select('*, listing_images(image_url)')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  const p = currentProfile || {};
  let reward = { points: 0, qualified_referrals: 0, shares_this_month: 0 };
  const rewardResult = await safeTable('reward_points', () => supabase.rpc('my_reward_summary'));
  if (rewardResult?.data?.[0]) reward = rewardResult.data[0];

  const { data: inviteCodeData } = await supabase.rpc('ensure_my_referral_code');
  const inviteCode = inviteCodeData || '';
  const inviteLink = location.origin + location.pathname + '#/signup?ref=' + inviteCode;
  const { data: myVisitRows } = await supabase.rpc('my_profile_visit_stats');
  const myVisits = myVisitRows?.[0] || { member_visits: 0, guest_visits: 0 };

  const joined = p.created_at
    ? new Date(p.created_at).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
    : '';
  const avatar = p.avatar_url
    ? '<img src="' + safe(p.avatar_url) + '" alt="Profil fotoğrafı">'
    : (p.is_admin ? '👑' : '👤');

  return shell(
    '<section class="memberProfile">' +
      '<div class="profileHero panel ' + (p.is_admin ? 'adminProfileHero' : '') + '">' +
        '<div class="profileAvatar ' + (p.is_admin ? 'adminAvatar' : '') + '">' + avatar + '</div>' +
        '<div class="profileIdentity">' +
          '<div class="profileNameRow"><h1>' + safe(userName()) + '</h1>' +
            (p.is_admin ? '<span class="adminCrown">👑 Yönetici</span>' : '') +
          '</div>' +
          '<div class="profileBadges">' + rankBadge() +
            (isPremium() ? '<span class="premiumMini">💎 PREMIUM</span>' : '') +
            (joined ? '<span class="profileMeta">📅 Üyelik: ' + safe(joined) + '</span>' : '') +
          '</div>' +
          (p.city ? '<div class="profileLocation">📍 ' + safe(p.city) + (p.district ? ' / ' + safe(p.district) : '') + '</div>' : '') +
        '</div>' +
        '<button class="profileEditBtn" onclick="toggleProfileEditor()">⚙️ Profil Düzenle</button>' +
      '</div>' +

      '<div id="profileEditor" class="panel profileEditor" hidden>' +
        '<h3>Profilini Düzenle</h3>' +
        '<textarea id="profileAbout" maxlength="500" placeholder="Kendinizi kısaca tanıtın...">' + safe(p.about_me || '') + '</textarea>' +
        '<div class="profileEditGrid">' +
          '<input id="profileCity" maxlength="80" placeholder="Şehir" value="' + safe(p.city || '') + '">' +
          '<input id="profileDistrict" maxlength="80" placeholder="İlçe" value="' + safe(p.district || '') + '">' +
          '<input id="profileAvatarUrl" maxlength="1000" placeholder="Profil fotoğrafı bağlantısı (isteğe bağlı)" value="' + safe(p.avatar_url || '') + '">' +
        '</div>' +
        '<small>Bu bilgiler herkese açık profilinizde görünür. Telefon ve e-posta gösterilmez.</small>' +
        '<button onclick="savePublicProfile()">Değişiklikleri Kaydet</button>' +
      '</div>' +

      '<div class="panel publicAbout"><h3>Hakkımda</h3><p>' +
        safe(p.about_me || 'Henüz bir tanıtım yazısı eklenmemiş.') +
      '</p></div>' +
      '<div class="panel rewardPanel"><div class="rewardTop"><div><small>🎁 ÖDÜL MERKEZİ</small><h3>PazarElden Puanım</h3></div><strong>' + Number(reward.points || 0) + ' P</strong></div>' +
        '<div class="rewardStats"><span>🤝 <b>' + Number(reward.qualified_referrals || 0) + '</b> başarılı davet</span><span>📢 <b>' + Number(reward.shares_this_month || 0) + '/10</b> aylık paylaşım</span><span>👥 <b>' + Number(myVisits.member_visits || 0) + '</b> benzersiz üye ziyareti</span><span>👁️ <b>' + Number(myVisits.guest_visits || 0) + '</b> misafir ziyareti</span></div><div class="inviteCodeLine">Referans Kodum: <b>' + safe(inviteCode) + '</b></div>' +
        '<div class="inviteBox"><input id="inviteLink" readonly value="' + safe(inviteLink) + '"><button onclick="copyInviteLink()">Davet Linkini Kopyala</button></div>' +
        '<div class="rewardButtons"><button onclick="redeemReward(50)">50 P → 1 Gün Premium</button><button onclick="redeemReward(100)">100 P → 3 Gün</button><button onclick="redeemReward(200)">200 P → 7 Gün</button></div>' +
        '<small>Davet puanı, davet edilen üye ilk ilanını oluşturduğunda otomatik verilir.</small>' +
      '</div>' +


      '<div class="profileMenu">' +
        (p.is_admin ? '<a class="adminModuleLink" href="#/admin">👑 Yönetim Merkezi</a>' : '') +
        '<a href="#/profile">📋 İlanlarım</a>' +
        '<a href="#/favorites">❤️ Favorilerim</a>' +
        '<a href="#/following">🔔 Takiplerim</a>' +
        '<a href="#/notifications">🔔 Bildirimler</a>' +
        '<a href="#/premium">💎 Premium Üyelik</a>' +
      '</div>' +
      '<div class="profileSectionTitle"><h2>İlanlarım</h2><span>' + (mine?.length || 0) + '</span></div>' +
      '<div class="grid">' + (mine?.length ? mine.map(card).join('') : '<div class="empty">Henüz ilanınız yok.</div>') + '</div>' +
    '</section>'
  );
}

window.redeemReward = async points => {
  const { error } = await supabase.rpc('redeem_reward', { p_points: points });
  if (error) return alert(error.message);
  alert('🎁 Premium ödülünüz hesabınıza tanımlandı.');
  await render();
};

window.copyInviteLink = async () => {
  const link = document.querySelector('#inviteLink')?.value;
  if (!link) return;
  try { await navigator.clipboard.writeText(link); alert('Davet linkiniz kopyalandı.'); }
  catch { prompt('Davet linkinizi kopyalayın:', link); }
};

window.toggleProfileEditor = () => {
  const el = document.querySelector('#profileEditor');
  if (el) el.hidden = !el.hidden;
};

window.savePublicProfile = async () => {
  if (!currentUser) return;
  const about_me = document.querySelector('#profileAbout')?.value.trim() || '';
  const city = document.querySelector('#profileCity')?.value.trim() || '';
  const district = document.querySelector('#profileDistrict')?.value.trim() || '';
  const avatar_url = document.querySelector('#profileAvatarUrl')?.value.trim() || null;

  const { error } = await supabase
    .from('profiles')
    .update({ about_me, city, district, avatar_url })
    .eq('id', currentUser.id);

  if (error) {
    alert('Profil güncellenemedi: ' + error.message);
    return;
  }

  alert('Profiliniz güncellendi.');
  await render();
};

async function sellerPage(id) {
  const { data: seller } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!seller) return shell('<div class="panel">Satıcı bulunamadı.</div>');

  let visitorKey = localStorage.getItem('peVisitorKey');
  if (!visitorKey) {
    visitorKey = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random()) + '-' + navigator.userAgent;
    localStorage.setItem('peVisitorKey', visitorKey);
  }
  let publicVisitCount = null;
  const visitResult = await supabase.rpc('register_profile_visit', { p_profile_id: id, p_visitor_key: visitorKey });
  if (!visitResult.error) publicVisitCount = visitResult.data;

  const { data: listings } = await supabase
    .from('listings')
    .select('*, listing_images(image_url)')
    .eq('user_id', id)
    .eq('status', 'active');

  const joined = seller.created_at
    ? new Date(seller.created_at).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
    : '';
  const avatar = seller.avatar_url
    ? '<img src="' + safe(seller.avatar_url) + '" alt="Profil fotoğrafı">'
    : (seller.is_admin ? '👑' : '👤');

  return shell(
    '<section class="memberProfile">' +
      '<div class="profileHero panel ' + (seller.is_admin ? 'adminProfileHero' : '') + '">' +
        '<div class="profileAvatar ' + (seller.is_admin ? 'adminAvatar' : '') + '">' + avatar + '</div>' +
        '<div class="profileIdentity">' +
          '<div class="profileNameRow"><h1>' + safe(seller.full_name || 'PazarElden Kullanıcısı') + '</h1>' +
            (seller.is_admin ? '<span class="adminCrown">👑 Yönetici</span>' : '') +
          '</div>' +
          '<div class="profileBadges">' +
            (seller.is_admin ? '<span class="rankBadge">👑 PazarElden Yöneticisi</span>' : '') +
            (seller.premium_until && new Date(seller.premium_until).getTime() > Date.now() ? '<span class="premiumMini">💎 PREMIUM</span>' : '') +
            (joined ? '<span class="profileMeta">📅 Üyelik: ' + safe(joined) + '</span>' : '') +
          '</div>' +
          (seller.city ? '<div class="profileLocation">📍 ' + safe(seller.city) + (seller.district ? ' / ' + safe(seller.district) : '') + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="panel publicAbout"><h3>Hakkında</h3><p>' +
        safe(seller.about_me || 'Bu üye henüz kendini tanıtan bir açıklama eklememiş.') +
      '</p>' + (publicVisitCount !== null ? '<small>👥 ' + Number(publicVisitCount.member_visits || 0) + ' benzersiz üye ziyareti</small>' : '') +
      '</p></div>' +
      '<div class="profileSectionTitle"><h2>Aktif İlanları</h2><span>' + (listings?.length || 0) + '</span></div>' +
      '<div class="grid">' + (listings?.length ? listings.map(card).join('') : '<div class="empty">Aktif ilan bulunmuyor.</div>') + '</div>' +
    '</section>'
  );
}


/* =========================================================
   BİLDİRİMLER
   ========================================================= */

async function notificationsPage() {

  if (!currentUser) {

    location.hash =
      '#/login';

    return shell(`
      <div class="panel">
        Giriş yapmanız gerekiyor.
      </div>
    `);

  }


  const result =
    await safeTable(
      'notifications',
      () =>
        supabase
          .from('notifications')
          .select('*')
          .eq(
            'user_id',
            currentUser.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
          .limit(50)
    );


  const notifications =
    result?.data || [];


  return shell(`

    <section>

      <h1>
        🔔 Bildirimler
      </h1>

      ${
        notifications.length
          ? notifications
              .map(
                n => `
                  <div class="panel notification">

                    <b>
                      ${safe(n.title || 'Bildirim')}
                    </b>

                    <p>
                      ${safe(n.content || '')}
                    </p>

                    <small>
                      ${dateText(n.created_at)}
                    </small>

                  </div>
                `
              )
              .join('')
          : `
            <div class="empty">
              Henüz bildiriminiz yok.
            </div>
          `
      }

    </section>

  `);

}


/* =========================================================
   PREMIUM
   ========================================================= */

async function premiumPage() {

  return shell(`

    <section>

      <div class="premiumHero">

        <h1>
          💎 PazarElden Premium
        </h1>

        <p>
          İlanlarınızı daha görünür hale getirin.
        </p>

        <div class="premiumPrice">
          99 TL / Ay
        </div>

        <button
          onclick="startPremium()"
        >
          💎 Premium Üyeliği Başlat
        </button>

      </div>


      <div class="premiumFeatures">

        <article>
          💎
          <h3>
            Premium İlanlar
          </h3>
          <p>
            Ana sayfada özel görünüm.
          </p>
        </article>

        <article>
          🚀
          <h3>
            Öne Çık
          </h3>
          <p>
            Normal ilanlardan farklı tasarım.
          </p>
        </article>

        <article>
          📢
          <h3>
            Daha Fazla Görünürlük
          </h3>
          <p>
            Premium ilanlar üst bölümde
            gösterilir.
          </p>
        </article>

      </div>

    </section>

  `);

}


window.startPremium =
  async () => {

    if (!currentUser) {
      location.hash = '#/login';
      return;
    }

    alert(
      'Premium ödeme sistemi hazırlanıyor. Ödeme doğrulaması tamamlanmadan Premium üyelik aktif edilmez.'
    );

  };


/* =========================================================
   HAKKIMIZDA
   ========================================================= */

function aboutPage() {

  return shell(`

    <section class="infoPage">

      <h1>
        PazarElden Hakkında
      </h1>

      <h2>
        Kurucu
      </h2>

      <p>
        PazarElden, güvenli ve kontrollü
        ikinci el alışveriş deneyimi oluşturmak
        amacıyla kurulmuştur.
      </p>


      <h2>
        Kuruluş Amacımız
      </h2>

      <p>
        Alıcı ve satıcıların güvenli,
        şeffaf ve kolay bir ortamda
        buluşmasını sağlamak.
      </p>


      <h2>
        Misyonumuz
      </h2>

      <p>
        Kullanıcı güvenliğini merkeze alan,
        adil ve kullanıcı dostu bir ikinci el
        alışveriş platformu oluşturmak.
      </p>


      <h2>
        Vizyonumuz
      </h2>

      <p>
        Türkiye'nin güvenilir,
        şeffaf ve kullanıcı odaklı
        ikinci el pazarlarından biri olmak.
      </p>

    </section>

  `);

}


/* =========================================================
   SITE KURALLARI
   ========================================================= */

function rulesPage() {

  return shell(`

    <section class="infoPage">

      <h1>
        PazarElden Site Kuralları
      </h1>

      <ol>

        <li>
          Yasadışı ürün ve hizmetlerin ilanı yasaktır.
        </li>

        <li>
          Müstehcen, pornografik veya uygunsuz
          görsel ve içerikler yasaktır.
        </li>

        <li>
          Küfür, hakaret, tehdit ve
          ayrımcı ifadeler yasaktır.
        </li>

        <li>
          Başka kişilerin telefon numarası,
          adresi veya kişisel bilgileri
          izinsiz paylaşılmaz.
        </li>

        <li>
          İlan açıklamasında telefon numarası
          paylaşılması yasaktır.
        </li>

        <li>
          Sahte, yanıltıcı veya dolandırıcılık
          amaçlı ilanlar yasaktır.
        </li>

        <li>
          Aynı ürün için gereksiz şekilde
          tekrar tekrar ilan açılması yasaktır.
        </li>

        <li>
          İlanlar moderasyon kontrolünden
          geçirilebilir.
        </li>

        <li>
          Kurallara aykırı ilanlar yayından
          kaldırılabilir.
        </li>

        <li>
          Tekrarlanan ihlallerde ilan verme,
          mesajlaşma veya hesap kullanımı
          geçici olarak kısıtlanabilir.
        </li>

        <li>
          5 hatalı ilan sonrasında
          72 saat ilan verme cezası
          uygulanabilir.
        </li>

      </ol>

    </section>

  `);

}


/* =========================================================
   GIZLILIK
   ========================================================= */

function privacyPage() {
  return shell(`
    <section class="infoPage">
      <h1>Gizlilik ve Kişisel Verilerin Korunması</h1>
      <p>PazarElden, kullanıcı gizliliğini ve kişisel verilerin korunmasını önemser.</p>

      <h2>Hangi bilgiler kullanılır?</h2>
      <p>Üyelik ve platform kullanımı sırasında ad soyad, e-posta, telefon, profil bilgileri, ilan bilgileri ve platform işlem kayıtları işlenebilir.</p>

      <h2>Telefon ve e-posta gizliliği</h2>
      <p>Telefon numarası ve e-posta adresi herkese açık profilde gösterilmez. İletişim bilgilerinin ilan açıklamalarında veya herkese açık alanlarda paylaşılması sınırlandırılabilir.</p>

      <h2>Herkese açık profil</h2>
      <p>Profil adı, kullanıcının kendi isteğiyle eklediği Hakkımda açıklaması, şehir ve ilçe bilgisi, profil fotoğrafı, üyelik bilgisi ve aktif ilanlar diğer kullanıcılar tarafından görülebilir.</p>

      <h2>Bilgilerin kullanım amaçları</h2>
      <p>Bilgiler; üyelik işlemleri, ilan ve mesajlaşma özellikleri, güvenlik, kötüye kullanımın önlenmesi, moderasyon, kullanıcı desteği ve platformun geliştirilmesi amacıyla kullanılabilir.</p>

      <h2>Güvenlik</h2>
      <p>PazarElden, kullanıcı bilgilerinin yetkisiz erişim ve kötüye kullanıma karşı korunması için teknik ve idari güvenlik önlemleri uygular ve geliştirmeye devam eder.</p>

      <h2>Kullanıcı hakları</h2>
      <p>Kullanıcılar yürürlükteki mevzuat kapsamında kişisel verileriyle ilgili bilgi talep etme ve kendilerine tanınan diğer yasal hakları kullanma hakkına sahiptir.</p>

      <h2>Güncellemeler</h2>
      <p>Bu metin, platformdaki özellikler ve yasal gereklilikler doğrultusunda güncellenebilir.</p>

      <p><small>Bu sayfa bilgilendirme amaçlı taslak metindir. Ticari kullanıma geçmeden önce KVKK ve ilgili mevzuat açısından hukuk uzmanı tarafından gözden geçirilmelidir.</small></p>
    </section>
  `);
}


/* =========================================================
   DESTEK
   ========================================================= */

function supportPage() {

  return shell(`

    <section class="supportPage">

      <h1>
        💬 Destek
      </h1>

      <div class="panel">

        <h3>
          Canlı Destek
        </h3>

        <p>
          Admin veya moderasyon ekibine
          ulaşabilirsiniz.
        </p>

        <button
          onclick="location.hash='#/messages'"
        >
          💬 Destek Mesajı Gönder
        </button>

      </div>

    </section>

  `);

}


/* =========================================================
   ARAMA SAYFASI
   ========================================================= */

async function searchPage() {

  const params =
    new URLSearchParams(
      location.hash.split('?')[1] || ''
    );

  const q =
    params.get('q') || '';


  const listings =
    await getListings(q);


  return shell(`

    <section>

      <h1>
        🔎 Arama Sonuçları
      </h1>

      <p>
        "${safe(q)}" için sonuçlar
      </p>

      <div class="grid">

        ${
          listings.length
            ? listings
                .map(card)
                .join('')
            : `
              <div class="empty">
                Sonuç bulunamadı.
              </div>
            `
        }

      </div>

    </section>

  `);

}


/* =========================================================
   TAKİPLER
   ========================================================= */

async function followingPage() {

  if (!currentUser) {

    location.hash =
      '#/login';

    return shell(`
      <div class="panel">
        Giriş yapmanız gerekiyor.
      </div>
    `);

  }


  const result =
    await safeTable(
      'listing_follows',
      () =>
        supabase
          .from('listing_follows')
          .select('listing_id')
          .eq(
            'user_id',
            currentUser.id
          )
    );


  const ids =
    (result?.data || [])
      .map(x => x.listing_id);


  let listings = [];


  if (ids.length) {

    const r =
      await supabase
        .from('listings')
        .select(`
          *,
          listing_images(image_url)
        `)
        .in('id', ids)
        .eq(
          'status',
          'active'
        );

    listings =
      r.data || [];

  }


  return shell(`

    <section>

      <h1>
        🔔 Takip Ettiklerim
      </h1>

      <div class="grid">

        ${
          listings.length
            ? listings.map(card).join('')
            : `
              <div class="empty">
                Henüz takip ettiğiniz ilan yok.
              </div>
            `
        }

      </div>

    </section>

  `);

}


/* =========================================================
   ÇIKIŞ
   ========================================================= */

window.logout =
  async () => {

    if (!supabase) return;

    await supabase.auth.signOut();

    currentUser = null;
    currentProfile = null;

    location.hash =
      '#/';

    await render();

  };


/* =========================================================
   AUTH
   ========================================================= */

function auth(kind) {

  const login =
    kind === 'login';
  const authParams = new URLSearchParams((location.hash.split('?')[1] || ''));
  const referralCode = authParams.get('ref') || '';


  return shell(`

    <div class="auth panel">

      <h1>${login ? 'Giriş Yap' : 'PazarElden’e Üye Ol'}</h1>
      ${!login ? '<p class="signupIntro">Ücretsiz hesabını oluştur, ilan ver ve favorilerini kolayca takip et.</p>' : ''}


      ${
        !login
          ? `
            <input
              id="fullName"
              placeholder="Ad Soyad"
            >

            <input
              id="phone"
              type="tel"
              placeholder="Telefon numarası"
              required
            >

            <small>
              Telefon numaranız diğer kullanıcılara
              gösterilmez.
            </small>
          `
          : ''
      }


      <input
        id="email"
        type="email"
        placeholder="E-posta"
      >


      <input
        id="pass"
        type="password"
        placeholder="Şifre"
      >


      ${
        !login
          ? `
            <label>

              <input
                id="consent"
                type="checkbox"
              >

              <a href="#/privacy">Gizlilik metnini</a> ve
              <a href="#/rules">site kurallarını</a>
              okudum, kabul ediyorum.

            </label>
          `
          : ''
      }


      <button
        onclick="
          doAuth('${kind}')
        "
      >

        ${
          login
            ? 'Giriş Yap'
            : 'Ücretsiz Hesap Oluştur'
        }

      </button>


      ${!login && referralCode ? '<input id="referralCode" type="hidden" value="' + safe(referralCode) + '"><small>🎁 Davet bağlantısı algılandı. Üyeliğiniz davet eden kişiye bağlanacak.</small>' : ''}
      <p id="authMsg"></p>

    </div>

  `);

}


window.doAuth =
  async kind => {

    if (!supabase) {

      alert(
        'Supabase bağlantısı bulunamadı.'
      );

      return;
    }


    const email =
      document.querySelector('#email')
        ?.value.trim();

    const password =
      document.querySelector('#pass')
        ?.value;


    if (!email || !password) {

      document.querySelector(
        '#authMsg'
      ).textContent =
        'E-posta ve şifre zorunludur.';

      return;
    }


    if (kind === 'signup') {

      const fullName =
        document.querySelector('#fullName')
          ?.value.trim();

      const phone =
        document.querySelector('#phone')
          ?.value.trim();

      const consent =
        document.querySelector('#consent')
          ?.checked;


      if (!fullName) {

        document.querySelector(
          '#authMsg'
        ).textContent =
          'Ad soyad zorunludur.';

        return;
      }


      if (!phone) {

        document.querySelector(
          '#authMsg'
        ).textContent =
          'Telefon numarası zorunludur.';

        return;
      }


      if (!consent) {

        document.querySelector(
          '#authMsg'
        ).textContent =
          'Kişisel rıza ve site kurallarını kabul etmelisiniz.';

        return;
      }


      const result =
        await supabase.auth.signUp({

          email,

          password,

          options: {
            data: {
              full_name:
                fullName,

              phone: phone,
              terms_accepted: true,
              rules_accepted: true,
              privacy_acknowledged: true
            }
          }

        });


      if (result.error) {

        document.querySelector(
          '#authMsg'
        ).textContent =
          result.error.message;

        return;
      }


      if (result.data.user) {

        await supabase
          .from('profiles')
          .upsert({

            id:
              result.data.user.id,

            full_name:
              fullName

          });

      }


      const referralCode = document.querySelector('#referralCode')?.value;
      if (referralCode && result.data.session) {
        await supabase.rpc('register_referral', { p_code: referralCode });
      } else if (referralCode) {
        localStorage.setItem('pendingReferralCode', referralCode);
      }

      document.querySelector('#authMsg').textContent =
        'Kayıt oluşturuldu. E-posta doğrulamanızı kontrol edin.';
      return;

    }


    const result =
      await supabase.auth
        .signInWithPassword({

          email,

          password

        });


    if (result.error) {

      document.querySelector(
        '#authMsg'
      ).textContent =
        result.error.message;

      return;
    }


    const pendingReferral = localStorage.getItem('pendingReferralCode');
    if (pendingReferral) {
      const refResult = await supabase.rpc('register_referral', { p_code: pendingReferral });
      if (!refResult.error) localStorage.removeItem('pendingReferralCode');
    }

    const afterAuth = sessionStorage.getItem('afterAuth');
    if (afterAuth) {
      sessionStorage.removeItem('afterAuth');
      location.hash = afterAuth;
    } else {
      location.hash = '#/';
    }

  };


/* =========================================================
   ADMIN KONTROL
   ========================================================= */

async function adminPage() {
  if (!currentProfile?.is_admin) {
    return shell('<div class="panel"><h1>Yetkisiz Alan</h1></div>');
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, city, role, is_admin, is_moderator, premium_until, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: pending } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const { data: memberOverview } = await supabase.rpc('admin_member_overview');
  const memberMap = new Map((memberOverview || []).map(x => [x.user_id, x]));

  const { data: allListings } = await supabase
    .from('listings')
    .select('id, title, status, price, city, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(50);

    const allUsers = users || [];
  const now = Date.now();
  const startToday = new Date(); startToday.setHours(0,0,0,0);
  const todayCount = allUsers.filter(u => new Date(u.created_at).getTime() >= startToday.getTime()).length;
  const weekCount = allUsers.filter(u => new Date(u.created_at).getTime() >= now - 7*24*60*60*1000).length;
  const newUsers = allUsers.slice(0, 12);
  const lastSeenMemberAt = localStorage.getItem('adminLastSeenMemberAt');
  const unseenUsers = lastSeenMemberAt
    ? allUsers.filter(u => new Date(u.created_at).getTime() > new Date(lastSeenMemberAt).getTime())
    : [];
  const newestMemberAt = allUsers[0]?.created_at || null;

  setTimeout(() => {
    if (newestMemberAt) localStorage.setItem('adminLastSeenMemberAt', newestMemberAt);
  }, 0);

  return shell(`
    <section class="adminMembers">
      <div class="adminHeader">
        <h1>👑 Yönetim Paneli</h1>
        <p>Üyeleri, yeni kayıtları ve moderasyon işlemlerini tek yerden takip edin.</p>
      </div>

      ${unseenUsers.length ? `
        <div class="newMemberNotice">
          <span class="newMemberPulse">●</span>
          <div><strong>${unseenUsers.length} yeni üye kaydı</strong><small>Son kontrolünüzden sonra PazarElden'e yeni üye katıldı.</small></div>
          <a href="#adminNewMembers">Üyeleri Gör ↓</a>
        </div>
      ` : ''}

      <div class="adminModuleNav">
        <a href="#adminNewMembers">👥 Üyeler</a>
        <a href="#adminModeration">🛡️ Moderasyon</a>
        <a href="#adminListings">📦 İlan Yönetimi</a>
      </div>

            <div class="adminGrid memberStats">
        <div class="adminStat">👥<b>${allUsers.length}</b><span>Toplam Üye</span></div>
        <div class="adminStat">🆕<b>${todayCount}</b><span>Bugün Katılan</span></div>
        <div class="adminStat">📅<b>${weekCount}</b><span>Son 7 Gün</span></div>
        <div class="adminStat">📢<b>${pending?.length || 0}</b><span>Bekleyen İlan</span></div>
      </div>

      <div class="sectionHead adminSectionHead" id="adminNewMembers">
        <div><small class="sectionLabel">ÜYE TAKİBİ</small><h2>Son Üyeler</h2></div>
      </div>
      <div class="panel memberTableWrap">
        <div class="memberTable">
          <div class="memberTableHead"><span>Üye</span><span>Konum</span><span>Durum</span><span>Katılım</span></div>
          ${newUsers.length ? newUsers.map(u => {
            const premium = u.premium_until && new Date(u.premium_until).getTime() > Date.now();
            const role = u.is_admin ? '👑 Yönetici' : (u.is_moderator ? '🛡️ Moderatör' : (premium ? '💎 Premium' : 'Üye'));
            return '<a class="memberRow" href="#/seller/' + u.id + '">' +
              '<span><b>' + safe(u.full_name || 'PazarElden Üyesi') + '</b></span>' +
              '<span>' + safe(u.city || 'Belirtilmedi') + '</span>' +
              '<span>' + role + '</span>' +
              '<span>' + safe(dateText(u.created_at)) + '</span>' +
            '</a>';
          }).join('') : '<div class="empty">Henüz üye bulunmuyor.</div>'}
        </div>
      </div>

      <div class="sectionHead adminSectionHead" id="adminModeration">
        <div><small class="sectionLabel">MODERASYON</small><h2>Bekleyen İlanlar</h2></div>
      </div>
      ${pending?.length ? pending.map(x => `
        <div class="panel">
          <h3>${safe(x.title)}</h3>
          <p>${safe(x.description || '')}</p>
          <button onclick="approveListing('${x.id}')">✅ Onayla</button>
          <button onclick="rejectListing('${x.id}')">❌ Reddet</button>
          <button class="dangerBtn" onclick="deleteListing('${x.id}')">🗑️ Kalıcı Sil</button>
        </div>
      `).join('') : '<div class="empty">Bekleyen ilan bulunmuyor.</div>'}

      <div class="sectionHead adminSectionHead" id="adminListings">
        <div><small class="sectionLabel">YÖNETİCİ MODÜLÜ</small><h2>İlan Yönetimi</h2></div>
      </div>
      <div class="panel adminListingManager">
        ${(allListings || []).length ? allListings.map(x => `
          <div class="adminListingRow">
            <div><b>${safe(x.title)}</b><small>${safe(x.status)} • ${money(x.price)} • ${safe(x.city || '')}</small></div>
            <div class="adminListingActions">
              <a href="#/listing/${x.id}">Görüntüle</a>
              <button class="dangerBtn" onclick="deleteListing('${x.id}')">🗑️ Kalıcı Sil</button>
            </div>
          </div>
        `).join('') : '<div class="empty">İlan bulunmuyor.</div>'}
      </div>
    </section>
  `);
}


window.approveListing =
  async id => {

    const { error } = await supabase.rpc(
      'approve_listing',
      { p_listing_id: id }
    );

    if (error) {
      alert('İlan onaylanamadı: ' + error.message);
      return;
    }

    await render();

  };


window.rejectListing =
  async id => {

    const reason = prompt('Reddetme nedenini yazın:');
    if (!reason?.trim()) return;

    const { error } = await supabase.rpc(
      'reject_listing',
      {
        p_listing_id: id,
        p_reason: reason.trim()
      }
    );

    if (error) {
      alert('İlan reddedilemedi: ' + error.message);
      return;
    }

    await render();

  };


/* =========================================================
   ROUTER
   ========================================================= */

async function render() {

  await loadSession();


  const path =
    location.hash.replace(
      '#',
      ''
    ) || '/';


  let html;


  if (path === '/') {

    html =
      await home();


  } else if (
    path === '/ilan-ver' ||
    path === '/new'
  ) {

    if (!currentUser) {

      sessionStorage.setItem('afterAuth', '#/ilan-ver');
      location.hash = '#/signup';

      return;
    }

    html =
      newListing();


  } else if (
    path.startsWith('/listing/')
  ) {

    html =
      await listing(
        path.split('/')[2]
      );


  } else if (
    path.startsWith('/search')
  ) {

    html =
      await searchPage();


  } else if (
    path === '/categories'
  ) {

    html =
      categoriesPage();


  } else if (
    path === '/profile'
  ) {

    html =
      await profilePage();


  } else if (
    path.startsWith('/seller/')
  ) {

    html =
      await sellerPage(
        path.split('/')[2]
      );


  } else if (
    path === '/favorites'
  ) {

    html =
      await favoritesPage();


  } else if (
    path === '/following'
  ) {

    html =
      await followingPage();


  } else if (
    path.startsWith('/messages')
  ) {

    html =
      await messagesPage();


  } else if (
    path === '/notifications'
  ) {

    html =
      await notificationsPage();


  } else if (
    path === '/premium'
  ) {

    html =
      await premiumPage();


  } else if (
    path === '/about'
  ) {

    html =
      aboutPage();


  } else if (
    path === '/rules'
  ) {

    html =
      rulesPage();


  } else if (
    path === '/privacy'
  ) {

    html =
      privacyPage();


  } else if (
    path === '/support'
  ) {

    html =
      supportPage();


  } else if (
    path === '/admin'
  ) {

    html =
      await adminPage();


  } else if (
    path === '/login'
  ) {

    html =
      auth('login');


  } else if (
    path === '/signup' ||
    path.startsWith('/signup?')
  ) {

    html =
      auth('signup');


  } else {

    html =
      shell(`

        <div class="panel">

          <h1>
            Sayfa bulunamadı
          </h1>

          <a href="#/">
            Ana sayfaya dön
          </a>

        </div>

      `);

  }


  const app =
    document.querySelector(
      '#app'
    );


  if (app) {

    app.innerHTML =
      html;

  }

}


/* =========================================================
   AUTH DEĞİŞİKLİĞİ
   ========================================================= */

if (supabase) {

  supabase.auth.onAuthStateChange(
    () => {

      setTimeout(
        render,
        0
      );

    }
  );

}


window.addEventListener(
  'hashchange',
  render
);


/* =========================================================
   BAŞLAT
   ========================================================= */

render();
