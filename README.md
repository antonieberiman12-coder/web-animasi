# OtakuStream - Web Nonton Anime Otakudesu Bebas Iklan & Redirect

Aplikasi web khusus untuk streaming anime dari Otakudesu dengan fitur pemutar video bersih (**Zero Ads**, **Anti-Popup**, dan **Anti-Redirect**) yang dirancang khusus untuk layar HP Android dan PC.

---

## 🌟 Fitur Utama
1. **Zero Ads & Anti-Redirect**:
   - Pemutar video menggunakan Native HTML5 Player (`/api/video-stream`) yang mengambil aliran video langsung tanpa skrip iklan atau overlay transparan.
   - Dilengkapi fallback Sandboxed Iframe Player yang memblokir `allow-popups` dan `allow-top-navigation` agar tidak ada tab baru yang bisa terbuka saat layar diklik.
2. **Koleksi Lengkap Terhubung ke Otakudesu**:
   - Fitur pencarian anime apa saja yang ada di Otakudesu.
   - Shortcut langsung untuk **Fumetsu no Anata e (Episode 1 – 20)**.
   - Daftar anime Ongoing dan Completed update otomatis.
3. **Desain Mobile-First untuk Android**:
   - Tampilan Dark Mode elegan dan ringan.
   - Tombol navigasi episode cepat: *Eps 1* s/d *Eps 20*, tombol *Next Episode*, dan *Prev Episode*.
   - Menyimpan riwayat episode yang sudah ditonton (*Watched* badge).

---

## 🚀 Cara 1: Menjalankan di Komputer & Membuka di HP Android (Jaringan Wi-Fi)

Jika komputer/laptop dan HP Android berada dalam 1 jaringan Wi-Fi:

1. Buka terminal/PowerShell di folder ini:
   ```bash
   cd "D:\WEB ANIMASI"
   ```
2. Jalankan server:
   ```bash
   npm start
   ```
3. Cek alamat IP lokal komputer lu di PowerShell:
   ```bash
   ipconfig
   ```
   *(Cari baris `IPv4 Address`, contoh: `192.168.1.15`)*.
4. Buka browser (Chrome / Brave) di HP Android lu, lalu ketik:
   ```text
   http://192.168.1.15:3000
   ```
   *(Ganti `192.168.1.15` dengan alamat IP komputer lu)*.

---

## ❓ Kenapa Web Tidak Bisa Diakses Saat Laptop Dimatikan?

Ketika kamu menjalankan web ini lewat file `start-online.bat`, yang terjadi adalah:
1. Laptop kamu bertindak sebagai **komputer server** (`node server.js`).
2. `cloudflared.exe` membuat terowongan kabel virtual (tunnel) dari internet langsung ke laptop kamu.
3. **Saat laptop dimatikan / ditutup (sleep / shutdown)**:
   - Aliran listrik & prosesor laptop mati.
   - Aplikasi server Node.js otomatis berhenti.
   - Koneksi internet laptop terputus, sehingga Cloudflare Tunnel langsung putus dan menampilkan error `502 Bad Gateway` atau `Connection Refused`.

👉 **Solusinya**: Pindahkan file web ini ke **Cloud Server 24 Jam (Gratis)** seperti **Render.com** atau **Vercel**. Server cloud ini berada di pusat data internet yang menyala terus menerus 24 jam sehari, 7 hari seminggu tanpa tergantung pada laptop kamu sama sekali!

---

## 🌐 Cara 2 (Rekomendasi Utama): Deploy 24 Jam Nonstop ke Render.com (Gratis)

Render adalah platform hosting cloud gratis terbaik untuk aplikasi Node.js streaming anime ini karena tidak memiliki batasan timeout streaming video.

### Langkah-langkahnya (Hanya Sekali Setup):

1. **Upload Folder Ini ke Akun GitHub Kamu**:
   - Buka browser dan login ke [GitHub.com](https://github.com).
   - Buat repository baru (klik tanda **+** di pojok kanan atas > **New repository**).
   - Beri nama repository, misal: `web-animasi`, pilih **Public** atau **Private**, lalu klik **Create repository**.
   - Buka PowerShell di laptop kamu, lalu jalankan perintah ini:
     ```bash
     cd "D:\WEB ANIMASI"
     git add .
     git commit -m "Update konfigurasi cloud 24/7"
     git branch -M main
     git remote add origin https://github.com/<USERNAME-GITHUB-KAMU>/web-animasi.git
     git push -u origin main
     ```
     *(Ganti `<USERNAME-GITHUB-KAMU>` dengan username akun GitHub kamu)*.

2. **Hubungkan ke Render.com**:
   - Buka [Render.com](https://render.com) dan daftar/login menggunakan akun GitHub kamu.
   - Di Dashboard Render, klik tombol **New +** > pilih **Web Service**.
   - Pilih repository GitHub `web-animasi` yang baru saja kamu buat.
   - Render akan otomatis mendeteksi konfigurasi:
     - **Name**: `web-animasi` (atau nama pilihanmu)
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Pilih **Free** ($0)
   - Klik **Deploy Web Service**.
   - Tunggu 1–2 menit sampai proses build selesai dan statusnya berubah menjadi **Live**.

3. **Selesai!**:
   - Kamu akan mendapatkan link web HTTPS gratis (contoh: `https://web-animasi-xxxx.onrender.com`).
   - Simpan link ini di HP kamu (bisa dijadikan bookmark atau ditambahkan ke Home Screen Android via tombol *Add to Home screen*).
   - **Sekarang laptop kamu bisa dimatikan sepuasnya, dan kamu tetap bisa menonton anime kapan saja dari HP!**

💡 **Tips Tambahan (Anti-Sleep Render Free Tier)**:
Server gratis Render akan tidur jika tidak dibuka selama 15 menit. Agar selalu aktif dan cepat dibuka:
- Buka [cron-job.org](https://cron-job.org) atau [uptimerobot.com](https://uptimerobot.com) (gratis).
- Daftarkan URL health check web kamu: `https://link-render-kamu.onrender.com/api/health` setiap 10 menit.
- Web kamu akan terus terjaga online 24 jam penuh!

---

## ⚡ Cara 3 (Alternatif): Deploy Cepat ke Vercel

Jika kamu lebih suka menggunakan Vercel:
1. Pastikan kode sudah di-push ke GitHub seperti pada Cara 2.
2. Buka [Vercel.com](https://vercel.com) dan login dengan GitHub.
3. Klik **Add New Project** > pilih repository `web-animasi`.
4. Klik **Deploy**.
5. Vercel akan langsung memberikan link web aktif (contoh: `https://web-animasi.vercel.app`).
*(Catatan: Proyek ini sudah dilengkapi `vercel.json` dan fallback player otomatis).*
