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

/* ------------------------------------------------
   YARDIMCI FONKSİYONLAR
------------------------------------------------ */

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

function dateText(v) {
  if (!v) return '';

  try {
    return new Date(v).toLocaleString('tr-TR');
  } catch {
    return '';
  }
}

async function loadSession() {
  if (!supabase) return;

  const { data } = await supabase.auth.getSession();

  currentUser = data?.session?.user || null;
  currentProfile = null;

  if (currentUser) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    currentProfile = profile || null;
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

/* ------------------------------------------------
   GENEL SAYFA
------------------------------------------------ */

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

/* ------------------------------------------------
   İLANLAR
------------------------------------------------ */

async function addFirstImages(listings) {
  for (const item of listings || []) {
    const { data } = await supabase
      .from('listing_images')
      .select('image_url')
      .eq('listing_id', item.id)
      .limit(1);

    item.listing_images = data || [];
  }

  return listings || [];
}

async function getListings(q = '') {
  if (!supabase) return [];

  let query = supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);

  if (q) {
    query = query.ilike('title', `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    return [];
  }

  return await addFirstImages(data || []);
}

function card(x) {
  const img = x.listing_images?.[0]?.image_url;

  return `
    <a class="card" href="#/listing/${x.id}">
      <div class="pic">
        ${
          img
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

/* ------------------------------------------------
   ANA SAYFA
------------------------------------------------ */

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
            : `<div class="empty">Henüz yayınlanmış ilan bulunmuyor.</div>`
        }
      </div>
    </section>

    <section class="trust">
      <h2>PazarElden ile kolayca al, kolayca sat</h2>

      <div>
        <article>
          🔎
          <b>Kolayca keşfet</b>
          <p>Kategoriler ve arama ile aradığını hızlıca bul.</p>
        </article>

        <article>
          📸
          <b>Ücretsiz ilan ver</b>
          <p>Fotoğraflarını yükle, ilanını dakikalar içinde yayınla.</p>
        </article>

        <article>
          💬
          <b>Doğrudan iletişim</b>
          <p>Alıcı ve satıcı PazarElden üzerinden görüşsün.</p>
        </article>
      </div>
    </section>
  `);
}

/* ------------------------------------------------
   FAVORİ KONTROLÜ
------------------------------------------------ */

async function isFavorite(listingId) {
  if (!currentUser) return false;

  const { data } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', currentUser.id)
    .eq('listing_id', listingId)
    .maybeSingle();

  return !!data;
}

window.toggleFavorite = async listingId => {
  if (!currentUser) {
    location.hash = '#/login';
    return;
  }

  const favorite = await isFavorite(listingId);

  if (favorite) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('listing_id', listingId);

    if (error) {
      alert('Favoriden çıkarılamadı: ' + error.message);
      return;
    }
  } else {
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: currentUser.id,
        listing_id: listingId
      });

    if (error) {
      alert('Favoriye eklenemedi: ' + error.message);
      return;
    }
  }

  await render();
};

/* ------------------------------------------------
   İLAN DETAY
------------------------------------------------ */

async function listing(id) {
  if (!supabase) {
    return shell(`<div class="panel">Supabase bağlantısı bulunamadı.</div>`);
  }

  const { data: x, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return shell(`
      <div class="panel">
        <h1>İlan açılamadı</h1>
        <p>${safe(error.message)}</p>
      </div>
    `);
  }

  if (!x || x.status === 'deleted') {
    return shell(`
      <div class="panel">
        <h1>İlan bulunamadı</h1>
        <p>Bu ilan kaldırılmış olabilir.</p>
        <a href="#/">Ana sayfaya dön</a>
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

  const favorite = await isFavorite(id);
  const mine = currentUser?.id === x.user_id;

  return shell(`
    <section class="detail">

      <div class="gallery">
        ${
          images?.length
            ? images.map(i =>
                `<img src="${safe(i.image_url)}" alt="${safe(x.title)}">`
              ).join('')
            : '<div class="noimg">📷</div>'
        }
      </div>

      <aside>
        <h1>${safe(x.title)}</h1>

        <div class="price">${money(x.price)}</div>

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
          mine
            ? `
              <p><strong>Bu ilan size ait.</strong></p>

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
                ${favorite ? '♥ Favorilerden Çıkar' : '♡ Favoriye Ekle'}
              </button>

              <button
                class="wide"
                onclick="openConversation('${x.id}','${x.user_id}')"
              >
                Satıcıya Mesaj Gönder
              </button>
            `
        }
      </aside>
    </section>
  `);
}

/* ------------------------------------------------
   İLAN SİLME
------------------------------------------------ */

window.deleteListing = async id => {
  if (!currentUser) return;

  const ok = confirm(
    'Bu ilanı silmek istediğinizden emin misiniz?'
  );

  if (!ok) return;

  /*
    Soft delete kullanıyoruz.
    Böylece eski mesajlar bozulmuyor.
  */

  const { error } = await supabase
    .from('listings')
    .update({ status: 'deleted' })
    .eq('id', id)
    .eq('user_id', currentUser.id);

  if (error) {
    alert('İlan silinemedi: ' + error.message);
    return;
  }

  alert('İlan silindi.');
  location.hash = '#/profile';
};

/* ------------------------------------------------
   GİRİŞ / ÜYELİK
------------------------------------------------ */

function auth(kind) {
  return shell(`
    <div class="auth panel">

      <h1>${kind === 'login' ? 'Giriş Yap' : 'Üye Ol'}</h1>

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

      <button onclick="doAuth('${kind}')">
        ${kind === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
      </button>

      <p id="authMsg"></p>
    </div>
  `);
}

window.doAuth = async kind => {
  if (!supabase) return;

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
        data: { full_name: fullName }
      }
    });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  if (data.user) {
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

/* ------------------------------------------------
   PROFİL
------------------------------------------------ */

async function profilePage() {
  if (!currentUser) {
    location.hash = '#/login';
    return '';
  }

  const { data } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', currentUser.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });

  const myListings =
    await addFirstImages(data || []);

  return shell(`
    <section>

      <div class="panel">
        <h1>Profilim</h1>

        <p><b>E-posta:</b> ${safe(currentUser.email || '')}</p>

        <label>Profil adı</label>

        <input
          id="profileName"
          value="${safe(userName())}"
          placeholder="Ad Soyad"
        >

        <button onclick="saveProfileName()">
          Profil Adını Kaydet
        </button>

        <p id="profileMsg"></p>

        <button onclick="logout()">
          Çıkış Yap
        </button>
      </div>

      <div class="sectionHead">
        <h2>İlanlarım</h2>
      </div>

      <div class="grid">
        ${
          myListings.length
            ? myListings.map(card).join('')
            : `<div class="empty">Henüz ilanınız bulunmuyor.</div>`
        }
      </div>

    </section>
  `);
}

window.saveProfileName = async () => {
  if (!currentUser) return;

  const name =
    document.querySelector('#profileName')?.value.trim();

  const msg =
    document.querySelector('#profileMsg');

  if (!name) {
    msg.textContent = 'Profil adı boş bırakılamaz.';
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: currentUser.id,
      full_name: name
    });

  if (error) {
    msg.textContent =
      'Kaydedilemedi: ' + error.message;
    return;
  }

  currentProfile = {
    ...(currentProfile || {}),
    id: currentUser.id,
    full_name: name
  };

  msg.textContent = 'Profil adı güncellendi.';

  await render();
};

