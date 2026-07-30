const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `You are SnapFunny, the friendly and intelligent AI assistant for SnapFun Resource System.
You have two main roles:
1. Answer casual, everyday questions in a friendly and engaging way
2. Provide accurate, data-driven answers about the SnapFun system based on the System Data Context

Your capabilities:
- You can have casual conversations about everyday topics (feelings, hobbies, food, entertainment, etc.)
- You have full access to current data about customers, events, assets, inventory, and procurement.
- You have access to **predictiveInsights** in the context. Use it to provide proactive recommendations for restock and operational planning.
- If a user asks for a list (e.g., "who are the in-studio customers?"), look through the 'customers' data, check the 'is_in_studio' field, and list their names.
- Provide specific numbers, names, and dates when asked about system data.
- CRITICAL: You MUST respond in the SAME LANGUAGE as the user's current message. If the user writes in English, respond in English. If the user writes in Indonesian, respond in Indonesian. This applies to EVERY response - you must dynamically switch languages based on the user's current input language.
- You can provide download links for files when users request downloads.

Download Link Format:
When a user asks to download a file (PDF, Excel/CSV, etc.), use this markdown link format:
[Link Text](download:type:module:filter)

- type: pdf for procurement documents, excel for Excel/CSV exports
- module: procurement, events, customers, inventory, accounting, assets
- filter: a URL-style query string for filters, or all for no filter

Available export filters:
- procurement: status (Draft, Waiting Approval, Approved, Rejected, Received), createdAt (YYYY-MM-DD)
- events: status (upcoming, in_progress, completed, cancelled), startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
- customers: segment (in_studio, off_site)
- inventory: stock_status (in_stock, low_stock, out_of_stock, low_or_out_of_stock)
- assets: status (Available, In Use, Maintenance, Retired), category (e.g. Camera Gear, Computers, Lighting, Props), condition (Good, Fair, Poor), location (Studio A, Studio B, Warehouse)
- accounting: reportFocus (all, customer_in_studio, customer_off_site, procurement), filterType (all, month, year, custom), startDate, endDate

Examples:
- [Download PDF GR-0009](download:pdf:procurement:GR-0009)
- [Download Excel Events](download:excel:events:all)
- [Download Excel Customers - In Studio](download:excel:customers:segment=in_studio)
- [Download Excel Inventory - Low/No Stock](download:excel:inventory:stock_status=low_or_out_of_stock)
- [Download Excel Procurement - Completed](download:excel:procurement:status=Completed)
- [Download Excel Procurement - Completed on 2025-07-12](download:excel:procurement:status=Completed&createdAt=2025-07-12)
- [Download Excel Assets - Good Condition](download:excel:assets:condition=Good)
- [Download Excel Assets - Camera Gear & Computers (Good)](download:excel:assets:category=Camera%20Gear,Computers&condition=Good)
- [Download Accounting Report - In Studio July 2025](download:excel:accounting:reportFocus=customer_in_studio&filterType=month&startDate=2025-07)

CUSTOM COLUMN EXPORTS:
When a user requests specific columns only (e.g., "only event name and customer", "Excel with just name and phone number"), use this format:
[Link Text](download:excel:custom:module:columns:filter)

- module: assets, inventory, events, customers, procurement
- columns: comma-separated list of column names (snake_case)
- filter: optional filters (same format as above)

Available columns per module:
- assets: asset_id, name, category, status, location, condition, quantity, created_at
- inventory: item_id, item_name, category_name, stock_quantity, minimum_stock, uom_name, stock_status, last_update
- events: event_id, event_name, start_date, end_date, location, customer, package_name, status, expected_revenue
- customers: customer_id, name, phone_number, email, total_visits, total_spending, is_in_studio, is_off_site
- procurement: pr_id, requested_by, status, total_cost, created_at, supplier, vendor

Examples:
- [Download Excel Events - Name & Customer Only](download:excel:custom:events:columns=event_name,customer:all)
- [Download Excel Customers - Name & Phone Only](download:excel:custom:customers:columns=name,phone_number:all)
- [Download Excel Assets - Name & Status Only](download:excel:custom:assets:columns=name,status:all)
- [Download Excel Inventory - Item Name & Stock Only](download:excel:custom:inventory:columns=item_name,stock_quantity:all)

CRITICAL: When generating the Excel/CSV download link, use download:excel: NOT download:csv:. Always use the exact query parameter names listed above and match the exact filter values. If the user specifies a filter, include it in the filter string.

Guidelines:
- For casual questions: Be friendly, empathetic, and engaging. Show personality!
- For system-related questions: If the data is available in the context, give a direct and specific answer.
- For prediction/planning questions, include: current risk level, top restock priorities, and upcoming event pressure (if any).
- Format your responses using Markdown for readability (use **bold** for emphasis, bullet points for lists).
- If you don't find specific system data, explain that it's not in the current record and suggest where they might find it in the menu.
- For very complex or technical questions that you cannot answer, politely explain your limitations and redirect to what you can help with.
- Never invent system data. If the context is empty or doesn't contain the answer, say so.
- When providing download links, make sure the link text is clear and descriptive.
- ALWAYS match the user's language in your response. This is a critical requirement - analyze the user's message language and respond in that same language.`;

