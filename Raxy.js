import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { basename, extname } from 'path';
import mime from 'mime-types';
import fetch from 'node-fetch'; // Dibutuhkan untuk fungsi mediafire

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Mengizinkan permintaan dari frontend
app.use(express.json()); // Membaca JSON
app.use(express.static('public')); // Menyajikan file HTML/CSS/JS dari folder 'public'

// --- FUNGSI DARI ANDA (Sedikit dimodifikasi) ---

async function mediafire(url) {
    // Menambahkan 'node-fetch' karena 'fetch' tidak ada di Node.js versi lama
    const res = await (await fetch(url.trim())).text();
    const $ = cheerio.load(res);
    const title = $("meta[property='og:title']").attr("content")?.trim() || "Unknown";
    const size = /Download\s*\(([\d.]+\s*[KMGT]?B)\)/i.exec($.html())?.[1] || "Unknown";
    const dl = $("a.popsok[href^='https://download']").attr("href")?.trim() || $("a.popsok:not([href^='javascript'])").attr("href")?.trim();
    
    if (!dl) {
        throw new Error("Download URL not found.");
    }
    
    const filename = basename(dl);
    const type = extname(dl);
    const mimetype = mime.lookup(filename) || 'application/octet-stream';
    
    return { name: title, filename, type, size, download: dl, link: url.trim(), mimetype };
}

async function aiodl(url) {
  try {
    const params = new URLSearchParams();
    params.append('query', url);
    params.append('vt', 'home');
    
    const h = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
      'Referer': 'https://ssvid.net/en'
    };
    
    const res = await axios.post(
      'https://ssvid.net/api/ajax/search?hl=en',
      params.toString(), {
        headers: h,
        compress: true,
        timeout: 10000
      }
    );
    
    return res.data;
  }
  catch (e) {
    console.error(e);
    // Mengembalikan error yang lebih informatif
    return { error: true, message: e.message, status: e.response?.status };
  }
}

// --- API Endpoints ---

// Endpoint untuk Mediafire
app.get('/api/mediafire', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: true, message: "URL diperlukan" });
    }
    try {
        const data = await mediafire(url);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});

// Endpoint untuk All-in-One Downloader
app.get('/api/aiodl', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: true, message: "URL diperlukan" });
    }
    try {
        const data = await aiodl(url);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});

// Menjalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
      
