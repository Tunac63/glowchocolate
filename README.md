# 🍫 GlowChocolate - İşletme ve Personel Takip Sistemi

Modern React tabanlı işletme ve personel takip uygulaması.

## 🚀 Özellikler


## Otomatik Deploy (Cloudflare Pages + GitHub Actions)

Bu repo `main` dalına push yapıldığında otomatik olarak Cloudflare Pages'e yayınlanır.

1) GitHub'ta Settings → Secrets and variables → Actions'a aşağıdaki sırları ekleyin:
	- `CLOUDFLARE_API_TOKEN`: Pages yazma yetkili token
	- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare hesap ID
	- `CLOUDFLARE_PROJECT_NAME`: Pages proje adı
	- (Opsiyonel) `VITE_FCM_VAPID_KEY`: FCM Web Push public key

2) `.github/workflows/cloudflare-pages.yml` yayın akışı, `npm run build` sonrası `dist` klasörünü yükler.

## Web Push Bildirimleri (FCM)

- Service worker dosyası: `public/firebase-messaging-sw.js`
- İstemci kayıt yardımcıları: `src/firebase/messaging.js`
- Uygulama, kullanıcı giriş yaptığında FCM izni ister ve token'ı `users` dokümanına `fcmToken` alanı olarak kaydeder.

Not: Bildirim göndermek için Firebase Cloud Functions veya sunucu tarafında FCM kullanımı gerekir.

## 🛠️ Teknolojiler

- **React 18** - Modern React hooks ile geliştirildi
- **Vite** - Hızlı build tool
- **Firebase** - Authentication ve Firestore database
- **Modern CSS** - Gradient arka planlar ve glassmorphism tasarım
- **Responsive Design** - Mobil uyumlu tasarım

## 📦 Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

3. Tarayıcınızda `http://localhost:5173` adresini açın

## 🔧 Mevcut Scripts

- `npm run dev` - Geliştirme sunucusunu başlatır
- `npm run build` - Production build oluşturur
- `npm run preview` - Production build'i önizler
- `npm run lint` - ESLint ile kod kontrolü yapar

## 📱 Kullanım

Uygulama başladığında:

1. **@glow.com** uzantılı email ile kayıt olun/giriş yapın
2. **Personel Yönetimi** kartından personel işlemlerinizi yapabilirsiniz
3. **İşletme Yönetimi** kartından departman yönetimi yapabilirsiniz
4. Modern ve kullanıcı dostu arayüz ile kolayca navigasyon yapabilirsiniz

## 🎨 Tasarım

- **Glassmorphism** efektli kartlar
- **Açık renkli** arka planlar
- **Hover animasyonları**
- **Mobile-first** responsive tasarım

## 🔄 Sonraki Adımlar

- [ ] Personel ekleme/düzenleme formu
- [ ] Departman yönetim sistemi
- [ ] Grafik ve raporlama
- [ ] Arama ve filtreleme
- [ ] Rol tabanlı yetkilendirme
- [ ] Mesajlaşma sistemi

## 👨‍💻 Geliştirici

Bu proje React, Firebase ve modern web teknolojileri kullanılarak geliştirilmiştir.

## 🌩️ Cloudflare Pages ile 7/24 Yayın (Önerilen Alternatif)

Statik Vite çıktısını (dist) global CDN üzerinde barındırmak için Cloudflare Pages kullanabilirsiniz.

1) Production build alın:

```powershell
npm run build
```

2) SPA yönlendirmesi için `public/_redirects` dosyası (oluşturuldu):

```
/*    /index.html   200
```

3) Cloudflare Pages kurulumu:
- Cloudflare Dashboard > Pages > Create project
- Kaynak: GitHub repo (veya “Direct Upload” ile `dist` klasörünü yükleyin)
- Build command: `npm run build`
- Build output directory: `dist`

4) Firebase Auth/Firestore ile çalışırken:
- Firebase Console > Authentication > Settings > Authorized domains: Pages domaininizi ekleyin.
- Firestore ve diğer Firebase servisleri tamamen client-side çalışmaya devam eder.

5) Özel alan adı:
- Pages projenize Custom Domain bağlayın ve DNS’i Cloudflare’a yönlendirin.

Not: Git entegrasyonu açarsanız her push’ta otomatik build ve deploy yapılır.
