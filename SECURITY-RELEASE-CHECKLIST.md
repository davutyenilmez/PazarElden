# PazarElden — Canlı Yayın Güvenlik Kontrol Listesi

Bu belge uygulanmamış güvenlik önlemlerini **tamamlandı** olarak göstermez.

## Supabase Dashboard üzerinden yapılacaklar
- [ ] Authentication → Security and Protection: leaked-password protection etkinleştir; yönetici hesabında MFA kur ve doğrula.
- [x] Storage → Buckets → listing-images: 8 MiB sınırı ve image/jpeg, image/png, image/webp MIME türleri veritabanında doğrulandı. Gerçek dosya yükleme testleri hâlâ gerekli.
- [ ] Database → Security Advisor: SECURITY DEFINER uyarılarının her birini işlevin amacı, EXECUTE grant'leri ve içerideki auth.uid()/rol denetimleriyle incele. Halka açık ziyaret sayacı fonksiyonlarını sebepsiz kapatma.
- [ ] Yönetici/baş moderatör/moderatör/yardımcı moderatör rollerinin yetkilerini sunucu tarafında doğrula. Rol değiştirme yalnızca ana yöneticiye ait olmalı.
- [ ] Supabase planında otomatik yedekleme/PITR durumunu doğrula; izole ortamda geri yükleme denemesi yap. Üretim verilerini silerek test yapma.
- [x] İlan oluşturma (10/gün), mesaj (12/dakika), şikâyet (10/gün) için veritabanı tetikleyicili hız sınırı eklendi. Oluşturma zamanları sunucuda atanıyor ve üye güncellemelerinde korunuyor. Gerçek hesaplarla sınır testleri yapılmalı.
- [ ] Oturum açma uçlarında Supabase Auth hız sınırlarını ve CAPTCHA seçeneklerini doğrula.

## Test senaryoları
- [ ] Giriş yapmamış ziyaretçi özel mesajları, telefon paylaşımını ve taslak ilanları okuyamıyor.
- [ ] A üyesi B üyesinin ilanını düzenleyemiyor, silemiyor veya onaylayamıyor.
- [ ] A üyesi B üyesinin mesajlarını/özel iletişim bilgilerini göremiyor.
- [ ] Engellenen kullanıcı mesaj gönderemiyor.
- [ ] Normal üye admin_set_member_role, admin_hard_delete_listing, approve_listing işlemlerinde reddediliyor.
- [ ] Yetkisiz MIME türü ve 8 MiB üstü fotoğraf sunucu tarafından reddediliyor.
- [ ] Art arda gönderim, şikâyet ve ilan denemeleri sunucu tarafından sınırlandırılıyor.
- [ ] İlan ekleme → moderasyon → yayınlama → duraklatma → yeniden gönderme → silme akışı çalışıyor.
- [ ] iPhone ve masaüstünde arama, menü, mesajlaşma ve ilan oluşturma kontrol ediliyor.
- [ ] 404, çevrimdışı durum, boş liste, başarısız dosya yükleme kullanıcıya anlaşılır hata gösteriyor.

## Ürün ve hukuki hazırlık
- [ ] KVKK aydınlatması, gizlilik/çerez politikası, kullanım koşulları, ilan kuralları ve şikâyet/itiraz prosedürünü yetkili hukuk danışmanına gözden geçir.
- [ ] Sahte ilan/kapora/şüpheli bağlantı uyarılarını görünür kıl.
- [ ] Performans, erişilebilirlik, SEO ve hata izleme kontrolü yap.
- [ ] Alan adı ve kurumsal destek e-postası ayarla.
- [ ] Demo ilanları gerçek satış olarak sunma.

## Bu sürümde yapılanlar
- Mesaj formuna 3 saniyelik istemci tarafı tekrar gönderim beklemesi ve hata durumunda düğmeyi yeniden etkinleştirme eklendi.
- Güncellenmiş JavaScript/CSS için sürüm parametreleri yenilendi.

Bu liste canlı sistemde tamamlandığı doğrulanmadıkça yayın güvenlik onayı değildir.