/* ------------------------------------------------
   İLAN VER
------------------------------------------------ */

function newListing() {
  if (!currentUser) {
    return shell(`
      <div class="panel">
        <h1>İlan vermek için giriş yapın</h1>
        <a href="#/login">Giriş Yap</a>
      </div>
    `);
  }

  return shell(`
    <div class="panel form">

      <h1>Ücretsiz İlan Ver</h1>

      <input id="title" placeholder="İlan başlığı">

      <select id="category">
        <option value="">Kategori seç</option>
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

      <input id="city" placeholder="Şehir">
      <input id="district" placeholder="İlçe">

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
  const msg =
    document.querySelector('#formMsg');

  const btn =
    document.querySelector('#publishBtn');

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    location.hash = '#/login';
    return;
  }

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

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('name', catName)
    .maybeSingle();

  category_id = category?.id || null;

  const { data: newItem, error } = await supabase
    .from('listings')
    .insert({
      user_id: user.id,
      category_id,
      title,
      description,
      price,
      condition,
      city,
      district,
      status: 'active'
    })
    .select('*')
    .single();

  if (error) {
    msg.textContent =
      'İlan kaydedilemedi: ' + error.message;

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
      console.error(uploadError);
      continue;
    }

    const { data: publicData } =
      supabase.storage
        .from('listing-images')
        .getPublicUrl(path);

    if (publicData?.publicUrl) {
      await supabase
        .from('listing_images')
        .insert({
          listing_id: newItem.id,
          image_url: publicData.publicUrl
        });
    }
  }

  location.hash =
    '#/listing/' + newItem.id;
};

/* ------------------------------------------------
   FAVORİLER SAYFASI
------------------------------------------------ */

async function favoritesPage() {
  if (!currentUser) {
    return shell(`
      <div class="panel">
        <h1>Favorilerim</h1>
        <p>Favorilerinizi görmek için giriş yapmalısınız.</p>
        <a href="#/login">Giriş Yap</a>
      </div>
    `);
  }

  const { data: favorites, error } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', currentUser.id);

  if (error) {
    return shell(`
      <div class="panel">
        Favoriler yüklenemedi: ${safe(error.message)}
      </div>
    `);
  }

  const ids =
    [...new Set((favorites || []).map(x => x.listing_id))];

  let listings = [];

  if (ids.length) {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .in('id', ids)
      .eq('status', 'active');

    listings =
      await addFirstImages(data || []);
  }

  return shell(`
    <section>
      <h1>Favorilerim</h1>

      <div class="grid">
        ${
          listings.length
            ? listings.map(card).join('')
            : `<div class="empty">Henüz favori ilanınız yok.</div>`
        }
      </div>
    </section>
  `);
}

/* ------------------------------------------------
   MESAJLAŞMA
------------------------------------------------ */

window.openConversation = (listingId, sellerId) => {
  if (!currentUser) {
    location.hash = '#/login';
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
        <h1>Mesajlarım</h1>
        <p>Mesajları görmek için giriş yapmalısınız.</p>
        <a href="#/login">Giriş Yap</a>
      </div>
    `);
  }

  const params =
    new URLSearchParams(
      location.hash.split('?')[1] || ''
    );

  const listingId =
    params.get('listing');

  const otherUserId =
    params.get('user');

  if (listingId && otherUserId) {
    return await conversationPage(
      listingId,
      otherUserId
    );
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
    )
    .order('created_at', { ascending: false });

  if (error) {
    return shell(`
      <div class="panel">
        <h1>Mesajlarım</h1>
        <p>${safe(error.message)}</p>
      </div>
    `);
  }

  const conversations = new Map();

  for (const m of messages || []) {
    const other =
      m.sender_id === currentUser.id
        ? m.receiver_id
        : m.sender_id;

    const key =
      `${m.listing_id || 'none'}_${other}`;

    if (!conversations.has(key)) {
      conversations.set(key, {
        ...m,
        other
      });
    }
  }

  const rows = [];

  for (const m of conversations.values()) {
    let person = 'PazarElden kullanıcısı';
    let title = 'İlan';

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', m.other)
      .maybeSingle();

    if (profile?.full_name) {
      person = profile.full_name;
    }

    if (m.listing_id) {
      const { data: item } = await supabase
        .from('listings')
        .select('title')
        .eq('id', m.listing_id)
        .maybeSingle();

      if (item?.title) {
        title = item.title;
      }
    }

    rows.push(`
      <div class="panel">
        <b>${safe(title)}</b>
        <p>${safe(person)}</p>
        <p>${safe(m.content || '')}</p>
        <small>${dateText(m.created_at)}</small>

        <p>
          <button
            onclick="openConversation('${m.listing_id || ''}','${m.other}')"
          >
            Mesajları Aç
          </button>
        </p>
      </div>
    `);
  }

  return shell(`
    <section>
      <h1>Mesajlarım</h1>

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

async function conversationPage(listingId, otherUserId) {
  if (!otherUserId) {
    return shell(`
      <div class="panel">
        Mesajlaşılacak kullanıcı bulunamadı.
      </div>
    `);
  }

  let listingTitle = 'İlan';
  let otherName = 'PazarElden kullanıcısı';

  if (listingId) {
    const { data: item } = await supabase
      .from('listings')
      .select('title')
      .eq('id', listingId)
      .maybeSingle();

    if (item?.title) {
      listingTitle = item.title;
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', otherUserId)
    .maybeSingle();

  if (profile?.full_name) {
    otherName = profile.full_name;
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('listing_id', listingId)
    .or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
    )
    .order('created_at', { ascending: true });

  if (error) {
    return shell(`
      <div class="panel">
        <h1>Mesajlar</h1>
        <p>${safe(error.message)}</p>
      </div>
    `);
  }

  const chat =
    (messages || []).map(m => `
      <div class="panel">
        <b>
          ${
            m.sender_id === currentUser.id
              ? 'Siz'
              : safe(otherName)
          }
        </b>

        <p>${safe(m.content || '')}</p>
        <small>${dateText(m.created_at)}</small>
      </div>
    `).join('');

  return shell(`
    <section>
      <h1>${safe(listingTitle)}</h1>
      <p><b>${safe(otherName)}</b> ile mesajlaşma</p>

      ${
        chat ||
        `<div class="empty">Henüz mesaj yok. İlk mesajı siz gönderin.</div>`
      }

      <div class="panel form">
        <textarea
          id="messageText"
          placeholder="Mesajınızı yazın..."
        ></textarea>

        <button
          onclick="sendMessage('${listingId}','${otherUserId}')"
        >
          Mesaj Gönder
        </button>

        <p id="messageMsg"></p>
      </div>
    </section>
  `);
}

window.sendMessage = async (listingId, receiverId) => {
  if (!currentUser) {
    location.hash = '#/login';
    return;
  }

  const input =
    document.querySelector('#messageText');

  const msg =
    document.querySelector('#messageMsg');

  const content =
    input?.value.trim();

  if (!content) {
    msg.textContent = 'Mesajınızı yazın.';
    return;
  }

  if (receiverId === currentUser.id) {
    msg.textContent =
      'Kendinize mesaj gönderemezsiniz.';
    return;
  }

  const { error } = await supabase
    .from('messages')
    .insert({
      sender_id: currentUser.id,
      receiver_id: receiverId,
      listing_id: listingId || null,
      content,
      is_read: false
    });

  if (error) {
    msg.textContent =
      'Mesaj gönderilemedi: ' + error.message;
    return;
  }

  input.value = '';

  await render();
};

/* ------------------------------------------------
   ARAMA
------------------------------------------------ */

async function search() {
  const p =
    new URLSearchParams(
      location.hash.split('?')[1] || ''
    );

  const q =
    p.get('q') || '';

  const listings =
    await getListings(q);

  return shell(`
    <section>
      <h1>Arama sonuçları</h1>
      <p>“${safe(q)}” için sonuçlar</p>

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

/* ------------------------------------------------
   ROUTER
------------------------------------------------ */

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
      html = await listing(
        path.split('/')[2]
      );

    } else if (
      path === '/search'
    ) {
      html = await search();

    } else if (
      path === '/login'
    ) {
      html =
        currentUser
          ? await profilePage()
          : auth('login');

    } else if (
      path === '/signup'
    ) {
      html =
        currentUser
          ? await profilePage()
          : auth('signup');

    } else if (
      path === '/profile'
    ) {
      html = await profilePage();

    } else if (
      path === '/favorites'
    ) {
      html = await favoritesPage();

    } else if (
      path === '/messages'
    ) {
      html = await messagesPage();

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

  document.querySelector('#app').innerHTML =
    html;
}

/* ------------------------------------------------
   OTURUM
------------------------------------------------ */

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
