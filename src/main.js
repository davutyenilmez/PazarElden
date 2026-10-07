import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cfg = window.PAZARELDEN_CONFIG || {};

const supabase =
  cfg.supabaseUrl && cfg.supabaseAnonKey
    ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;

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

let currentUser = null;
let currentProfile = null;
let currentActiveListingCount = 0;

/* ------------------------------------------------
   YARDIMCI FONKSİYONLAR
------------------------------------------------ */

function safe(value = '') {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(number);
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

async function loadSession() {
  if (!supabase) return;

  const { data } = await supabase.auth.getSession();

  currentUser = data?.session?.user || null;
  currentProfile = null;
  currentActiveListingCount = 0;

  if (currentUser) {
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
}

function userName() {
  if (currentProfile?.full_name?.trim()) {
    return currentProfile.full_name.trim();
  }

  return 'Profilim';
}

/* ------------------------------------------------
   20 KADEMELİ ROZET SİSTEMİ
   HER 5 AKTİF İLAN = 1 KADEME
------------------------------------------------ */

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
  '🏆',
  '👑',
  '👑',
  '🔥',
  '🌟',
  '💫'
];

function rankInfo(activeCount = 0, isAdmin = false) {
  if (isAdmin) {
    return {
      name: 'PazarElden Yöneticisi',
      icon: '👑',
      level: 'Yönetici'
    };
  }

  if (activeCount < 5) {
    return {
      name: 'Yeni Üye',
      icon: '🌱',
      level: 0
    };
  }

  const level = Math.min(
    20,
    Math.floor(activeCount / 5)
  );

  return {
    name: rankNames[level - 1],
    icon: rankIcons[level - 1],
    level
  };
}

function rankBadge(activeCount = 0, isAdmin = false) {
  const rank = rankInfo(
    activeCount,
    isAdmin
  );

  return `
    <span class="rankBadge">
      ${rank.icon} ${safe(rank.name)}
    </span>
  `;
}

/* ------------------------------------------------
   SAYFA İSKELETİ
------------------------------------------------ */

function shell(content) {
  const rank = rankInfo(
    currentActiveListingCount,
    currentProfile?.is_admin === true
  );

  const accountNav = currentUser
    ? `
      <div class="accountWrap">

        <button
          class="accountButton"
          onclick="toggleAccountMenu(event)"
        >
          <span class="accountAvatar">
            👤
          </span>

          <span class="accountText">
            <b>${safe(userName())}</b>

            <small>
              ${rank.icon}
              ${safe(rank.name)}
            </small>
          </span>

          <span class="accountArrow">
            ▾
          </span>
        </button>

        <div
          id="accountMenu"
          class="accountMenu"
        >

          <div class="accountMenuHead">
            <b>${safe(userName())}</b>

            ${rankBadge(
              currentActiveListingCount,
              currentProfile?.is_admin === true
            )}

            <small>
              ${currentActiveListingCount}
              aktif ilan
            </small>
          </div>

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
      <a href="#/login">
        Giriş Yap
      </a>

      <a href="#/signup">
        Üye Ol
      </a>
    `;

  return `
    <style>

      .accountWrap {
        position: relative;
        margin-left: 2px;
      }

      .accountButton {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #fff;
        color: #10233f;
        border: 1px solid #e4e9f0;
        border-radius: 10px;
        padding: 7px 10px;
        min-width: 150px;
        box-shadow: none;
      }

      .accountButton:hover {
        background: #f8fafc;
        opacity: 1;
      }

      .accountAvatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: #edf6f7;
      }

      .accountText {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        line-height: 1.15;
      }

      .accountText b {
        font-size: 12px;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .accountText small {
        font-size: 9px;
        color: #6b7788;
        margin-top: 3px;
      }

      .accountArrow {
        font-size: 10px;
        margin-left: auto;
      }

      .accountMenu {
        display: none;
        position: absolute;
        right: 0;
        top: calc(100% + 9px);
        width: 235px;
        background: #fff;
        border: 1px solid #e4e9f0;
        border-radius: 12px;
        box-shadow:
          0 14px 35px
          rgba(15,35,65,.15);
        padding: 7px;
        z-index: 999;
      }

      .accountMenu.open {
        display: block;
      }

      .accountMenuHead {
        padding: 10px 10px 12px;
        border-bottom:
          1px solid #eef1f5;
        margin-bottom: 5px;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .accountMenuHead b {
        font-size: 13px;
      }

      .accountMenuHead small {
        font-size: 10px;
        color: #6b7788;
      }

      .accountMenu a,
      .accountMenu button {
        display: block;
        width: 100%;
        text-align: left;
        padding: 9px 10px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: #10233f;
        font-size: 12px;
        font-weight: 600;
      }

      .accountMenu a:hover,
      .accountMenu button:hover {
        background: #f4f7fa;
        opacity: 1;
      }

      .rankBadge {
        display: inline-flex;
        align-items: center;
        width: max-content;
        padding: 4px 8px;
        border-radius: 999px;
        background: #eef8f8;
        color: #087f87;
        font-size: 10px;
        font-weight: 800;
        border: 1px solid #d4eeee;
      }

      .profileSummary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        padding: 16px;
        border: 1px solid #e4e9f0;
        border-radius: 12px;
        background: #f8fafc;
        margin: 14px 0;
      }

      .profileSummary strong {
        display: block;
        font-size: 16px;
        margin-bottom: 5px;
      }

      .profileStats {
        font-size: 12px;
        color: #6b7788;
      }

      .nameLocked {
        padding: 11px 13px;
        border: 1px solid #e4e9f0;
        background: #f8fafc;
        border-radius: 8px;
        font-weight: 700;
      }

      @media(max-width:900px) {

        .accountText small {
          display: none;
        }

        .accountButton {
          min-width: auto;
        }

        .accountArrow {
          display: none;
        }
      }

    </style>

    <header>

      <a
        class="brand"
        href="#/"
      >
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

        <a href="#/messages">
          ◯ Mesajlarım
        </a>

        <a
          class="cta"
          href="#/ilan-ver"
        >
          + Ücretsiz İlan Ver
        </a>

        ${accountNav}

      </nav>

    </header>

    <main>
      ${content}
    </main>

    <footer>

      <b>PazarElden</b>

      <span>
        İkinci elin güvenli ve kolay pazarı.
      </span>

      <small>
        © 2026 PazarElden
      </small>

    </footer>
  `;
}

window.toggleAccountMenu = event => {
  event?.stopPropagation();

  document
    .querySelector('#accountMenu')
    ?.classList
    .toggle('open');
};

document.addEventListener(
  'click',
  event => {

    const wrap =
      document.querySelector(
        '.accountWrap'
      );

    if (
      wrap &&
      !wrap.contains(event.target)
    ) {
      document
        .querySelector('#accountMenu')
        ?.classList
        .remove('open');
    }
  }
);

window.searchNow = () => {
  const q =
    document
      .querySelector('#q')
      ?.value
      .trim() || '';

  location.hash =
    `#/search?q=${encodeURIComponent(q)}`;
};

/* ------------------------------------------------
   FOTOĞRAFLAR
------------------------------------------------ */

async function firstImage(listingId) {
  if (!supabase) return null;

  const { data } = await supabase
    .from('listing_images')
    .select('image_url')
    .eq('listing_id', listingId)
    .order('sort_order', {
      ascending: true
    })
    .limit(1)
    .maybeSingle();

  return data?.image_url || null;
}

async function addFirstImages(listings = []) {
  return Promise.all(
    listings.map(
      async listing => ({
        ...listing,
        image:
          await firstImage(listing.id)
      })
    )
  );
}

/* ------------------------------------------------
   İLAN KARTI
------------------------------------------------ */

function card(x) {
  return `
    <a
      class="card"
      href="#/listing/${x.id}"
    >

      <div class="pic">

        ${
          x.image
            ? `
              <img
                src="${safe(x.image)}"
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
              ? ` / ${safe(x.district)}`
              : ''
          }
        </span>

      </div>

    </a>
  `;
}

/* ------------------------------------------------
   İLANLARI GETİR
------------------------------------------------ */

async function getListings({
  q = '',
  category = ''
} = {}) {

  if (!supabase) return [];

  let query = supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', {
      ascending: false
    });

  if (q) {
    query = query.ilike(
      'title',
      `%${q}%`
    );
  }

  if (category) {
    query = query.eq(
      'category',
      category
    );
  }

  const { data, error } =
    await query;

  if (error) {
    console.error(error);
    return [];
  }

  return addFirstImages(
    data || []
  );
}

/* ------------------------------------------------
   ANA SAYFA
------------------------------------------------ */

async function home() {
  const listings =
    await getListings();

  return shell(`
    <section class="hero">

      <div>

        <h1>
          İkinci elin
          <em>
            güvenli ve kolay pazarı.
          </em>
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

        ${cats.map(
          (cat, i) => `
            <a
              href="#/category/${encodeURIComponent(cat)}"
            >
              <i>
                ${icons[i]}
              </i>

              <b>
                ${safe(cat)}
              </b>
            </a>
          `
        ).join('')}

      </div>

    </section>

    <section>

      <div class="sectionHead">

        <h2>
          Son İlanlar
        </h2>

        <span>
          ${listings.length} ilan
        </span>

      </div>

      <div class="grid">

        ${
          listings.length
            ? listings
                .slice(0, 20)
                .map(card)
                .join('')
            : `
              <div class="empty">
                Henüz ilan bulunmuyor.
              </div>
            `
        }

      </div>

    </section>

    <section class="trust">

      <div>

        <article>
          🔒
          <b>Güvenli</b>
          <p>
            Kullanıcı odaklı pazar yeri.
          </p>
        </article>

        <article>
          💬
          <b>Kolay İletişim</b>
          <p>
            Satıcıyla doğrudan mesajlaş.
          </p>
        </article>

        <article>
          ♡
          <b>Favoriler</b>
          <p>
            Beğendiğin ilanları sakla.
          </p>
        </article>

      </div>

    </section>
  `);
}

/* ------------------------------------------------
   ARAMA
------------------------------------------------ */

async function searchPage() {
  const raw =
    location.hash.split('?')[1] || '';

  const params =
    new URLSearchParams(raw);

  const q =
    params.get('q') || '';

  const listings =
    await getListings({ q });

  return shell(`
    <section>

      <div class="sectionHead">

        <h1>
          Arama Sonuçları
        </h1>

        <span>
          ${listings.length} ilan
        </span>

      </div>

      ${
        q
          ? `
            <p>
              "<b>${safe(q)}</b>"
              için sonuçlar
            </p>
          `
          : ''
      }

      <div class="grid">

        ${
          listings.length
            ? listings
                .map(card)
                .join('')
            : `
              <div class="empty">
                Aramanıza uygun ilan bulunamadı.
              </div>
            `
        }

      </div>

    </section>
  `);
}

/* ------------------------------------------------
   KATEGORİ
------------------------------------------------ */

async function categoryPage(category) {
  const listings =
    await getListings({
      category
    });

  return shell(`
    <section>

      <div class="sectionHead">

        <h1>
          ${safe(category)}
        </h1>

        <span>
          ${listings.length} ilan
        </span>

      </div>

      <div class="grid">

        ${
          listings.length
            ? listings
                .map(card)
                .join('')
            : `
              <div class="empty">
                Bu kategoride henüz ilan yok.
              </div>
            `
        }

      </div>

    </section>
  `);
}

/* ------------------------------------------------
   FAVORİ KONTROLÜ
------------------------------------------------ */

async function isFavorite(listingId) {
  if (
    !currentUser ||
    !supabase
  ) {
    return false;
  }

  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq(
      'user_id',
      currentUser.id
    )
    .eq(
      'listing_id',
      listingId
    )
    .maybeSingle();

  return !!data;
}

window.toggleFavorite =
  async listingId => {

    if (!currentUser) {
      location.hash = '#/login';
      return;
    }

    const favorite =
      await isFavorite(listingId);

    if (favorite) {

      await supabase
        .from('favorites')
        .delete()
        .eq(
          'user_id',
          currentUser.id
        )
        .eq(
          'listing_id',
          listingId
        );

    } else {

      await supabase
        .from('favorites')
        .insert({
          user_id:
            currentUser.id,

          listing_id:
            listingId
        });
    }

    await render();
  };

/* ------------------------------------------------
   İLAN DETAY
------------------------------------------------ */

async function listingDetail(id) {
  if (!supabase) {
    return shell(`
      <section>
        <div class="empty">
          Bağlantı kurulamadı.
        </div>
      </section>
    `);
  }

  const { data: x, error } =
    await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

  if (
    error ||
    !x ||
    x.status === 'deleted'
  ) {
    return shell(`
      <section>
        <div class="empty">
          İlan bulunamadı.
        </div>
      </section>
    `);
  }

  const { data: images } =
    await supabase
      .from('listing_images')
      .select('*')
      .eq('listing_id', id)
      .order('sort_order', {
        ascending: true
      });

  let sellerName =
    'PazarElden kullanıcısı';

  let sellerIsAdmin = false;
  let sellerActiveCount = 0;

  if (x.user_id) {

    const { data: seller } =
      await supabase
        .from('profiles')
        .select(
          'full_name,is_admin'
        )
        .eq(
          'id',
          x.user_id
        )
        .maybeSingle();

    if (seller?.full_name) {
      sellerName =
        seller.full_name;
    }

    sellerIsAdmin =
      seller?.is_admin === true;

    const { count } =
      await supabase
        .from('listings')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        )
        .eq(
          'user_id',
          x.user_id
        )
        .eq(
          'status',
          'active'
        );

    sellerActiveCount =
      count || 0;
  }

  const own =
    currentUser?.id ===
    x.user_id;

  const favorite =
    own
      ? false
      : await isFavorite(id);

  return shell(`
    <section>

      <div class="detail">

        <div>

          <div class="gallery">

            ${
              images?.length
                ? images.map(
                    image => `
                      <img
                        src="${safe(image.image_url)}"
                        alt="${safe(x.title)}"
                      >
                    `
                  ).join('')
                : `
                  <div class="noimg">
                    📷
                  </div>
                `
            }

          </div>

          <div
            class="panel"
            style="
              width:100%;
              margin-top:20px
            "
          >

            <h2>
              İlan Açıklaması
            </h2>

            <p>
              ${safe(x.description || 'Açıklama eklenmemiş.')}
            </p>

          </div>

        </div>

        <aside>

          <h1>
            ${safe(x.title)}
          </h1>

          <div class="price">
            ${money(x.price)}
          </div>

          <p>
            <b>Konum:</b>
            ${safe(x.city || '')}
            ${
              x.district
                ? ` / ${safe(x.district)}`
                : ''
            }
          </p>

          <p>
            <b>Durum:</b>
            ${safe(x.condition || '')}
          </p>

          <p>
            <b>Satıcı</b>
          </p>

          <p>
            ${safe(sellerName)}
          </p>

          <p>
            ${rankBadge(
              sellerActiveCount,
              sellerIsAdmin
            )}

            <small>
              ${sellerActiveCount}
              aktif ilan
            </small>
          </p>

          ${
            own
              ? `
                <p>
                  Bu ilan size ait.
                </p>

                <button
                  class="wide"
                  onclick="deleteListing('${x.id}')"
                >
                  İlanı Sil
                </button>
              `
              : `
                <button
                  class="wide"
                  onclick="toggleFavorite('${x.id}')"
                >
                  ${
                    favorite
                      ? '♥ Favorilerden Çıkar'
                      : '♡ Favorilere Ekle'
                  }
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

/* ------------------------------------------------
   İLAN SİL
------------------------------------------------ */

window.deleteListing =
  async listingId => {

    if (!currentUser) return;

    const ok = confirm(
      'Bu ilanı silmek istediğinize emin misiniz?'
    );

    if (!ok) return;

    const { error } =
      await supabase
        .from('listings')
        .update({
          status: 'deleted'
        })
        .eq('id', listingId)
        .eq(
          'user_id',
          currentUser.id
        );

    if (error) {
      alert(
        'İlan silinemedi: ' +
        error.message
      );

      return;
    }

    await loadSession();

    location.hash =
      '#/profile';
  };

/* ------------------------------------------------
   GİRİŞ / ÜYELİK
------------------------------------------------ */

function auth(kind) {
  return shell(`
    <div class="auth panel">

      <h1>
        ${
          kind === 'login'
            ? 'Giriş Yap'
            : 'Üye Ol'
        }
      </h1>

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

      <button
        onclick="doAuth('${kind}')"
      >
        ${
          kind === 'login'
            ? 'Giriş Yap'
            : 'Hesap Oluştur'
        }
      </button>

      ${
        kind === 'signup'
          ? `
            <p>
              Hesabınızı oluşturduktan sonra
              profil adınızı bir kez
              belirleyebilirsiniz.
            </p>
          `
          : ''
      }

      <p id="authMsg"></p>

    </div>
  `);
}

window.doAuth =
  async kind => {

    if (!supabase) return;

    const email =
      document
        .querySelector('#email')
        ?.value
        .trim();

    const password =
      document
        .querySelector('#pass')
        ?.value;

    const msg =
      document
        .querySelector('#authMsg');

    if (
      !email ||
      !password
    ) {
      msg.textContent =
        'E-posta ve şifreyi girin.';

      return;
    }

    msg.textContent =
      'İşlem yapılıyor...';

    if (kind === 'login') {

      const { data, error } =
        await supabase.auth
          .signInWithPassword({
            email,
            password
          });

      if (error) {
        msg.textContent =
          error.message;

        return;
      }

      currentUser =
        data.user;

      await loadSession();

      location.hash =
        '#/';

      await render();

      return;
    }

    const { data, error } =
      await supabase.auth
        .signUp({
          email,
          password
        });

    if (error) {
      msg.textContent =
        error.message;

      return;
    }

    if (
      data.user &&
      data.session
    ) {

      const { data: existing } =
        await supabase
          .from('profiles')
          .select('id')
          .eq(
            'id',
            data.user.id
          )
          .maybeSingle();

      if (!existing) {

        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: ''
          });
      }
    }

    msg.textContent =
      'Kayıt oluşturuldu. Giriş yaptıktan sonra profil adınızı bir kez belirleyebilirsiniz.';
  };

window.logout =
  async () => {

    if (supabase) {
      await supabase.auth
        .signOut();
    }

    currentUser = null;
    currentProfile = null;
    currentActiveListingCount = 0;

    location.hash =
      '#/';

    await render();
  };

/* ------------------------------------------------
   PROFİL
------------------------------------------------ */

async function profilePage() {
  if (!currentUser) {
    location.hash =
      '#/login';

    return '';
  }

  const { data } =
    await supabase
      .from('listings')
      .select('*')
      .eq(
        'user_id',
        currentUser.id
      )
      .eq(
        'status',
        'active'
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );

  const myListings =
    await addFirstImages(
      data || []
    );

  const activeCount =
    myListings.length;

  const isAdmin =
    currentProfile?.is_admin === true;

  const chosenName =
    currentProfile
      ?.full_name
      ?.trim() || '';

  const rank =
    rankInfo(
      activeCount,
      isAdmin
    );

  let nextRankText = '';

  if (
    !isAdmin &&
    rank.level < 20
  ) {

    const remaining =
      activeCount < 5
        ? 5 - activeCount
        : 5 - (
            activeCount % 5
          );

    nextRankText =
      ` • Sonraki rozet için ${remaining} ilan`;
  }

  const nameArea =
    isAdmin
      ? `
        <label>
          Profil adı
        </label>

        <input
          id="profileName"
          value="${safe(chosenName)}"
          placeholder="Profil adınız"
        >

        <button
          onclick="saveProfileName()"
        >
          Profil Adını Kaydet
        </button>

        <p id="profileMsg"></p>

        <p>
          👑 Yönetici hesabı olduğunuz
          için profil adınızı istediğiniz
          zaman değiştirebilirsiniz.
        </p>
      `
      : chosenName
        ? `
          <label>
            Profil adı
          </label>

          <div class="nameLocked">
            ${safe(chosenName)} 🔒
          </div>

          <p>
            Profil adınız belirlenmiştir
            ve değiştirilemez.
          </p>
        `
        : `
          <label>
            Profil adı
          </label>

          <input
            id="profileName"
            value=""
            placeholder="Kullanmak istediğiniz profil adı"
          >

          <p>
            Bu adı yalnızca bir kez
            belirleyebilirsiniz.
            Kaydettikten sonra
            değiştirilemez.
          </p>

          <button
            onclick="saveProfileName()"
          >
            Profil Adını Kaydet
          </button>

          <p id="profileMsg"></p>
        `;

  return shell(`
    <section>

      <div class="panel">

        <h1>
          Profilim
        </h1>

        <div class="profileSummary">

          <div>

            <strong>
              ${
                safe(
                  chosenName ||
                  'Profil adınızı belirleyin'
                )
              }
            </strong>

            ${rankBadge(
              activeCount,
              isAdmin
            )}

          </div>

          <div class="profileStats">

            <b>
              ${activeCount}
            </b>

            aktif ilan

            ${nextRankText}

          </div>

        </div>

        <p>
          <b>E-posta:</b>
          ${safe(
            currentUser.email || ''
          )}
        </p>

        ${nameArea}

      </div>

      <div class="sectionHead">

        <h2>
          İlanlarım
        </h2>

        <span>
          ${activeCount}
          aktif ilan
        </span>

      </div>

      <div class="grid">

        ${
          myListings.length
            ? myListings
                .map(card)
                .join('')
            : `
              <div class="empty">
                Henüz aktif ilanınız
                bulunmuyor.
              </div>
            `
        }

      </div>

    </section>
  `);
}

window.saveProfileName =
  async () => {

    if (!currentUser) return;

    const name =
      document
        .querySelector(
          '#profileName'
        )
        ?.value
        .trim();

    const msg =
      document
        .querySelector(
          '#profileMsg'
        );

    const isAdmin =
      currentProfile
        ?.is_admin === true;

    const alreadyChosen =
      !!currentProfile
        ?.full_name
        ?.trim();

    if (!name) {

      if (msg) {
        msg.textContent =
          'Profil adı boş bırakılamaz.';
      }

      return;
    }

    if (
      !isAdmin &&
      alreadyChosen
    ) {

      if (msg) {
        msg.textContent =
          'Profil adınız daha önce belirlenmiş.';
      }

      return;
    }

    if (!isAdmin) {

      const ok =
        confirm(
          `Profil adınız "${name}" olacak. Bu adı daha sonra değiştiremeyeceksiniz. Kaydetmek istiyor musunuz?`
        );

      if (!ok) return;
    }

    let result;

    if (currentProfile) {

      result =
        await supabase
          .from('profiles')
          .update({
            full_name: name
          })
          .eq(
            'id',
            currentUser.id
          );

    } else {

      result =
        await supabase
          .from('profiles')
          .insert({
            id:
              currentUser.id,

            full_name:
              name
          });
    }

    if (result.error) {

      if (msg) {
        msg.textContent =
          'Kaydedilemedi: ' +
          result.error.message;
      }

      return;
    }

    await loadSession();
    await render();
  };

/* ------------------------------------------------
   İLAN VER
------------------------------------------------ */

function newListingPage() {
  if (!currentUser) {
    location.hash =
      '#/login';

    return '';
  }

  return shell(`
    <section>

      <div class="panel">

        <h1>
          Ücretsiz İlan Ver
        </h1>

        <div class="form">

          <label>
            İlan başlığı
          </label>

          <input
            id="listingTitle"
            placeholder="Örn: Temiz iPhone 14"
          >

          <label>
            Kategori
          </label>

          <select id="listingCategory">

            <option value="">
              Kategori seçin
            </option>

            ${cats.map(
              cat => `
                <option
                  value="${safe(cat)}"
                >
                  ${safe(cat)}
                </option>
              `
            ).join('')}

          </select>

          <label>
            Fiyat
          </label>

          <input
            id="listingPrice"
            type="number"
            min="0"
            placeholder="0"
          >

          <label>
            Ürün durumu
          </label>

          <select id="listingCondition">

            <option value="Sıfır">
              Sıfır
            </option>

            <option value="Yeni gibi">
              Yeni gibi
            </option>

            <option value="İyi">
              İyi
            </option>

            <option value="Kullanılmış">
              Kullanılmış
            </option>

          </select>

          <label>
            İl
          </label>

          <input
            id="listingCity"
            placeholder="Örn: Sakarya"
          >

          <label>
            İlçe
          </label>

          <input
            id="listingDistrict"
            placeholder="Örn: Adapazarı"
          >

          <label>
            Açıklama
          </label>

          <textarea
            id="listingDescription"
            placeholder="Ürün hakkında detaylı bilgi verin."
          ></textarea>

          <label>
            Fotoğraflar
          </label>

          <input
            id="listingPhotos"
            type="file"
            accept="image/*"
            multiple
          >

          <button
            onclick="publishListing()"
          >
            İlanı Yayınla
          </button>

          <p id="listingMsg"></p>

        </div>

      </div>

    </section>
  `);
}

window.publishListing =
  async () => {

    if (
      !currentUser ||
      !supabase
    ) {
      location.hash =
        '#/login';

      return;
    }

    const title =
      document
        .querySelector(
          '#listingTitle'
        )
        ?.value
        .trim();

    const category =
      document
        .querySelector(
          '#listingCategory'
        )
        ?.value;

    const price =
      Number(
        document
          .querySelector(
            '#listingPrice'
          )
          ?.value || 0
      );

    const condition =
      document
        .querySelector(
          '#listingCondition'
        )
        ?.value;

    const city =
      document
        .querySelector(
          '#listingCity'
        )
        ?.value
        .trim();

    const district =
      document
        .querySelector(
          '#listingDistrict'
        )
        ?.value
        .trim();

    const description =
      document
        .querySelector(
          '#listingDescription'
        )
        ?.value
        .trim();

    const files =
      Array.from(
        document
          .querySelector(
            '#listingPhotos'
          )
          ?.files || []
      );

    const msg =
      document
        .querySelector(
          '#listingMsg'
        );

    if (
      !title ||
      !category ||
      !price
    ) {

      msg.textContent =
        'Başlık, kategori ve fiyat zorunludur.';

      return;
    }

    msg.textContent =
      'İlan yayınlanıyor...';

    const { data: listing, error } =
      await supabase
        .from('listings')
        .insert({
          user_id:
            currentUser.id,

          title,
          category,
          price,
          condition,
          city,
          district,
          description,

          status:
            'active'
        })
        .select()
        .single();

    if (error) {

      msg.textContent =
        'İlan oluşturulamadı: ' +
        error.message;

      return;
    }

    for (
      let i = 0;
      i < files.length;
      i++
    ) {

      const file =
        files[i];

      const extension =
        file.name
          .split('.')
          .pop() || 'jpg';

      const path =
        `${currentUser.id}/${listing.id}/${Date.now()}-${i}.${extension}`;

      const {
        error: uploadError
      } =
        await supabase
          .storage
          .from(
            'listing-images'
          )
          .upload(
            path,
            file
          );

      if (uploadError) {
        console.error(
          uploadError
        );

        continue;
      }

      const { data: urlData } =
        supabase
          .storage
          .from(
            'listing-images'
          )
          .getPublicUrl(
            path
          );

      await supabase
        .from(
          'listing_images'
        )
        .insert({
          listing_id:
            listing.id,

          image_url:
            urlData.publicUrl,

          sort_order:
            i
        });
    }

    await loadSession();

    location.hash =
      `#/listing/${listing.id}`;
  };

/* ------------------------------------------------
   FAVORİLER
------------------------------------------------ */

async function favoritesPage() {
  if (!currentUser) {
    location.hash =
      '#/login';

    return '';
  }

  const { data: favorites } =
    await supabase
      .from('favorites')
      .select(
        'listing_id'
      )
      .eq(
        'user_id',
        currentUser.id
      );

  const ids =
    (favorites || [])
      .map(
        item =>
          item.listing_id
      );

  if (!ids.length) {
    return shell(`
      <section>

        <div class="sectionHead">
          <h1>Favorilerim</h1>
        </div>

        <div class="empty">
          Henüz favori ilanınız yok.
        </div>

      </section>
    `);
  }

  const { data } =
    await supabase
      .from('listings')
      .select('*')
      .in('id', ids)
      .eq(
        'status',
        'active'
      );

  const listings =
    await addFirstImages(
      data || []
    );

  return shell(`
    <section>

      <div class="sectionHead">

        <h1>
          Favorilerim
        </h1>

        <span>
          ${listings.length}
          ilan
        </span>

      </div>

      <div class="grid">

        ${
          listings.length
            ? listings
                .map(card)
                .join('')
            : `
              <div class="empty">
                Favori ilan bulunamadı.
              </div>
            `
        }

      </div>

    </section>
  `);
}

/* ------------------------------------------------
   MESAJLAR
------------------------------------------------ */

async function messagesPage() {
  if (!currentUser) {
    location.hash =
      '#/login';

    return '';
  }

  const { data, error } =
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

  if (error) {
    return shell(`
      <section>
        <div class="empty">
          Mesajlar yüklenemedi.
        </div>
      </section>
    `);
  }

  const groups =
    new Map();

  for (
    const message of
    data || []
  ) {

    const otherUserId =
      message.sender_id ===
      currentUser.id
        ? message.receiver_id
        : message.sender_id;

    const key =
      `${message.listing_id}:${otherUserId}`;

    if (!groups.has(key)) {
      groups.set(
        key,
        {
          ...message,
          otherUserId
        }
      );
    }
  }

  const conversations = [];

  for (
    const item of
    groups.values()
  ) {

    let name =
      'PazarElden kullanıcısı';

    let title =
      'İlan';

    const { data: profile } =
      await supabase
        .from('profiles')
        .select('full_name')
        .eq(
          'id',
          item.otherUserId
        )
        .maybeSingle();

    if (profile?.full_name) {
      name =
        profile.full_name;
    }

    const { data: listing } =
      await supabase
        .from('listings')
        .select('title')
        .eq(
          'id',
          item.listing_id
        )
        .maybeSingle();

    if (listing?.title) {
      title =
        listing.title;
    }

    conversations.push({
      ...item,
      name,
      title
    });
  }

  return shell(`
    <section>

      <div class="sectionHead">
        <h1>Mesajlarım</h1>
      </div>

      ${
        conversations.length
          ? conversations.map(
              item => `
                <a
                  class="panel"
                  style="
                    display:block;
                    margin:12px auto;
                  "
                  href="#/conversation/${item.listing_id}/${item.otherUserId}"
                >

                  <b>
                    ${safe(item.name)}
                  </b>

                  <p>
                    ${safe(item.title)}
                  </p>

                  <p>
                    ${safe(item.content || '')}
                  </p>

                  <small>
                    ${dateText(item.created_at)}
                  </small>

                </a>
              `
            ).join('')
          : `
            <div class="empty">
              Henüz mesajınız yok.
            </div>
          `
      }

    </section>
  `);
}

/* ------------------------------------------------
   MESAJ BAŞLAT
------------------------------------------------ */

window.startConversation =
  (
    listingId,
    sellerId
  ) => {

    if (!currentUser) {
      location.hash =
        '#/login';

      return;
    }

    if (
      currentUser.id ===
      sellerId
    ) {
      alert(
        'Kendi ilanınıza mesaj gönderemezsiniz.'
      );

      return;
    }

    location.hash =
      `#/conversation/${listingId}/${sellerId}`;
  };

/* ------------------------------------------------
   MESAJLAŞMA
------------------------------------------------ */

async function conversationPage(
  listingId,
  otherUserId
) {

  if (!currentUser) {
    location.hash =
      '#/login';

    return '';
  }

  const { data: listing } =
    await supabase
      .from('listings')
      .select(
        'title,user_id'
      )
      .eq(
        'id',
        listingId
      )
      .maybeSingle();

  const { data: profile } =
    await supabase
      .from('profiles')
      .select('full_name')
      .eq(
        'id',
        otherUserId
      )
      .maybeSingle();

  const { data: messages } =
    await supabase
      .from('messages')
      .select('*')
      .eq(
        'listing_id',
        listingId
      )
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
      )
      .order(
        'created_at',
        {
          ascending: true
        }
      );

  await supabase
    .from('messages')
    .update({
      is_read: true
    })
    .eq(
      'listing_id',
      listingId
    )
    .eq(
      'receiver_id',
      currentUser.id
    )
    .eq(
      'sender_id',
      otherUserId
    );

  const otherName =
    profile?.full_name ||
    'PazarElden kullanıcısı';

  return shell(`
    <section>

      <div class="panel">

        <h1>
          ${safe(otherName)}
        </h1>

        <p>
          <b>İlan:</b>
          ${safe(listing?.title || 'İlan')}
        </p>

        <div
          style="
            display:flex;
            flex-direction:column;
            gap:10px;
            margin:20px 0;
          "
        >

          ${
            messages?.length
              ? messages.map(
                  message => {

                    const mine =
                      message.sender_id ===
                      currentUser.id;

                    return `
                      <div
                        style="
                          max-width:80%;
                          padding:10px 12px;
                          border-radius:10px;
                          ${
                            mine
                              ? 'margin-left:auto;background:#e7f7f7;'
                              : 'margin-right:auto;background:#f0f2f5;'
                          }
                        "
                      >

                        <div>
                          ${safe(message.content || '')}
                        </div>

                        <small>
                          ${dateText(message.created_at)}
                        </small>

                      </div>
                    `;
                  }
                ).join('')
              : `
                <div class="empty">
                  Henüz mesaj yok.
                </div>
              `
          }

        </div>

        <textarea
          id="messageText"
          placeholder="Mesajınızı yazın..."
        ></textarea>

        <button
          class="wide"
          onclick="sendMessage('${listingId}','${otherUserId}')"
        >
          Mesaj Gönder
        </button>

        <p id="messageMsg"></p>

      </div>

    </section>
  `);
}

