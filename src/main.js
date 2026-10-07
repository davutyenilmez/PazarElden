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
  '🚗','🏠','📱','💻','📺','🛋️',
  '👕','🧸','⚽','🎨','📚','📦'
];

let currentUser = null;
let currentProfile = null;

/* -------------------- YARDIMCI FONKSİYONLAR -------------------- */

function money(v) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(Number(v) || 0);
}

function safe(v = '') {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadSession() {
  if (!supabase) return;

  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user || null;

  if (currentUser) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    currentProfile = profile || null;
  } else {
    currentProfile = null;
  }
}

function userName() {
  if (currentProfile?.full_name) {
    return currentProfile.full_name;
  }

  if (currentUser?.email) {
    return currentUser.email.split('@')[0];
  }

  return 'Profilim';
}

/* -------------------- SAYFA ŞABLONU -------------------- */

function shell(content) {
  const accountNav = currentUser
    ? `
      <a href="#/profile">👤 ${safe(userName())}</a>
      <a href="#" onclick="logout(); return false;">Çıkış Yap</a>
    `
    : `
      <a href="#/login">Giriş Yap</a>
      <a href="#/signup">Üye Ol</a>
    `;

  return `
    <header>
      <a class="brand" href="#/">Pazar<span>Elden</span></a>

      <div class="topsearch">
        <input id="q" placeholder="Ürün, marka veya kategori ara...">
        <button onclick="searchNow()">Ara</button>
      </div>

      <nav>
        <a href="#/favorites">♡ Favorilerim</a>
        <a href="#/messages">◯ Mesajlarım</a>
        ${accountNav}
        <a class="cta" href="#/ilan-ver">+ Ücretsiz İlan Ver</a>
      </nav>
    </header>

    <main>${content}</main>

    <footer>
      <b>PazarElden</b>
      <span>İkinci elin güvenli ve kolay pazarı.</span>
      <small>© 2026 PazarElden</small>
    </footer>
  `;
}

window.searchNow = () => {
  const q = document.querySelector('#q')?.value || '';
  location.hash = '#/search?q=' + encodeURIComponent(q);
};

/* -------------------- İLANLAR -------------------- */