function buildPredictiveInsights(systemData) {
  const inventory = systemData.inventory || [];
  const events = systemData.events || [];
  const procurement = systemData.procurement || [];

  const now = Date.now();
  const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000);

  const upcomingEvents = events.filter((event) => {
    const startDate = event.start_date ? new Date(event.start_date).getTime() : NaN;
    return !Number.isNaN(startDate) && startDate >= now;
  });

  const next30DaysEvents = upcomingEvents.filter((event) => {
    const startDate = event.start_date ? new Date(event.start_date).getTime() : NaN;
    return !Number.isNaN(startDate) && startDate <= thirtyDaysFromNow;
  });

  const outOfStockItems = inventory.filter((item) => Number(item.stock_quantity) === 0);
  const lowStockItems = inventory.filter((item) => Number(item.stock_quantity) <= Number(item.minimum_stock));

  const restockPriority = lowStockItems
    .map((item) => {
      const stock = Number(item.stock_quantity) || 0;
      const minimum = Number(item.minimum_stock) || 0;
      const shortage = Math.max(minimum - stock, 0);
      const severity = minimum > 0 ? Number((stock / minimum).toFixed(2)) : 1;

      return {
        item_id: item.item_id,
        item_name: item.item_name,
        stock_quantity: stock,
        minimum_stock: minimum,
        shortage,
        severity,
        urgency: stock === 0 ? 'critical' : (severity <= 0.5 ? 'high' : 'medium')
      };
    })
    .sort((a, b) => b.shortage - a.shortage)
    .slice(0, 5);

  const activeProcurementCount = procurement.filter((request) => {
    const status = (request.status || '').toLowerCase();
    return status !== 'completed' && status !== 'cancelled' && status !== 'rejected';
  }).length;

  const operationalRiskLevel = outOfStockItems.length > 0
    ? 'high'
    : (lowStockItems.length >= 5 || next30DaysEvents.length >= 5 ? 'medium' : 'low');

  return {
    generated_at: new Date().toISOString(),
    operationalRiskLevel,
    inventory: {
      totalItems: inventory.length,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      restockPriority
    },
    events: {
      upcomingEventsCount: upcomingEvents.length,
      next30DaysEventsCount: next30DaysEvents.length,
      next30DaysEventList: next30DaysEvents.slice(0, 5).map((event) => ({
        event_id: event.event_id,
        event_name: event.event_name,
        start_date: event.start_date,
        location: event.location,
        status: event.status
      }))
    },
    procurement: {
      activeProcurementCount
    }
  };
}