window.sendMessage =
  async (
    listingId,
    receiverId
  ) => {

    if (!currentUser) return;

    const input =
      document
        .querySelector(
          '#messageText'
        );

    const msg =
      document
        .querySelector(
          '#messageMsg'
        );

    const content =
      input?.value
        .trim();

    if (!content) {

      if (msg) {
        msg.textContent =
          'Mesajınızı yazın.';
      }

      return;
    }

    const { error } =
      await supabase
        .from('messages')
        .insert({
          sender_id:
            currentUser.id,

          receiver_id:
            receiverId,

          listing_id:
            listingId,

          content,

          is_read:
            false
        });

    if (error) {

      if (msg) {
        msg.textContent =
          'Mesaj gönderilemedi: ' +
          error.message;
      }

      return;
    }

    if (input) {
      input.value = '';
    }

    await render();
  };

/* ------------------------------------------------
   ROUTER
------------------------------------------------ */

async function render() {
  const app =
    document
      .querySelector('#app');

  if (!app) return;

  await loadSession();

  const hash =
    location.hash || '#/';

  const route =
    hash
      .replace(/^#/, '')
      .split('?')[0];

  if (
    route === '/' ||
    route === ''
  ) {

    app.innerHTML =
      await home();

    return;
  }

  if (route === '/login') {

    app.innerHTML =
      auth('login');

    return;
  }

  if (route === '/signup') {

    app.innerHTML =
      auth('signup');

    return;
  }

  if (
    route === '/ilan-ver' ||
    route === '/new'
  ) {

    app.innerHTML =
      newListingPage();

    return;
  }

  if (route === '/profile') {

    app.innerHTML =
      await profilePage();

    return;
  }

  if (route === '/favorites') {

    app.innerHTML =
      await favoritesPage();

    return;
  }

  if (route === '/messages') {

    app.innerHTML =
      await messagesPage();

    return;
  }

  if (route === '/search') {

    app.innerHTML =
      await searchPage();

    return;
  }

  if (
    route.startsWith(
      '/category/'
    )
  ) {

    const category =
      decodeURIComponent(
        route.replace(
          '/category/',
          ''
        )
      );

    app.innerHTML =
      await categoryPage(
        category
      );

    return;
  }

  if (
    route.startsWith(
      '/listing/'
    )
  ) {

    const id =
      route.replace(
        '/listing/',
        ''
      );

    app.innerHTML =
      await listingDetail(
        id
      );

    return;
  }

  if (
    route.startsWith(
      '/conversation/'
    )
  ) {

    const parts =
      route
        .replace(
          '/conversation/',
          ''
        )
        .split('/');

    app.innerHTML =
      await conversationPage(
        parts[0],
        parts[1]
      );

    return;
  }

  app.innerHTML =
    shell(`
      <section>
        <div class="empty">
          Sayfa bulunamadı.
        </div>
      </section>
    `);
}

/* ------------------------------------------------
   BAŞLAT
------------------------------------------------ */

if (supabase) {

  supabase.auth
    .onAuthStateChange(
      async () => {
        await loadSession();
      }
    );
}

window.addEventListener(
  'hashchange',
  render
);

render();