async function getListings(q = '') {
  if (!supabase) return [];

  let query = supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(24);

  if (q) {
    query = query.ilike('title', `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('İlan listeleme hatası:', error);
    return [];
  }

  const listings = data || [];

  for (const item of listings) {
    const { data: images } = await supabase
      .from('listing_images')
      .select('image_url')
      .eq('listing_id', item.id)
      .limit(1);

    item.listing_images = images || [];
  }

  return listings;
}

function card(x) {
  const img = x.listing_images?.[0]?.image_url;

  return `
    <a class="card" href="#/listing/${x.id}">
      <div class="pic">
        ${img
          ? `<img src="${safe(img)}" alt="${safe(x.title)}">`
          : '📷'
        }
      </div>

      <div class="pad">
        <b>${safe(x.title)}</b>
        <strong>${money(x.price)}</strong>
        <span>
          ${safe(x.city || '')}
          ${x.district ? ' / ' + safe(x.district) : ''}
        </span>
      </div>
    </a>
  `;
}

/* -------------------- ANA SAYFA -------------------- */

async function home() {
  const listings = await getListings();

  return shell(`
    <section class="hero">
      <div>
        <h1>
          Aradığın ikinci el ürün
          <em>PazarElden’de</em>
        </h1>

        <p>
          İlanları keşfet, ihtiyacını bul,
          satıcıyla iletişime geç.
        </p>

        <div class="heroSearch">
          <input id="heroQ" placeholder="Ne arıyorsun?">

          <button onclick="
            location.hash='#/search?q='+
            encodeURIComponent(
              document.querySelector('#heroQ').value
            )
          ">
            Ara
          </button>
        </div>
      </div>
    </section>

    <section>
      <h2>Kategoriler</h2>

      <div class="cats">
        ${cats.map((c, i) => `
          <a href="#/search?q=${encodeURIComponent(c)}">
            <i>${icons[i]}</i>
            <b>${c}</b>
          </a>
        `).join('')}
      </div>
    </section>

    <section>
      <div class="sectionHead">
        <h2>Son Eklenen İlanlar</h2>
      </div>

      <div class="grid">
        ${
          listings.length
            ? listings.map(card).join('')
            : `
              <div class="empty">
                Henüz yayınlanmış ilan bulunmuyor.
              </div>
            `
        }
      </div>
    </section>

    <section class="trust">
      <h2>PazarElden ile kolayca al, kolayca sat</h2>

      <div>
        <article>
          🔎
          <b>Kolayca keşfet</b>
          <p>
            Kategoriler ve arama ile
            aradığını hızlıca bul.
          </p>
        </article>

        <article>
          📸
          <b>Ücretsiz ilan ver</b>
          <p>
            Fotoğraflarını yükle,
            ilanını dakikalar içinde yayınla.
          </p>
        </article>

        <article>
          💬
          <b>Doğrudan iletişim</b>
          <p>
            Alıcı ve satıcı mesajlaşma
            sistemiyle görüşsün.
          </p>
        </article>
      </div>
    </section>
  `);
}

/* -------------------- İLAN DETAY -------------------- */

async function listing(id) {
  if (!supabase) {
    return shell(`
      <div class="panel">
        Supabase bağlantısı bulunamadı.
      </div>
    `);
  }

  /*
    ÖNEMLİ:
    İlanı tek başına okuyoruz.
    Fotoğraf ve profil sorgularını ayrı yapıyoruz.
    Böylece ilişkilerden biri hata verse bile ilan kaybolmuyor.
  */

  const { data: x, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('İlan okuma hatası:', error);

    return shell(`
      <div class="panel">
        <h1>İlan açılamadı</h1>
        <p>${safe(error.message)}</p>
        <p><a href="#/">Ana sayfaya dön</a></p>
      </div>
    `);
  }

  if (!x) {
    return shell(`
      <div class="panel">
        <h1>İlan bulunamadı</h1>
        <p>
          Bu ilan silinmiş olabilir veya görüntüleme
          izni bulunmuyor.
        </p>
        <p><a href="#/">Ana sayfaya dön</a></p>
      </div>
    `);
  }

  const { data: images } = await supabase
    .from('listing_images')
    .select('image_url')
    .eq('listing_id', id);

  let sellerName = 'PazarElden kullanıcısı';

  if (x.user_id) {
    const { data: seller } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', x.user_id)
      .maybeSingle();

    if (seller?.full_name) {
      sellerName = seller.full_name;
    }
  }

  return shell(`
    <section class="detail">

      <div class="gallery">
        ${
          images?.length
            ? images
                .map(i => `
                  <img
                    src="${safe(i.image_url)}"
                    alt="${safe(x.title)}"
                  >
                `)
                .join('')
            : '<div class="noimg">📷</div>'
        }
      </div>

      <aside>
        <h1>${safe(x.title)}</h1>

        <div class="price">
          ${money(x.price)}
        </div>

        <p>
          ${safe(x.city || '')}
          ${x.district ? ' / ' + safe(x.district) : ''}
        </p>

        <hr>

        <b>Ürün durumu</b>
        <p>${safe(x.condition || '-')}</p>

        <b>Açıklama</b>
        <p>${safe(x.description || '')}</p>

        <b>Satıcı</b>
        <p>${safe(sellerName)}</p>

        ${
          currentUser && currentUser.id === x.user_id
            ? `
              <p>
                <strong>Bu ilan size ait.</strong>
              </p>
            `
            : `
              <button
                class="wide"
                onclick="messageSeller('${x.id}', '${x.user_id || ''}')"
              >
                Satıcıya Mesaj Gönder
              </button>
            `
        }
      </aside>

    </section>
  `);
}

/* -------------------- ÜYELİK / GİRİŞ -------------------- */

function auth(kind) {
  return shell(`
    <div class="auth panel">

      <h1>
        ${kind === 'login' ? 'Giriş Yap' : 'Üye Ol'}
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

      ${
        kind === 'signup'
          ? `
            <input
              id="fullName"
              type="text"
              placeholder="Ad Soyad"
            >
          `
          : ''
      }

      <button onclick="doAuth('${kind}')">
        ${
          kind === 'login'
            ? 'Giriş Yap'
            : 'Hesap Oluştur'
        }
      </button>

      <p id="authMsg"></p>

    </div>
  `);
}

window.doAuth = async (kind) => {
  if (!supabase) {
    alert('Supabase bağlantısı bulunamadı.');
    return;
  }

  const email =
    document.querySelector('#email')?.value.trim();

  const password =
    document.querySelector('#pass')?.value;

  const msg =
    document.querySelector('#authMsg');

  if (!email || !password) {
    msg.textContent = 'E-posta ve şifreyi girin.';
    return;
  }

  msg.textContent = 'İşlem yapılıyor...';

  if (kind === 'login') {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      msg.textContent = error.message;
      return;
    }

    currentUser = data.user;

    await loadSession();

    location.hash = '#/';
    await render();
    return;
  }

  const fullName =
    document.querySelector('#fullName')?.value.trim() || '';

  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  if (data.user && fullName) {
    await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        full_name: fullName
      });
  }

  msg.textContent =
    'Kayıt oluşturuldu. Gerekirse e-postanızı onaylayın.';
};

window.logout = async () => {
  if (!supabase) return;

  await supabase.auth.signOut();

  currentUser = null;
  currentProfile = null;

  location.hash = '#/';
  await render();
};

/* -------------------- PROFİL -------------------- */

async function profilePage() {
  if (!currentUser) {
    location.hash = '#/login';
    return '';
  }

  const { data: myListings, error } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (!error && myListings) {
    for (const item of myListings) {
      const { data: images } = await supabase
        .from('listing_images')
        .select('image_url')
        .eq('listing_id', item.id)
        .limit(1);

      item.listing_images = images || [];
    }
  }

  return shell(`
    <section>
      <div class="panel">
        <h1>Profilim</h1>

        <p>
          <b>Kullanıcı:</b>
          ${safe(userName())}
        </p>

        <p>
          <b>E-posta:</b>
          ${safe(currentUser.email || '')}
        </p>

        <button onclick="logout()">
          Çıkış Yap
        </button>
      </div>

      <div class="sectionHead">
        <h2>İlanlarım</h2>
      </div>

      <div class="grid">
        ${
          myListings?.length
            ? myListings.map(card).join('')
            : `
              <div class="empty">
                Henüz ilanınız bulunmuyor.
              </div>
            `
        }
      </div>
    </section>
  `);
}

/* -------------------- İLAN VER -------------------- */

function newListing() {
  if (!currentUser) {
    return shell(`
      <div class="panel">
        <h1>İlan vermek için giriş yapın</h1>
        <p>
          İlan yayınlamak için önce hesabınıza giriş yapmanız gerekiyor.
        </p>
        <a href="#/login">Giriş Yap</a>
      </div>
    `);
  }

  return shell(`
    <div class="panel form">

      <h1>Ücretsiz İlan Ver</h1>

      <input
        id="title"
        placeholder="İlan başlığı"
      >

      <select id="category">
        <option value="">
          Kategori seç
        </option>

        ${cats.map(c =>
          `<option value="${safe(c)}">${safe(c)}</option>`
        ).join('')}
      </select>

      <textarea
        id="desc"
        placeholder="Açıklama"
      ></textarea>

      <input
        id="price"
        type="number"
        min="0"
        placeholder="Fiyat"
      >

      <select id="condition">
        <option value="">Ürün durumu seç</option>
        <option>Sıfır</option>
        <option>Yeni Gibi</option>
        <option>İyi</option>
        <option>Orta</option>
        <option>Yıpranmış</option>
      </select>

      <input
        id="city"
        placeholder="Şehir"
      >

      <input
        id="district"
        placeholder="İlçe"
      >

      <input
        id="photos"
        type="file"
        accept="image/*"
        multiple
      >

      <button
        id="publishBtn"
        onclick="publishListing()"
      >
        İlanı Yayınla
      </button>

      <p id="formMsg"></p>

    </div>
  `);
}

window.publishListing = async () => {
  const msg = document.querySelector('#formMsg');
  const btn = document.querySelector('#publishBtn');

  if (!supabase) {
    msg.textContent = 'Supabase bağlantısı bulunamadı.';
    return;
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    currentUser = null;
    location.hash = '#/login';
    return;
  }

  currentUser = user;

  const title =
    document.querySelector('#title')?.value.trim();

  const description =
    document.querySelector('#desc')?.value.trim();

  const price =
    Number(document.querySelector('#price')?.value);

  const condition =
    document.querySelector('#condition')?.value;

  const city =
    document.querySelector('#city')?.value.trim();

  const district =
    document.querySelector('#district')?.value.trim();

  const catName =
    document.querySelector('#category')?.value;

  if (!title) {
    msg.textContent = 'İlan başlığını yazın.';
    return;
  }

  if (!catName) {
    msg.textContent = 'Kategori seçin.';
    return;
  }

  if (!price || price < 0) {
    msg.textContent = 'Geçerli bir fiyat girin.';
    return;
  }

  if (!condition) {
    msg.textContent = 'Ürün durumunu seçin.';
    return;
  }

  if (!city) {
    msg.textContent = 'Şehir bilgisini girin.';
    return;
  }

  btn.disabled = true;
  msg.textContent = 'İlan yayınlanıyor...';

  let category_id = null;

  const { data: categoryData } = await supabase
    .from('categories')
    .select('id')
    .eq('name', catName)
    .maybeSingle();

  category_id = categoryData?.id || null;

  const payload = {
    user_id: user.id,
    category_id,
    title,
    description,
    price,
    condition,
    city,
    district,
    status: 'active'
  };

  const { data: newItem, error } = await supabase
    .from('listings')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('İlan ekleme hatası:', error);
    msg.textContent = 'İlan kaydedilemedi: ' + error.message;
    btn.disabled = false;
    return;
  }

  const files =
    [...(document.querySelector('#photos')?.files || [])];

  for (const file of files) {
    const cleanName =
      file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    const path =
      `${user.id}/${newItem.id}/${crypto.randomUUID()}-${cleanName}`;

    const { error: uploadError } =
      await supabase.storage
        .from('listing-images')
        .upload(path, file);

    if (uploadError) {
      console.error(
        'Fotoğraf yükleme hatası:',
        uploadError
      );
      continue;
    }

    const { data: publicData } =
      supabase.storage
        .from('listing-images')
        .getPublicUrl(path);

    if (publicData?.publicUrl) {
      const { error: imageError } =
        await supabase
          .from('listing_images')
          .insert({
            listing_id: newItem.id,
            image_url: publicData.publicUrl
          });

      if (imageError) {
        console.error(
          'Fotoğraf kayıt hatası:',
          imageError
        );
      }
    }
  }

  msg.textContent = 'İlan başarıyla yayınlandı.';

  location.hash = '#/listing/' + newItem.id;
};

/* -------------------- ARAMA -------------------- */

async function search() {
  const p =
    new URLSearchParams(
      location.hash.split('?')[1] || ''
    );

  const q = p.get('q') || '';

  const listings =
    await getListings(q);

  return shell(`
    <section>

      <h1>Arama sonuçları</h1>

      <p>
        “${safe(q)}” için sonuçlar
      </p>

      <div class="grid">
        ${
          listings.length
            ? listings.map(card).join('')
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

/* -------------------- MESAJ -------------------- */

window.messageSeller = async (listingId, sellerId) => {
  if (!currentUser) {
    location.hash = '#/login';
    return;
  }

  if (currentUser.id === sellerId) {
    alert('Kendi ilanınıza mesaj gönderemezsiniz.');
    return;
  }

  location.hash =
    '#/messages?listing=' +
    encodeURIComponent(listingId) +
    '&seller=' +
    encodeURIComponent(sellerId);
};

/* -------------------- FAVORİ / MESAJ SAYFALARI -------------------- */

function favoritesPage() {
  return shell(`
    <div class="panel">
      <h1>Favorilerim</h1>
      <p>
        Favori ilanlar özelliği yakında burada olacak.
      </p>
    </div>
  `);
}

function messagesPage() {
  if (!currentUser) {
    return shell(`
      <div class="panel">
        <h1>Mesajlarım</h1>
        <p>
          Mesajları görmek için giriş yapmalısınız.
        </p>
        <a href="#/login">Giriş Yap</a>
      </div>
    `);
  }

  return shell(`
    <div class="panel">
      <h1>Mesajlarım</h1>
      <p>
        Mesajlaşma ekranı yakında burada olacak.
      </p>
    </div>
  `);
}

/* -------------------- ROUTER -------------------- */

async function render() {
  await loadSession();

  const raw =
    location.hash.replace('#', '') || '/';

  const path =
    raw.split('?')[0];

  let html;

  try {
    if (path === '/') {
      html = await home();

    } else if (
      path === '/ilan-ver' ||
      path === '/new'
    ) {
      html = newListing();

    } else if (
      path.startsWith('/listing/')
    ) {
      const id =
        path.split('/')[2];

      html = await listing(id);

    } else if (
      path === '/search'
    ) {
      html = await search();

    } else if (
      path === '/login'
    ) {
      if (currentUser) {
        html = await profilePage();
      } else {
        html = auth('login');
      }

    } else if (
      path === '/signup'
    ) {
      if (currentUser) {
        html = await profilePage();
      } else {
        html = auth('signup');
      }

    } else if (
      path === '/profile'
    ) {
      html = await profilePage();

    } else if (
      path === '/favorites'
    ) {
      html = favoritesPage();

    } else if (
      path === '/messages'
    ) {
      html = messagesPage();

    } else {
      html = shell(`
        <div class="panel">
          <h1>Sayfa bulunamadı</h1>
          <p>
            <a href="#/">Ana sayfaya dön</a>
          </p>
        </div>
      `);
    }

  } catch (err) {
    console.error(err);

    html = shell(`
      <div class="panel">
        <h1>Bir hata oluştu</h1>
        <p>${safe(err?.message || 'Bilinmeyen hata')}</p>
        <p>
          <a href="#/">Ana sayfaya dön</a>
        </p>
      </div>
    `);
  }

  document.querySelector('#app').innerHTML = html;
}

/* -------------------- OTURUM DEĞİŞİKLİĞİ -------------------- */

if (supabase) {
  supabase.auth.onAuthStateChange(
    (_event, session) => {
      currentUser =
        session?.user || null;

      if (!currentUser) {
        currentProfile = null;
      }
    }
  );
}

window.addEventListener(
  'hashchange',
  render
);

render();