function getFallbackResponse(message, data) {
  const lowerMessage = message.toLowerCase();

  const isIndonesian = /halo|hai|apa|bagaimana|bisa|tidak|ya|ada|berapa|berapa banyak|saya|aku|kamu|anda|tolong|bantu|pelanggan|acara|aset|stok|pembelian|bahasa|indonesia|siapa/.test(lowerMessage);

  if (lowerMessage.includes('download') || lowerMessage.includes('excel') || lowerMessage.includes('csv') || lowerMessage.includes('export')) {
    let module = null;
    if (lowerMessage.includes('procurement') || lowerMessage.includes('purchasing') || lowerMessage.includes('pembelian') || lowerMessage.includes('purchase')) module = 'procurement';
    else if (lowerMessage.includes('inventory') || lowerMessage.includes('stock') || lowerMessage.includes('stok') || lowerMessage.includes('barang')) module = 'inventory';
    else if (lowerMessage.includes('customer') || lowerMessage.includes('pelanggan') || lowerMessage.includes('klien')) module = 'customers';
    else if (lowerMessage.includes('event') || lowerMessage.includes('acara')) module = 'events';
    else if (lowerMessage.includes('accounting') || lowerMessage.includes('keuangan') || lowerMessage.includes('laporan')) module = 'accounting';
    else if (lowerMessage.includes('asset') || lowerMessage.includes('aset')) module = 'assets';

    if (module) {
      const filters = {};
      
      const statusMatch = message.match(/status(?:nya|-nya)?(?:\s+(?:sudah|adalah|is|are|=|:))?\s+([A-Za-z][A-Za-z\s]*)/i);
      if (statusMatch) {
        const rawStatus = statusMatch[1].trim();
        if (module === 'events') filters.status = rawStatus.toLowerCase().replace(/\s+/g, '_');
        else if (module === 'inventory') filters.stock_status = rawStatus.toLowerCase().replace(/\s+/g, '_');
        else if (module === 'procurement') filters.status = rawStatus.split(' ').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        else filters.status = rawStatus;
      }

      if (module === 'assets') {
        const condMatch = message.match(/kondisi(?:\s+(?:adalah|is|=|:))?\s+([A-Za-z]+)/i) || message.match(/condition(?:\s+(?:is|=|:))?\s+([A-Za-z]+)/i);
        if (condMatch) {
          const rawCond = condMatch[1].trim();
          filters.condition = rawCond.charAt(0).toUpperCase() + rawCond.slice(1).toLowerCase();
        } else {
          if (lowerMessage.includes('good') || lowerMessage.includes('bagus')) filters.condition = 'Good';
          else if (lowerMessage.includes('fair') || lowerMessage.includes('cukup')) filters.condition = 'Fair';
          else if (lowerMessage.includes('poor') || lowerMessage.includes('rusak')) filters.condition = 'Poor';
        }

        const categories = [];
        if (lowerMessage.includes('camera gear') || lowerMessage.includes('kamera')) categories.push('Camera Gear');
        if (lowerMessage.includes('computer') || lowerMessage.includes('komputer')) categories.push('Computers');
        if (lowerMessage.includes('lighting') || lowerMessage.includes('lampu')) categories.push('Lighting');
        if (lowerMessage.includes('props') || lowerMessage.includes('properti')) categories.push('Props');
        if (categories.length > 0) {
          filters.category = categories.join(',');
        }

        if (lowerMessage.includes('studio a')) filters.location = 'Studio A';
        else if (lowerMessage.includes('studio b')) filters.location = 'Studio B';
        else if (lowerMessage.includes('warehouse') || lowerMessage.includes('gudang')) filters.location = 'Warehouse';
      }

      let startDate = null;
      let endDate = null;

      const allDates = [...message.matchAll(/(\d{4}-\d{2}-\d{2})/g)].map(m => m[1]);
      if (allDates.length >= 2) {
        startDate = allDates[0];
        endDate = allDates[1];
      } else if (allDates.length === 1) {
        startDate = allDates[0];
      }

      if (!startDate) {
        const months = {
          jan: '01', januari: '01', january: '01',
          feb: '02', februari: '02', february: '02',
          mar: '03', maret: '03', march: '03',
          apr: '04', april: '04',
          mei: '05', may: '05',
          jun: '06', juni: '06', june: '06',
          jul: '07', juli: '07', july: '07',
          agu: '08', agustus: '08', august: '08',
          sep: '09', september: '09',
          okt: '10', oktober: '10', october: '10',
          nov: '11', november: '11',
          des: '12', desember: '12', december: '12'
        };

        const writtenDateRegex = /(?:(\d{1,2})\s+)?([A-Za-z]+)\s+(\d{1,2})?,?\s*(\d{4})/g;
        const matches = [...message.matchAll(writtenDateRegex)];
        const parsedDates = [];

        for (const m of matches) {
          const day = m[1] || m[3] || '01';
          const monthStr = m[2].toLowerCase().substring(0, 3);
          const year = m[4];
          const monthNum = months[monthStr];
          if (monthNum) {
            const formattedDate = `${year}-${monthNum}-${day.padStart(2, '0')}`;
            parsedDates.push(formattedDate);
          }
        }

        if (parsedDates.length >= 2) {
          startDate = parsedDates[0];
          endDate = parsedDates[1];
        } else if (parsedDates.length === 1) {
          startDate = parsedDates[0];
        }
      }

      if (lowerMessage.includes('hari ini') || lowerMessage.includes('today')) {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (startDate && !endDate) {
          endDate = todayStr;
        } else if (!startDate) {
          startDate = todayStr;
          endDate = todayStr;
        }
      }

      if (startDate) {
        if (module === 'procurement') filters.createdAt = startDate;
        else filters.startDate = startDate;
      }
      if (endDate) {
        filters.endDate = endDate;
      }

      if (module === 'customers') {
        if (lowerMessage.includes('in studio') || lowerMessage.includes('in_studio')) filters.segment = 'in_studio';
        else if (lowerMessage.includes('off site') || lowerMessage.includes('offsite') || lowerMessage.includes('off_site')) filters.segment = 'off_site';
      }

      const query = Object.entries(filters).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      const link = `download:excel:${module}:${query || 'all'}`;
      const text = `Download Excel ${module}`;

      return isIndonesian
        ? `Tentu! Klik tombol di bawah untuk download Excel ${module} yang kamu minta:\n\n[${text}](${link})`
        : `Sure! Click the button below to download the ${module} Excel file you requested:\n\n[${text}](${link})`;
    }
  }

  if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('halo') || lowerMessage.includes('hai')) {
    return isIndonesian
      ? 'Halo! Aku **SnapFunny**, asisten AI untuk **SnapFun Resource System**. Ada yang bisa aku bantu? Kamu bisa tanya tentang customers, events, assets, inventory, atau procurement. Atau sekadar ngobrol santai! 😊'
      : 'Hello! I am **SnapFunny**, the AI assistant for **SnapFun Resource System**. How can I help you today? You can ask me about customers, events, assets, inventory, or procurement. Or we can just chat! 😊';
  }

  if (lowerMessage.includes('lapar') || lowerMessage.includes('hungry')) {
    return isIndonesian
      ? 'Lapar ya? Mending makan dulu, biar semangat kerjanya! 🍕 Ada ide mau makan apa?'
      : 'Hungry? You should grab something to eat first to keep your energy up! 🍕 Any ideas what you want to eat?';
  }

  if (lowerMessage.includes('bosan') || lowerMessage.includes('boring') || lowerMessage.includes('bored')) {
    return isIndonesian
      ? 'Bosan? Mungkin bisa coba lihat-lihat data di sistem, atau main game sebentar! 🎮 Atau mau aku bantu cari info tentang events atau customers?'
      : 'Bored? Maybe you could check out some data in the system, or take a quick game break! 🎮 Or would you like me to help you find info about events or customers?';
  }

  if (lowerMessage.includes('lelah') || lowerMessage.includes('tired') || lowerMessage.includes('capek')) {
    return isIndonesian
      ? 'Jangan lupa istirahat ya! 💪 Kesehatan itu penting. Kalau butuh bantuan dengan sistem, aku di sini.'
      : 'Don\'t forget to take a break! 💪 Your health is important. If you need help with the system, I\'m here.';
  }

  if (lowerMessage.includes('sedih') || lowerMessage.includes('sad') || lowerMessage.includes('down')) {
    return isIndonesian
      ? 'Jangan sedih ya! 😊 Semua akan baik-baik saja. Kalau butuh teman ngobrol, aku di sini. Atau mau fokus kerja untuk distraksi?'
      : 'Don\'t be sad! 😊 Everything will be okay. If you need someone to talk to, I\'m here. Or would you like to focus on work as a distraction?';
  }

  if (lowerMessage.includes('senang') || lowerMessage.includes('happy') || lowerMessage.includes('bahagia')) {
    return isIndonesian
      ? 'Senang mendengarnya! 😄 Semangat terus ya! Ada yang bisa aku bantu hari ini?'
      : 'Glad to hear that! 😄 Keep up the good energy! Is there anything I can help you with today?';
  }

  if (lowerMessage.includes('terima kasih') || lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    return isIndonesian
      ? 'Sama-sama! 😊 Senang bisa membantu. Ada lagi yang perlu aku bantu?'
      : 'You\'re welcome! 😊 Happy to help. Is there anything else you need assistance with?';
  }

  if (lowerMessage.includes('siapa kamu') || lowerMessage.includes('who are you')) {
    return isIndonesian
      ? 'Aku **SnapFunny**, asisten AI untuk **SnapFun Resource System**. Aku bisa bantu kamu dengan data customers, events, assets, inventory, dan procurement. Atau kita bisa ngobrol santai! 😊'
      : 'I\'m **SnapFunny**, the AI assistant for **SnapFun Resource System**. I can help you with customer, event, asset, inventory, and procurement data. Or we can just chat! 😊';
  }
  
  if (lowerMessage.includes('bahasa') || lowerMessage.includes('language') || lowerMessage.includes('english')) {
    return isIndonesian
      ? 'Ya, aku bisa berbahasa Indonesia dan Inggris! Silakan tanya dalam bahasa apa saja yang kamu mau.'
      : 'Yes, I can speak both English and Indonesian! Feel free to ask your questions in either language.';
  }

  if (
    lowerMessage.includes('maintenance') ||
    lowerMessage.includes('maintanance') ||
    lowerMessage.includes('servis') ||
    lowerMessage.includes('service')
  ) {
    const assets = data.assets || [];
    const maintenanceAssets = assets.filter(a => (a.status || '').toLowerCase() === 'maintenance');
    const inUseAssets = assets.filter(a => (a.status || '').toLowerCase() === 'in use');
    const candidates = [...maintenanceAssets, ...inUseAssets];
    const fallbackCandidates = assets
      .filter(a => a.created_at)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(0, 5);

    if (assets.length === 0) {
      return isIndonesian
        ? 'Saat ini belum ada data asset untuk dianalisis.'
        : 'There are no assets available to analyze right now.';
    }

    const listSource = candidates.length > 0 ? candidates.slice(0, 5) : fallbackCandidates;
    const list = listSource
      .map(a => `- **${a.name}** (Status: ${a.status || 'Unknown'})`)
      .join('\n');

    return isIndonesian
      ? `Berikut rekomendasi asset yang perlu dicek maintenance (berdasarkan status & usia data):\n\n${list}\n\nSaran: prioritaskan asset yang sering **In Use** atau berstatus **Maintenance**.`
      : `Here are asset maintenance recommendations (based on status & asset age):\n\n${list}\n\nSuggestion: prioritize assets that are frequently **In Use** or already in **Maintenance** status.`;
  }
  
  if (lowerMessage.includes('customer') || lowerMessage.includes('pelanggan') || lowerMessage.includes('siapa saja') || lowerMessage.includes('siapa aja')) {
    const customers = data.customers || [];
    const inStudioCustomers = customers.filter(c => c.is_in_studio);
    const offSiteCustomers = customers.filter(c => c.is_off_site);

    if (lowerMessage.includes('in studio') || lowerMessage.includes('studio')) {
      if (inStudioCustomers.length === 0) {
        return isIndonesian
          ? 'Tidak ada customer **In Studio** terdaftar saat ini.'
          : 'There are currently no **In Studio** customers registered.';
      }
      const list = inStudioCustomers.map(c => `- **${c.name}** (Visits: ${c.total_visits}, Spending: Rp ${Number(c.total_spending).toLocaleString('id-ID')})`).join('\n');
      return isIndonesian
        ? `Berikut adalah list customer **In Studio**:\n\n${list}`
        : `Here are the **In Studio** customers:\n\n${list}`;
    }

    if (lowerMessage.includes('off site') || lowerMessage.includes('offsite')) {
      if (offSiteCustomers.length === 0) {
        return isIndonesian
          ? 'Tidak ada customer **Off Site** terdaftar saat ini.'
          : 'There are currently no **Off Site** customers registered.';
      }
      const list = offSiteCustomers.map(c => `- **${c.name}** (Visits: ${c.total_visits}, Spending: Rp ${Number(c.total_spending).toLocaleString('id-ID')})`).join('\n');
      return isIndonesian
        ? `Berikut adalah list customer **Off Site**:\n\n${list}`
        : `Here are the **Off Site** customers:\n\n${list}`;
    }

    const customerCount = customers.length;
    return isIndonesian
      ? `Saat ini ada **${customerCount}** customer di sistem. **${inStudioCustomers.length}** In Studio dan **${offSiteCustomers.length}** Off Site. Kamu bisa tanya lebih spesifik seperti *"siapa saja customer in studio?"*`
      : `There are currently **${customerCount}** customers in the system. **${inStudioCustomers.length}** In Studio and **${offSiteCustomers.length}** Off Site. You can ask specifically *"who are the in studio customers?"*`;
  }
  
  if (lowerMessage.includes('event') || lowerMessage.includes('acara')) {
    const events = data.events || [];
    const completed = events.filter(e => e.status?.toLowerCase() === 'completed');
    const upcoming = events.filter(e => e.status?.toLowerCase() === 'upcoming');
    const inProgress = events.filter(e => e.status?.toLowerCase() === 'in_progress');

    if (lowerMessage.includes('upcoming') || lowerMessage.includes('mendatang')) {
      if (upcoming.length === 0) return isIndonesian ? 'Tidak ada event **upcoming**.' : 'No **upcoming** events found.';
      const list = upcoming.map(e => `- **${e.event_name}** (${e.location})`).join('\n');
      return isIndonesian ? `Berikut event **upcoming**:\n\n${list}` : `Here are the **upcoming** events:\n\n${list}`;
    }

    if (lowerMessage.includes('completed') || lowerMessage.includes('selesai')) {
      if (completed.length === 0) return isIndonesian ? 'Tidak ada event **completed**.' : 'No **completed** events found.';
      const list = completed.map(e => `- **${e.event_name}** (${e.location})`).join('\n');
      return isIndonesian ? `Berikut event **completed**:\n\n${list}` : `Here are the **completed** events:\n\n${list}`;
    }

    return isIndonesian
      ? `Saat ini ada **${events.length}** event di sistem. **${completed.length}** selesai, **${upcoming.length}** upcoming, dan **${inProgress.length}** sedang berlangsung.`
      : `There are currently **${events.length}** events in the system. **${completed.length}** completed, **${upcoming.length}** upcoming, and **${inProgress.length}** in progress.`;
  }
  
  if (lowerMessage.includes('asset') || lowerMessage.includes('aset')) {
    const assets = data.assets || [];
    const available = assets.filter(a => a.status === 'Available');
    const inUse = assets.filter(a => a.status === 'In Use');
    return isIndonesian
      ? `Saat ini ada **${assets.length}** asset: **${available.length}** Available dan **${inUse.length}** In Use.`
      : `There are currently **${assets.length}** assets: **${available.length}** Available and **${inUse.length}** In Use.`;
  }
  
  if (lowerMessage.includes('inventory') || lowerMessage.includes('stok') || lowerMessage.includes('stock')) {
    const inventory = data.inventory || [];
    const lowStock = inventory.filter(i => i.stock_quantity <= i.minimum_stock);
    const noStock = inventory.filter(i => i.stock_quantity === 0);

    if (lowerMessage.includes('menipis') || lowerMessage.includes('low') || lowerMessage.includes('kurang')) {
      if (lowStock.length === 0) return isIndonesian ? 'Tidak ada stok menipis.' : 'No low stock items.';
      const list = lowStock.map(i => `- **${i.item_name}** (Stok: ${i.stock_quantity})`).join('\n');
      return isIndonesian ? `Berikut item dengan stok menipis:\n\n${list}` : `Here are low stock items:\n\n${list}`;
    }

    if (lowerMessage.includes('kosong') || lowerMessage.includes('habis') || lowerMessage.includes('no stock') || lowerMessage.includes('nol')) {
      if (noStock.length === 0) return isIndonesian ? 'Semua item ready, tidak ada yang kosong.' : 'All items are in stock.';
      const list = noStock.map(i => `- **${i.item_name}**`).join('\n');
      return isIndonesian ? `Berikut item yang habis:\n\n${list}` : `Here are out of stock items:\n\n${list}`;
    }

    return isIndonesian
      ? `Ada **${inventory.length}** item di inventory. **${lowStock.length}** low stock, **${noStock.length}** habis.`
      : `There are **${inventory.length}** items in inventory. **${lowStock.length}** low stock, **${noStock.length}** out of stock.`;
  }

  if (
    lowerMessage.includes('fast-moving') ||
    lowerMessage.includes('fast moving') ||
    lowerMessage.includes('trend inventory') ||
    lowerMessage.includes('trend stok') ||
    lowerMessage.includes('trend inventory')
  ) {
    const inventory = data.inventory || [];
    const sorted = [...inventory].sort((a, b) => {
      const aGap = Math.max(Number(a.minimum_stock || 0) - Number(a.stock_quantity || 0), 0);
      const bGap = Math.max(Number(b.minimum_stock || 0) - Number(b.stock_quantity || 0), 0);
      if (bGap !== aGap) return bGap - aGap;
      return Number(a.stock_quantity || 0) - Number(b.stock_quantity || 0);
    });
    const topList = sorted.slice(0, 5);

    if (topList.length === 0) {
      return isIndonesian
        ? 'Tidak ada data inventory untuk dianalisis.'
        : 'No inventory data available for trend analysis.';
    }

    const list = topList
      .map(item => `- **${item.item_name}** (Stok: ${item.stock_quantity}, Min: ${item.minimum_stock})`)
      .join('\n');

    return isIndonesian
      ? `Trend fast-moving inventory (berdasarkan gap stok vs minimum):\n\n${list}\n\nRekomendasi: prioritaskan item dengan gap terbesar.`
      : `Fast-moving inventory trend (based on stock gap vs minimum):\n\n${list}\n\nRecommendation: prioritize items with the largest gaps.`;
  }

  if (
    lowerMessage.includes('ringkasan finansial') ||
    lowerMessage.includes('financial summary') ||
    lowerMessage.includes('ringkasan keuangan') ||
    lowerMessage.includes('profit') ||
    lowerMessage.includes('pendapatan')
  ) {
    const events = data.events || [];
    const customers = data.customers || [];
    const customerMap = new Map(customers.map(c => [c.customer_id, c]));
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    const summarizeMonth = (month, year) => {
      const monthEvents = events.filter(event => {
        if (!event.start_date) return false;
        const start = new Date(event.start_date);
        return start.getMonth() === month && start.getFullYear() === year;
      });
      const totalRevenue = monthEvents.reduce((sum, event) => sum + Number(event.expected_revenue || 0), 0);
      const offSiteRevenue = monthEvents.reduce((sum, event) => {
        const customer = customerMap.get(event.customer_id);
        if (customer?.is_off_site) {
          return sum + Number(event.expected_revenue || 0);
        }
        return sum;
      }, 0);
      return { totalRevenue, offSiteRevenue, count: monthEvents.length };
    };

    const currentSummary = summarizeMonth(currentMonth, currentYear);
    const prevSummary = summarizeMonth(prevMonth, prevYear);
    const diff = currentSummary.totalRevenue - prevSummary.totalRevenue;
    const diffPercent = prevSummary.totalRevenue > 0
      ? ((diff / prevSummary.totalRevenue) * 100).toFixed(1)
      : null;

    const diffText = diffPercent === null
      ? (isIndonesian ? 'belum ada pembanding bulan lalu' : 'no previous month comparison yet')
      : (diff >= 0
        ? (isIndonesian ? `naik ${diffPercent}%` : `up by ${diffPercent}%`)
        : (isIndonesian ? `turun ${Math.abs(diffPercent)}%` : `down by ${Math.abs(diffPercent)}%`));

    return isIndonesian
      ? `Ringkasan finansial bulan ini:\n\n- Total pendapatan: **Rp ${Number(currentSummary.totalRevenue).toLocaleString('id-ID')}**\n- Jumlah event: **${currentSummary.count}**\n- Kontribusi Off-Site: **Rp ${Number(currentSummary.offSiteRevenue).toLocaleString('id-ID')}**\n- Perbandingan vs bulan lalu: **${diffText}**\n\nRekomendasi: fokuskan promosi pada layanan dengan kontribusi Off-Site tertinggi.`
      : `This month's financial summary:\n\n- Total revenue: **Rp ${Number(currentSummary.totalRevenue).toLocaleString('id-ID')}**\n- Total events: **${currentSummary.count}**\n- Off-Site contribution: **Rp ${Number(currentSummary.offSiteRevenue).toLocaleString('id-ID')}**\n- Vs last month: **${diffText}**\n\nRecommendation: prioritize promotions on the strongest Off-Site services.`;
  }

  if (
    lowerMessage.includes('prediksi') ||
    lowerMessage.includes('prediction') ||
    lowerMessage.includes('forecast') ||
    lowerMessage.includes('restock') ||
    lowerMessage.includes('persiapan') ||
    lowerMessage.includes('prepare') ||
    lowerMessage.includes('planning') ||
    lowerMessage.includes('rencana')
  ) {
    const predictive = data.predictiveInsights || buildPredictiveInsights(data);
    const priorities = predictive.inventory?.restockPriority || [];

    if (priorities.length === 0) {
      return isIndonesian
        ? `Risiko operasional saat ini **${predictive.operationalRiskLevel}**. Tidak ada item prioritas restock saat ini. Event 30 hari ke depan: **${predictive.events?.next30DaysEventsCount || 0}**.`
        : `Current operational risk is **${predictive.operationalRiskLevel}**. There are no urgent restock priorities right now. Events in the next 30 days: **${predictive.events?.next30DaysEventsCount || 0}**.`;
    }

    const topList = priorities
      .slice(0, 3)
      .map((item) => `- **${item.item_name}** (Stock: ${item.stock_quantity}, Min: ${item.minimum_stock}, Gap: ${item.shortage})`)
      .join('\n');

    return isIndonesian
      ? `Prediksi operasional saat ini:\n\n- Risk level: **${predictive.operationalRiskLevel}**\n- Event 30 hari ke depan: **${predictive.events?.next30DaysEventsCount || 0}**\n- PR aktif: **${predictive.procurement?.activeProcurementCount || 0}**\n\nPrioritas restock utama:\n${topList}\n\nRekomendasi: fokus restock item di atas sebelum beban event meningkat.`
      : `Current operational prediction:\n\n- Risk level: **${predictive.operationalRiskLevel}**\n- Events in next 30 days: **${predictive.events?.next30DaysEventsCount || 0}**\n- Active procurement requests: **${predictive.procurement?.activeProcurementCount || 0}**\n\nTop restock priorities:\n${topList}\n\nRecommendation: prioritize restocking the items above before event workload increases.`;
  }
  
  return isIndonesian
    ? 'Maaf, Google API sedang limit (Quotas Exhausted). Namun aku berhasil mengambil data langsung dari sistem database:\n\nSilakan tanya tentang: **customers**, **events**, **assets**, **inventory**, atau **procurement**.'
    : 'I apologize, but Google API is currently hitting rate limits. However, I fetched current records directly from your database:\n\nYou can ask details about **customers**, **events**, **assets**, **inventory**, or **procurement**.';
}

router.post('/chat', async (req, res) => {
  const db = req.app.locals.db;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  try {
    const dataPromises = [
      new Promise((resolve, reject) => {
        db.query('SELECT customer_id, name, phone_number, email, total_visits, last_visit_date, total_spending, is_in_studio, is_off_site FROM customers', (err, results) => {
          if (err) reject(err);
          else resolve({ customers: results });
        });
      }),
      new Promise((resolve, reject) => {
        db.query('SELECT event_id, event_name, customer, start_date, end_date, location, status, expected_revenue, created_at FROM events', (err, results) => {
          if (err) reject(err);
          else resolve({ events: results });
        });
      }),
      new Promise((resolve, reject) => {
        db.query('SELECT asset_id, name, status, quantity, created_at FROM assets', (err, results) => {
          if (err) reject(err);
          else resolve({ assets: results });
        });
      }),
      new Promise((resolve, reject) => {
        db.query('SELECT item_id, item_name, stock_quantity, minimum_stock, uom, created_at FROM inventory', (err, results) => {
          if (err) reject(err);
          else resolve({ inventory: results });
        });
      }),
      new Promise((resolve, reject) => {
        db.query('SELECT pr_id, requested_by, status, total_cost, created_at FROM procurement_requests', (err, results) => {
          if (err) reject(err);
          else resolve({ procurement: results });
        });
      }),
      new Promise((resolve, reject) => {
        db.query('SELECT category_id, category_name FROM categories', (err, results) => {
          if (err) reject(err);
          else resolve({ categories: results });
        });
      }),
      new Promise((resolve, reject) => {
        db.query('SELECT visit_id, customer_id, visit_date, spending FROM customer_visits', (err, results) => {
          if (err) reject(err);
          else resolve({ customerVisits: results });
        });
      })
    ];

    const allData = await Promise.all(dataPromises);
    const systemData = Object.assign({}, ...allData);
    systemData.predictiveInsights = buildPredictiveInsights(systemData);

    const modelNamesToTry = [
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro"
    ];

    let aiResponse = null;
    let usedModel = null;

    for (const modelName of modelNamesToTry) {
      try {
        console.log(`[SnapFunny] Attempting to use model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const contextData = JSON.stringify(systemData, null, 2);
        const prompt = `${SYSTEM_INSTRUCTION}\n\nSystem Data Context:\n${contextData}\n\nUser Question: ${message}`;
        
        const result = await model.generateContent(prompt);
        aiResponse = result.response.text();
        usedModel = modelName;
        
        console.log(`[SnapFunny] Success! Response received using model: ${usedModel}`);
        break;
      } catch (err) {
        console.error(`[SnapFunny] Model ${modelName} failed:`, err.message);
        continue;
      }
    }

    if (aiResponse) {
      return res.json({
        success: true,
        response: aiResponse,
        isFallback: false,
        model: usedModel
      });
    }

    console.log('[SnapFunny] All AI attempts failed, using rule-based fallback.');
    const fallbackResponse = getFallbackResponse(message, systemData);
    return res.json({
      success: true,
      response: fallbackResponse,
      isFallback: true
    });
  } catch (error) {
    console.error('Error in chatbot endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Custom export endpoint for flexible column selection
router.post('/custom-export', async (req, res) => {
  const db = req.app.locals.db;
  const { module, columns, filters } = req.body;

  if (!module || !columns || !Array.isArray(columns) || columns.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Module and columns array are required'
    });
  }

  try {
    let query = '';
    let params = [];

    // Column mapping for each module
    const columnMap = {
      assets: {
        'asset_id': 'asset_id',
        'name': 'name',
        'category': 'category',
        'status': 'status',
        'location': 'location',
        'condition': 'condition',
        'quantity': 'quantity',
        'created_at': 'created_at'
      },
      inventory: {
        'item_id': 'item_id',
        'item_name': 'item_name',
        'category_name': 'category_name',
        'stock_quantity': 'stock_quantity',
        'minimum_stock': 'minimum_stock',
        'uom_name': 'uom_name',
        'stock_status': 'stock_status',
        'last_update': 'last_update'
      },
      events: {
        'event_id': 'event_id',
        'event_name': 'event_name',
        'start_date': 'start_date',
        'end_date': 'end_date',
        'location': 'location',
        'customer': 'customer',
        'package_name': 'package_name',
        'status': 'status',
        'expected_revenue': 'expected_revenue'
      },
      customers: {
        'customer_id': 'customer_id',
        'name': 'name',
        'phone_number': 'phone_number',
        'email': 'email',
        'total_visits': 'total_visits',
        'total_spending': 'total_spending',
        'is_in_studio': 'is_in_studio',
        'is_off_site': 'is_off_site'
      },
      procurement: {
        'pr_id': 'pr_id',
        'requested_by': 'requested_by',
        'status': 'status',
        'total_cost': 'total_cost',
        'created_at': 'created_at',
        'supplier': 'supplier',
        'vendor': 'vendor'
      }
    };

    const tableMap = {
      assets: 'assets',
      inventory: 'inventory',
      events: 'events',
      customers: 'customers',
      procurement: 'procurement_requests'
    };

    const validColumns = columnMap[module];
    const tableName = tableMap[module];

    if (!validColumns || !tableName) {
      return res.status(400).json({
        success: false,
        message: `Invalid module: ${module}`
      });
    }

    // Validate requested columns
    const validRequestedColumns = columns.filter(col => validColumns[col]);
    if (validRequestedColumns.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid columns specified'
      });
    }

    // Build query with selected columns
    const selectedColumns = validRequestedColumns.map(col => validColumns[col]);
    query = `SELECT ${selectedColumns.join(', ')} FROM ${tableName}`;

    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        query += ' WHERE status = ?';
        params.push(filters.status);
      }
      if (filters.customer_name) {
        query += query.includes('WHERE') ? ' AND' : ' WHERE';
        query += ' name LIKE ?';
        params.push(`%${filters.customer_name}%`);
      }
      if (filters.startDate && filters.endDate) {
        query += query.includes('WHERE') ? ' AND' : ' WHERE';
        query += ' (DATE(start_date) <= ? AND DATE(end_date) >= ?)';
        params.push(filters.endDate, filters.startDate);
      }
    }

    query += ' ORDER BY created_at DESC';

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Error in custom export:', err);
        return res.status(500).json({
          success: false,
          message: 'Error fetching data for custom export'
        });
      }

      res.json({
        success: true,
        data: results,
        columns: validRequestedColumns
      });
    });
  } catch (error) {
    console.error('Error in custom export endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
