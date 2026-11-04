/* Kesit SQL: Sistem kataloğu kopyası. Tamamen kurgusal, elle kurulu örnek veri (hayali Ilgaz Bank portalı, Kasım 2024).
   Görünüm ve sütun adları gerçek SQL Server sistem görünümleriyle aynı tutuldu; T-SQL modunda sys.dm_* ve msdb.dbo.* yazımı bu tablolara yönlenir (dialect.js: revKatalog).
   Motor gerçek DMV çalıştırmaz: buradaki sayılar ölçüm değildir. Yalnız seçili sütunlar vardır. Sütun anlamları Microsoft Learn'den alındı. */
(function (root) {
  const q = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
  const ins = (t, cols, rows) => { let s = ''; for (let i = 0; i < rows.length; i += 400) s += 'INSERT INTO ' + t + ' (' + cols.join(',') + ') VALUES\n' + rows.slice(i, i + 400).map(r => '(' + r.map(q).join(',') + ')').join(',\n') + ';\n'; return s; };
  const pad = n => String(n).padStart(2, '0');
  const fmt = t => { const d = new Date(t); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()); };
  const gun = (d, h, m) => Date.UTC(2024, 10, d, h || 0, m || 0);
  const MIN = 60000, HOUR = 3600000;
  const TAB = {}, META = {}, NOT = {};
  const tablo = (ad, not, kol, rows) => { TAB[ad] = { kol: kol.map(k => k[0]), tip: kol.map(k => k[1]), rows }; META[ad] = kol.map(k => [k[0], k[2], k[3]].concat(k[4] ? [k[4]] : [])); NOT[ad] = 'KURGU. ' + not; };
  const I = (a, b) => [a, 'INTEGER', 'int', b], T = (a, b) => [a, 'TEXT', 'text(300)', b], R = (a, b) => [a, 'REAL', 'decimal(8,2)', b], Z = (a, b) => [a, 'TEXT', 'datetime', b];
  root.SQLP_TYPEMAP.bigint = { tsql: 'BIGINT', pg: 'BIGINT', mysql: 'BIGINT', oracle: 'NUMBER(19)', bq: 'INT64', sqlite: 'INTEGER' };
  const B = (a, b) => [a, 'BIGINT', 'bigint', b];

  /* ---------- Nesneler ve indeksler ---------- */
  const OBJ = { bank_txns: 1001, bank_accounts: 1002, bank_customers: 1003, portal_oturum: 1004, rapor_ozet: 1005 };
  tablo('sys_objects', 'sys.objects kopyası: yalnız bu kurgu senaryodaki nesneler. OBJECT_NAME(object_id) buradan okunur', [I('object_id', 'Nesne'), T('name', 'Ad'), T('type_desc', 'Tür')], Object.keys(OBJ).map(n => [OBJ[n], n, 'USER_TABLE']));
  const IX = [
    ['bank_txns', 1, 'PK_bank_txns', 'CLUSTERED', 1, 0, 1], ['bank_txns', 2, 'IX_txns_hesap_zaman', 'NONCLUSTERED', 0, 0, 0], ['bank_txns', 3, 'IX_txns_tur', 'NONCLUSTERED', 0, 0, 0], ['bank_txns', 4, 'IX_txns_hesap', 'NONCLUSTERED', 0, 0, 0], ['bank_txns', 5, 'IX_txns_ay_sonu', 'NONCLUSTERED', 0, 0, 0],
    ['bank_accounts', 1, 'PK_bank_accounts', 'CLUSTERED', 1, 0, 1], ['bank_accounts', 2, 'IX_accounts_musteri', 'NONCLUSTERED', 0, 0, 0], ['bank_accounts', 3, 'IX_accounts_durum', 'NONCLUSTERED', 0, 0, 0],
    ['bank_customers', 1, 'PK_bank_customers', 'CLUSTERED', 1, 0, 1], ['bank_customers', 2, 'IX_customers_guid', 'NONCLUSTERED', 1, 0, 0], ['bank_customers', 3, 'IX_customers_segment', 'NONCLUSTERED', 0, 60, 0],
    ['portal_oturum', 1, 'PK_portal_oturum', 'CLUSTERED', 1, 0, 1], ['portal_oturum', 2, 'IX_oturum_zaman', 'NONCLUSTERED', 0, 0, 0],
    ['rapor_ozet', 0, null, 'HEAP', 0, 0, 0]
  ];
  tablo('sys_indexes', 'sys.indexes kopyası. T-SQL modunda sorguda object_id, index_id ya da fill_factor geçiyorsa sys.indexes buraya yönlenir. fill_factor 0: varsayılan, sayfa tam dolu', [I('object_id', 'Tablo'), I('index_id', '0 heap, 1 kümelenmiş, 2+ kümelenmemiş'), T('name', 'İndeks'), T('type_desc', 'Tür'), I('is_unique', 'Tekil mi'), I('fill_factor', 'Doluluk'), I('is_primary_key', 'Birincil anahtar mı')], IX.map(x => [OBJ[x[0]], x[1], x[2], x[3], x[4], x[5], x[6]]));
  const SNAP = '2024-11-12 10:00:00';
  tablo('sys_dm_os_sys_info', 'sys.dm_os_sys_info kopyası: tek sütun. sqlserver_start_time motorun son açılışı; kullanım sayaçları bundan beri birikir', [Z('sqlserver_start_time', 'Son başlatma')], [['2024-11-10 03:10:00']]);
  const U = [ // ad, sıra, seek, scan, lookup, update, son seek, son update
    ['bank_txns', 1, 182000, 340, 96000, 41200, '2024-11-12 09:58:11', '2024-11-12 09:59:40'], ['bank_txns', 2, 96000, 12, 0, 41200, '2024-11-12 09:58:11', '2024-11-12 09:59:40'], ['bank_txns', 3, 0, 0, 0, 41200, null, '2024-11-12 09:59:40'], ['bank_txns', 4, 14, 0, 0, 41200, '2024-11-11 16:02:00', '2024-11-12 09:59:40'], ['bank_txns', 5, 0, 0, 0, 41200, null, '2024-11-12 09:59:40'],
    ['bank_accounts', 1, 240000, 22, 18000, 900, '2024-11-12 09:58:30', '2024-11-12 09:40:00'], ['bank_accounts', 2, 18000, 3, 0, 40, '2024-11-12 09:58:30', '2024-11-12 08:10:00'],
    ['bank_customers', 1, 120000, 15, 4000, 300, '2024-11-12 09:57:00', '2024-11-12 09:30:00'], ['bank_customers', 2, 8500, 0, 4000, 300, '2024-11-12 09:57:00', '2024-11-12 09:30:00'], ['bank_customers', 3, 0, 410, 0, 120, null, '2024-11-12 09:30:00'],
    ['portal_oturum', 1, 64000, 8, 0, 64000, '2024-11-12 09:59:50', '2024-11-12 09:59:55'], ['portal_oturum', 2, 3100, 2, 3100, 64000, '2024-11-12 09:59:50', '2024-11-12 09:59:55']
  ];
  tablo('sys_dm_db_index_usage_stats', 'sys.dm_db_index_usage_stats kopyası: son başlatmadan beri. Hiç kullanılmamış indeksin satırı olmayabilir (IX_accounts_durum). user_updates işlem sayısıdır, satır sayısı değildir', [I('database_id', 'Veritabanı'), I('object_id', 'Tablo'), I('index_id', 'İndeks'), I('user_seeks', 'Arama'), I('user_scans', 'Tarama'), I('user_lookups', 'Yer imi arama'), I('user_updates', 'Bakım işlemi'), Z('last_user_seek', 'Son arama'), Z('last_user_update', 'Son güncelleme')], U.map(x => [5, OBJ[x[0]], x[1], x[2], x[3], x[4], x[5], x[6], x[7]]));
  const F = [ // ad, sıra, tür, derinlik, parçalanma, parça, yoğunluk, sayfa
    ['bank_txns', 1, 'CLUSTERED INDEX', 4, 2.1, 900, 97.4, 412000], ['bank_txns', 2, 'NONCLUSTERED INDEX', 4, 34.2, 41000, 90.8, 184000], ['bank_txns', 3, 'NONCLUSTERED INDEX', 3, 11.6, 6100, 93.5, 61000], ['bank_txns', 4, 'NONCLUSTERED INDEX', 3, 8.3, 4400, 94.1, 88000], ['bank_txns', 5, 'NONCLUSTERED INDEX', 3, 4.4, 1900, 96.0, 52000],
    ['bank_accounts', 1, 'CLUSTERED INDEX', 2, 1.2, 40, 98.1, 1450], ['bank_accounts', 2, 'NONCLUSTERED INDEX', 2, 18.5, 60, 88.0, 620], ['bank_accounts', 3, 'NONCLUSTERED INDEX', 2, 22.0, 45, 86.2, 300],
    ['bank_customers', 1, 'CLUSTERED INDEX', 3, 3.0, 120, 97.0, 8200], ['bank_customers', 2, 'NONCLUSTERED INDEX', 3, 88.4, 46000, 61.3, 52000], ['bank_customers', 3, 'NONCLUSTERED INDEX', 2, 2.5, 30, 58.9, 2400],
    ['portal_oturum', 1, 'CLUSTERED INDEX', 2, 66.7, 26, 72.0, 40], ['portal_oturum', 2, 'NONCLUSTERED INDEX', 2, 50.0, 12, 75.5, 24],
    ['rapor_ozet', 0, 'HEAP', 1, 0.0, 12, 99.0, 3100]
  ];
  tablo('sys_dm_db_index_physical_stats', 'sys.dm_db_index_physical_stats kopyası (gerçekte işlevdir, dört parametreyle çağrılır; burada parametreler yok sayılır). avg_page_space_used_in_percent gerçekte SAMPLED ya da DETAILED modda dolar', [I('database_id', 'Veritabanı'), I('object_id', 'Tablo'), I('index_id', 'İndeks'), I('partition_number', 'Bölüm'), T('index_type_desc', 'Tür'), T('alloc_unit_type_desc', 'Ayırma birimi'), I('index_depth', 'Derinlik'), I('index_level', 'Düzey, 0 yaprak'), R('avg_fragmentation_in_percent', 'Mantıksal parçalanma %'), I('fragment_count', 'Parça'), R('avg_page_space_used_in_percent', 'Sayfa doluluğu %'), I('page_count', 'Sayfa')], F.map(x => [5, OBJ[x[0]], x[1], 1, x[2], 'IN_ROW_DATA', x[3], 0, x[4], x[5], x[6], x[7]]));

  /* ---------- Sorgu önbelleği ---------- */
  const QS = [ // tanıtıcı, metin, sayı, ort ms, ort cpu ms, ort okuma, satır
    ['0x01', "SELECT * FROM bank_txns WHERE CAST(account_id AS VARCHAR(10)) = @h", 2140, 1860, 1490, 142000, 18],
    ['0x02', "SELECT YEAR(txn_time), MONTH(txn_time), txn_type, SUM(amount) FROM bank_txns WHERE txn_time >= @bas GROUP BY YEAR(txn_time), MONTH(txn_time), txn_type", 58, 9400, 7100, 410000, 72],
    ['0x03', "SELECT TOP (20) txn_id, txn_time, amount FROM bank_txns WHERE account_id = @h ORDER BY txn_time DESC", 96000, 4, 1, 12, 20],
    ['0x04', "SELECT customer_id, full_name, segment FROM bank_customers WHERE customer_id = @m", 120000, 2, 1, 6, 1],
    ['0x05', "INSERT INTO portal_oturum (oturum_id, customer_id, acilis) VALUES (@o, @m, @z)", 64000, 3, 1, 8, 1],
    ['0x06', "UPDATE bank_accounts SET status = @d WHERE account_id = @h", 900, 41, 3, 24, 1],
    ['0x07', "SELECT b.branch_id, COUNT(*), SUM(t.amount) FROM bank_txns t JOIN bank_accounts a ON a.account_id = t.account_id JOIN bank_branches b ON b.branch_id = a.branch_id GROUP BY b.branch_id", 6, 22000, 19000, 460000, 40],
    ['0x08', "EXEC etl_gunluk_yukleme @gun", 2, 310000, 88000, 1900000, 0]
  ];
  tablo('sys_dm_exec_query_stats', 'sys.dm_exec_query_stats kopyası: önbellekteki plan başına. total_elapsed_time ve total_worker_time mikrosaniye; okumalar sayfa. Plan önbellekten düşünce satır kaybolur', [T('sql_handle', 'Metin tanıtıcısı'), Z('creation_time', 'Plan derlenme'), Z('last_execution_time', 'Son çalışma'), I('execution_count', 'Çalışma'), B('total_worker_time', 'CPU, µs'), B('total_elapsed_time', 'Süre, µs'), B('total_logical_reads', 'Mantıksal okuma'), B('total_rows', 'Satır')], QS.map(x => [x[0], x[0] === '0x01' ? '2024-11-12 07:55:00' : '2024-11-10 03:15:00', SNAP, x[2], x[2] * x[4] * 1000, x[2] * x[3] * 1000, x[2] * x[5], x[2] * x[6]]));
  const ST = QS.map(x => [x[0], 5, x[1]]);
  ST.push(['0x20', 5, "UPDATE bank_accounts SET status = 'donuk' WHERE customer_id = @m"], ['0x21', 5, "SELECT balance FROM bank_accounts WHERE account_id = @h"], ['0x22', 5, "UPDATE bank_accounts SET balance = balance - @t WHERE account_id = @h"], ['0x23', 5, "SELECT COUNT(*) FROM bank_accounts WHERE status = 'aktif'"], ['0x24', 5, "SELECT txn_id FROM bank_txns WHERE txn_time >= @bas"]);
  tablo('sys_dm_exec_sql_text', 'sys.dm_exec_sql_text kopyası (gerçekte tablo değerli işlevdir, CROSS APPLY ile çağrılır; bu yazım motorda JOIN e çevrilir). text: tanıtıcının toplu iş metni', [T('sql_handle', 'Tanıtıcı'), I('dbid', 'Veritabanı'), T('text', 'Metin')], ST);
  tablo('sys_dm_os_wait_stats', 'sys.dm_os_wait_stats kopyası: son başlatmadan beri toplam. wait_time_ms sinyal beklemesini de içerir', [T('wait_type', 'Bekleme türü'), I('waiting_tasks_count', 'Bekleme sayısı'), I('wait_time_ms', 'Toplam, ms'), I('max_wait_time_ms', 'En uzun, ms'), I('signal_wait_time_ms', 'Sinyal, ms')], [
    ['LAZYWRITER_SLEEP', 180000, 172000000, 1100, 90], ['SLEEP_TASK', 910000, 165000000, 1000, 2100], ['BROKER_TO_FLUSH', 86000, 160000000, 2000, 40], ['PAGEIOLATCH_SH', 2600000, 9100000, 4200, 41000], ['LCK_M_X', 2100, 6300000, 1740000, 900], ['LCK_M_S', 4300, 4100000, 1720000, 1400], ['SOS_SCHEDULER_YIELD', 8800000, 2300000, 310, 2290000], ['CXPACKET', 1200000, 1900000, 9000, 240000], ['WRITELOG', 720000, 640000, 880, 21000], ['ASYNC_NETWORK_IO', 41000, 390000, 6100, 800]]);

  /* ---------- Engelleme anlık görüntüsü: 12 Kasım 09:40 ---------- */
  tablo('sys_dm_exec_requests', 'sys.dm_exec_requests kopyası: 09:40 anlık görüntüsü. Yalnız çalışan istekler vardır; boşta bekleyen oturum burada görünmez. Süreler ms', [I('session_id', 'Oturum'), T('status', 'Durum'), T('command', 'Komut'), T('sql_handle', 'Metin tanıtıcısı'), I('blocking_session_id', 'Engelleyen oturum'), T('wait_type', 'Bekleme'), I('wait_time', 'Bekleme, ms'), T('wait_resource', 'Beklenen kaynak'), I('total_elapsed_time', 'Toplam süre, ms'), I('logical_reads', 'Okuma'), I('open_transaction_count', 'Açık işlem'), Z('start_time', 'Başlangıç')], [
    [62, 'suspended', 'UPDATE', '0x22', 61, 'LCK_M_U', 1740000, 'KEY: 5:7204:1 (a1b2)', 1741000, 12, 1, '2024-11-12 09:11:00'],
    [63, 'suspended', 'SELECT', '0x21', 62, 'LCK_M_S', 1200000, 'KEY: 5:7204:1 (a1b2)', 1201000, 8, 0, '2024-11-12 09:20:00'],
    [64, 'suspended', 'SELECT', '0x23', 62, 'LCK_M_S', 900000, 'PAGE: 5:1:88213', 901000, 40, 0, '2024-11-12 09:25:00'],
    [70, 'suspended', 'SELECT', '0x21', 61, 'LCK_M_S', 600000, 'KEY: 5:7204:1 (c3d4)', 601000, 6, 0, '2024-11-12 09:30:00'],
    [75, 'running', 'SELECT', '0x24', 0, null, 0, '', 42000, 880000, 0, '2024-11-12 09:39:18'],
    [80, 'runnable', 'INSERT', '0x05', 0, 'SOS_SCHEDULER_YIELD', 2, '', 8, 8, 1, '2024-11-12 09:39:59']]);
  tablo('sys_dm_exec_sessions', 'sys.dm_exec_sessions kopyası: 09:40 anlık görüntüsü. Boşta (sleeping) oturumlar da görünür; open_transaction_count > 0 ise kilit tutuyor olabilir', [I('session_id', 'Oturum'), T('login_name', 'Hesap'), T('host_name', 'Makine'), T('program_name', 'Program'), T('status', 'Durum'), I('open_transaction_count', 'Açık işlem'), Z('last_request_start_time', 'Son istek başlangıcı'), Z('last_request_end_time', 'Son istek bitişi')], [
    [61, 'an_derya', 'DERYA-PC', 'Sorgu editörü', 'sleeping', 1, '2024-11-12 09:06:30', '2024-11-12 09:06:31'],
    [62, 'svc_portal', 'APP01', 'Portal', 'running', 1, '2024-11-12 09:11:00', '2024-11-12 09:10:59'], [63, 'svc_portal', 'APP02', 'Portal', 'running', 0, '2024-11-12 09:20:00', '2024-11-12 09:19:58'], [64, 'svc_rapor', 'RAPOR01', 'Raporlama', 'running', 0, '2024-11-12 09:25:00', '2024-11-12 09:24:50'], [70, 'svc_portal', 'APP01', 'Portal', 'running', 0, '2024-11-12 09:30:00', '2024-11-12 09:29:59'], [75, 'svc_rapor', 'RAPOR01', 'Raporlama', 'running', 0, '2024-11-12 09:39:18', '2024-11-12 09:39:10'], [80, 'svc_portal', 'APP02', 'Portal', 'running', 1, '2024-11-12 09:39:59', '2024-11-12 09:39:59'], [85, 'svc_etl', 'ETL01', 'Yükleme', 'sleeping', 0, '2024-11-12 03:40:00', '2024-11-12 03:58:00']]);
  tablo('sys_dm_tran_active_transactions', 'sys.dm_tran_active_transactions kopyası: açık işlemler', [I('transaction_id', 'İşlem'), T('name', 'Ad'), Z('transaction_begin_time', 'Başlangıç'), I('transaction_state', 'Durum, 2 etkin')], [[9001, 'user_transaction', '2024-11-12 09:06:30', 2], [9002, 'user_transaction', '2024-11-12 09:11:00', 2], [9003, 'user_transaction', '2024-11-12 09:39:59', 2]]);
  tablo('sys_dm_tran_session_transactions', 'sys.dm_tran_session_transactions kopyası: işlem ile oturumu eşler', [I('session_id', 'Oturum'), I('transaction_id', 'İşlem')], [[61, 9001], [62, 9002], [80, 9003]]);

  /* ---------- Query Store ---------- */
  const QTX = [[501, "SELECT YEAR(txn_time), MONTH(txn_time), txn_type, SUM(amount) FROM bank_txns WHERE txn_time >= @bas GROUP BY YEAR(txn_time), MONTH(txn_time), txn_type"], [502, "SELECT TOP (20) txn_id, txn_time, amount FROM bank_txns WHERE account_id = @h ORDER BY txn_time DESC"], [503, "SELECT * FROM bank_txns WHERE CAST(account_id AS VARCHAR(10)) = @h"]];
  tablo('sys_query_store_query_text', 'sys.query_store_query_text kopyası', [I('query_text_id', 'Metin'), T('query_sql_text', 'Sorgu metni')], QTX);
  tablo('sys_query_store_query', 'sys.query_store_query kopyası', [I('query_id', 'Sorgu'), I('query_text_id', 'Metin'), Z('last_execution_time', 'Son çalışma')], [[8, 501, SNAP], [3, 502, SNAP], [11, 503, SNAP]]);
  tablo('sys_query_store_plan', 'sys.query_store_plan kopyası. is_forced_plan 1: plan zorlanmış', [I('plan_id', 'Plan'), I('query_id', 'Sorgu'), I('is_forced_plan', 'Zorlanmış mı'), Z('last_execution_time', 'Son çalışma')], [[21, 8, 0, '2024-11-12 05:59:00'], [22, 8, 0, SNAP], [13, 3, 0, SNAP], [31, 11, 0, SNAP]]);
  const IV = [], RS = []; let rid = 1;
  for (let h = gun(11, 0), n = 1; h < gun(12, 10); h += HOUR, n++) { IV.push([n, fmt(h), fmt(h + HOUR)]); const sonra = h >= gun(12, 6);
    const yaz = (p, say, dur, ok) => RS.push([rid++, p, n, say, dur, ok]);
    const ofis = (new Date(h).getUTCHours() >= 8 && new Date(h).getUTCHours() < 19);
    if (!sonra && new Date(h).getUTCHours() % 2 === 0) yaz(21, 3, 410000 + (n % 5) * 9000, 18000 + (n % 4) * 300); if (sonra) yaz(22, 3, 9300000 + (n % 5) * 60000, 405000 + (n % 4) * 900);
    yaz(13, ofis ? 3800 : 900, 3900 + (n % 3) * 120, 12); if (h >= gun(12, 7)) yaz(31, new Date(h).getUTCHours() === 7 ? 12 : 400, 1800000 + (n % 4) * 25000, 141000 + (n % 3) * 500); }
  tablo('sys_query_store_runtime_stats_interval', 'sys.query_store_runtime_stats_interval kopyası: saatlik aralıklar', [I('runtime_stats_interval_id', 'Aralık'), Z('start_time', 'Başlangıç'), Z('end_time', 'Bitiş')], IV);
  tablo('sys_query_store_runtime_stats', 'sys.query_store_runtime_stats kopyası: plan ve aralık başına. avg_duration mikrosaniye, avg_logical_io_reads 8 KB sayfa', [I('runtime_stats_id', 'Kayıt'), I('plan_id', 'Plan'), I('runtime_stats_interval_id', 'Aralık'), I('count_executions', 'Çalışma'), I('avg_duration', 'Ort. süre, µs'), I('avg_logical_io_reads', 'Ort. okuma')], RS);

  /* ---------- Yetki kataloğu ---------- */
  const PR = [[1, 'dbo', 'S', 'SQL_USER'], [5, 'an_derya', 'S', 'SQL_USER'], [6, 'an_ece', 'S', 'SQL_USER'], [7, 'an_mert', 'S', 'SQL_USER'], [8, 'svc_portal', 'S', 'SQL_USER'], [9, 'svc_rapor', 'S', 'SQL_USER'], [10, 'svc_etl', 'S', 'SQL_USER'], [11, 'svc_eski', 'S', 'SQL_USER'], [20, 'rol_analist', 'R', 'DATABASE_ROLE'], [21, 'rol_portal', 'R', 'DATABASE_ROLE'], [16384, 'db_owner', 'R', 'DATABASE_ROLE'], [16390, 'db_datareader', 'R', 'DATABASE_ROLE']];
  tablo('sys_database_principals', 'sys.database_principals kopyası: kullanıcı ve roller. type S: SQL kullanıcısı, R: rol', [I('principal_id', 'Kimlik'), T('name', 'Ad'), T('type', 'Tür'), T('type_desc', 'Tür adı')], PR);
  tablo('sys_database_role_members', 'sys.database_role_members kopyası: kim hangi rolde', [I('role_principal_id', 'Rol'), I('member_principal_id', 'Üye')], [[20, 5], [20, 6], [20, 7], [21, 8], [16390, 9], [16384, 10], [16384, 11]]);
  const P = (o, g, n, s) => ['OBJECT_OR_COLUMN', OBJ[o], g, n, s, s === 'G' ? 'GRANT' : 'DENY'];
  tablo('sys_database_permissions', 'sys.database_permissions kopyası: major_id nesne, grantee_principal_id yetkinin verildiği kullanıcı ya da rol. state G: GRANT, D: DENY', [T('class_desc', 'Sınıf'), I('major_id', 'Nesne'), I('grantee_principal_id', 'Alan'), T('permission_name', 'Yetki'), T('state', 'Durum kodu'), T('state_desc', 'Durum')], [
    P('bank_txns', 20, 'SELECT', 'G'), P('bank_accounts', 20, 'SELECT', 'G'), P('bank_customers', 20, 'SELECT', 'G'), P('rapor_ozet', 20, 'SELECT', 'G'), P('bank_customers', 7, 'SELECT', 'D'),
    P('bank_txns', 21, 'SELECT', 'G'), P('bank_txns', 21, 'INSERT', 'G'), P('bank_accounts', 21, 'SELECT', 'G'), P('bank_accounts', 21, 'UPDATE', 'G'), P('portal_oturum', 21, 'INSERT', 'G'), P('portal_oturum', 21, 'SELECT', 'G'), P('bank_customers', 21, 'SELECT', 'G'), P('portal_oturum', 6, 'DELETE', 'G')]);

  /* ---------- Yedek kataloğu: msdb ---------- */
  const BK = []; let bid = 7000, lsn = 90000000; /* lsn: günlük zincirinin konumu. Tam ve fark yedeği zinciri kırmaz, ilerletmez */
  const yedek = (db, tur, bas, dk, ek) => { ek = ek || {}; const first = lsn; const last = tur === 'L' ? lsn + (ek.artis || 4000) : lsn + 500; if (tur === 'L') lsn = last; BK.push([bid++, db, tur, fmt(bas), fmt(bas + dk * MIN), first, last, ek.temel || null, ek.fark || null, ek.copy ? 1 : 0, ek.model || 'FULL', ek.boyut || 1]); return first; };
  const tam = yedek('ilgaz_portal', 'D', gun(10, 1), 38, { boyut: 412000 }); let fark = null;
  for (let t = gun(10, 1, 45); t < gun(13, 14, 30); t += 15 * MIN) {
    const d = new Date(t); const tarih = d.getUTCDate(); const saat = d.getUTCHours(), dk = d.getUTCMinutes();
    if (saat === 1 && dk === 0 && tarih > 10) fark = yedek('ilgaz_portal', 'I', t, 9, { temel: tam, fark: tam, boyut: 26000 + (tarih - 10) * 7400 });
    if (tarih === 12 && saat === 10 && dk === 0) yedek('ilgaz_portal', 'D', t - 5 * MIN, 36, { copy: true, temel: tam, boyut: 414000 });
    if (tarih === 13 && saat >= 4 && (saat < 5 || (saat === 5 && dk <= 30))) continue; /* gece bakımında günlük işi durdu: zincir kırılmaz, kayıp penceresi büyür */
    yedek('ilgaz_portal', 'L', t, 1, { temel: tam, boyut: 300 + ((t / MIN) % 97) });
  }
  lsn = 40000000; yedek('raporlama', 'D', gun(4, 2), 20, { model: 'SIMPLE', boyut: 88000 }); yedek('raporlama', 'D', gun(11, 2), 21, { model: 'SIMPLE', boyut: 90500 });
  lsn = 60000000; const ta = yedek('ilgaz_arsiv', 'D', gun(13, 0), 12, { boyut: 51000 });
  for (let i = 0; i < 8; i++) { if (i === 5) lsn += 777000; /* biri modeli değiştirip geri almış: zincir kırık */ yedek('ilgaz_arsiv', 'L', gun(13, 1 + i), 1, { temel: ta, boyut: 40 + i }); }
  tablo('msdb_backupset', 'msdb.dbo.backupset kopyası: yedek geçmişi. type D tam, I fark, L günlük. first_lsn ve last_lsn zinciri gösterir. is_copy_only 1: normal zinciri etkilemez. Boyut MB', [I('backup_set_id', 'Yedek'), T('database_name', 'Veritabanı'), T('type', 'Tür'), Z('backup_start_date', 'Başlangıç'), Z('backup_finish_date', 'Bitiş'), I('first_lsn', 'İlk LSN'), I('last_lsn', 'Sonraki LSN'), I('database_backup_lsn', 'Tam yedek LSN'), I('differential_base_lsn', 'Fark tabanı'), I('is_copy_only', 'Copy-only mi'), T('recovery_model', 'Kurtarma modeli'), I('backup_size_mb', 'Boyut, MB')], BK);

  /* ---------- SQL Agent geçmişi: msdb ---------- */
  const JOB = [['j-a1', 'ETL gunluk yukleme', 1], ['j-a2', 'Yedek gunluk', 1], ['j-a3', 'Indeks bakim', 1], ['j-a4', 'Eski rapor aktarimi', 0]];
  tablo('msdb_sysjobs', 'msdb.dbo.sysjobs kopyası: işler', [T('job_id', 'İş'), T('name', 'Ad'), I('enabled', 'Açık mı')], JOB);
  const JH = []; let iid = 1; const sat = (j, gn, st, ad, durum, saat, sure, mesaj, msg) => JH.push([iid++, j, st, ad, msg || 0, msg ? 16 : 0, mesaj || 'Adım tamamlandı.', durum, 20241100 + gn, saat, sure]);
  for (let gn = 8; gn <= 12; gn++) {
    const ETLHATA = gn === 11 || gn === 12;
    sat('j-a1', gn, 1, 'Kaynaktan oku', 1, 30000, 1420); sat('j-a1', gn, 2, 'Boyutlari yukle', ETLHATA ? 0 : 1, 31420, ETLHATA ? 12 : 318, ETLHATA ? "Cannot insert the value NULL into column 'sube_key'." : '', ETLHATA ? 515 : 0);
    if (!ETLHATA) sat('j-a1', gn, 3, 'Fact yukle', 1, 31738, 905);
    sat('j-a1', gn, 0, '(Job outcome)', ETLHATA ? 0 : 1, 30000, ETLHATA ? 1432 : 2643);
    sat('j-a2', gn, 1, 'Tam ya da fark yedegi', 1, 10000, 900); sat('j-a2', gn, 0, '(Job outcome)', 1, 10000, 900);
    if (gn === 10) { sat('j-a3', gn, 1, 'Yeniden duzenle', 3, 40000, 12000, 'Kullanıcı tarafından iptal edildi.'); sat('j-a3', gn, 0, '(Job outcome)', 3, 40000, 12000); }
  }
  tablo('msdb_sysjobhistory', 'msdb.dbo.sysjobhistory kopyası: run_status 0 başarısız, 1 başarılı, 2 yeniden deneme, 3 iptal, 4 sürüyor. run_date yyyyMMdd, run_time ve run_duration HHmmss biçiminde tam sayı. step_id 0 işin genel sonucu', [I('instance_id', 'Kayıt'), T('job_id', 'İş'), I('step_id', 'Adım'), T('step_name', 'Adım adı'), I('sql_message_id', 'Hata no'), I('sql_severity', 'Önem'), T('message', 'İleti'), I('run_status', 'Durum'), I('run_date', 'Tarih'), I('run_time', 'Saat'), I('run_duration', 'Süre')], JH);

  /* ---------- ETL senaryosu: hayali gece yüklemesi ---------- */
  tablo('etl_stg_hareket', 'Kaynak dosyadan olduğu gibi gelen ham hareketler. Hepsi metin; bozuk tutar, bozuk tarih, boş hesap, mükerrer kayıt ve boyutta olmayan şube bilerek var', [I('stg_id', 'Satır'), T('kaynak_no', 'Kaynak kayıt no'), T('hesap_no', 'Hesap'), T('sube_kodu', 'Şube kodu'), T('islem_tarihi', 'Tarih, metin'), T('tutar', 'Tutar, metin'), T('kanal', 'Kanal')], [
    [1, 'K1001', '100001', 'S01', '2024-11-04', '1250.50', 'mobil'], [2, 'K1002', '100002', 'S01', '2024-11-04', '-300.00', 'atm'], [3, 'K1003', '100003', 'S02', '2024-11-05', '8000', 'sube'], [4, 'K1004', '100004', 'S03', '2024-11-05', 'abc', 'mobil'], [5, 'K1005', '100005', 'S02', '2024-13-05', '450', 'web'], [6, 'K1006', null, 'S03', '2024-11-06', '120', 'web'], [7, 'K1007', '100007', 'S01', '2024-11-06', '75.25', 'mobil'], [8, 'K1007', '100007', 'S01', '2024-11-06', '75.25', 'mobil'], [9, 'K1008', '100008', 'S99', '2024-11-06', '640', 'sube'], [10, 'K1009', '100009', 'S03', '2024-11-07', '2100', 'sube'], [11, 'K1010', '100010', 'S02', '2024-02-10', '990', 'web'], [12, 'K1011', '100011', 'S01', '2024-03-15', '15', 'atm'], [13, 'K1012', '100012', 'S98', '2024-11-07', '33', 'web'], [14, 'K1013', '100013', 'S03', '2024-11-08', 'bilinmiyor', 'mobil']]);
  tablo('etl_stg_sube', 'Kaynaktan gelen bugünkü şube listesi', [T('sube_kodu', 'Şube kodu'), T('sube_adi', 'Ad'), T('sehir', 'Şehir')], [['S01', 'Merkez', 'Bursa'], ['S02', 'Kızılay', 'Eskişehir'], ['S03', 'Alsancak', 'İzmir'], ['S05', 'Konak', 'İzmir']]);
  tablo('etl_dim_sube', 'Şube boyutu, SCD Tip 2. sube_key vekil anahtardır (INSERT ederken verme, kendisi artar); -1 bilinmeyen üyedir. guncel 1: geçerli sürüm', [['sube_key', 'INTEGER PRIMARY KEY', 'int', 'Vekil anahtar', 'pk'], T('sube_kodu', 'İş anahtarı'), T('sube_adi', 'Ad'), T('sehir', 'Şehir'), T('gecerli_bas', 'Geçerlilik başı'), T('gecerli_bit', 'Geçerlilik sonu'), I('guncel', '1 güncel')], [
    [-1, '?', 'Bilinmeyen', null, '1900-01-01', '9999-12-31', 1], [1, 'S01', 'Merkez', 'Ankara', '2020-01-01', '2024-06-30', 0], [2, 'S01', 'Merkez', 'Bursa', '2024-07-01', '9999-12-31', 1], [3, 'S02', 'Kızılay', 'Ankara', '2020-01-01', '9999-12-31', 1], [4, 'S03', 'Alsancak', 'İzmir', '2020-01-01', '9999-12-31', 1]]);
  tablo('etl_fact_hareket', 'Hareket fact tablosu, başta boş. sube_key boyuta bakar', [T('kaynak_no', 'Kaynak kayıt no'), I('sube_key', 'Şube vekil anahtarı'), T('hesap_no', 'Hesap'), T('islem_tarihi', 'Tarih'), R('tutar', 'Tutar'), I('batch_id', 'Yükleme')], []);
  tablo('etl_red', 'Hatalı satır tablosu, başta boş', [I('stg_id', 'Ham satır'), T('neden', 'Neden'), I('batch_id', 'Yükleme')], []);
  tablo('etl_yukleme_log', 'Yükleme günlüğü: her çalışmada bir satır', [I('batch_id', 'Yükleme'), T('is_adi', 'İş'), T('baslangic', 'Başlangıç'), T('bitis', 'Bitiş'), I('okunan', 'Okunan'), I('yuklenen', 'Yüklenen'), I('reddedilen', 'Reddedilen'), T('durum', 'Durum')], [[41, 'hareket', '2024-11-10 03:00:00', '2024-11-10 03:04:00', 1200, 1188, 12, 'tamam'], [42, 'hareket', '2024-11-11 03:00:00', '2024-11-11 03:00:40', 1310, 0, 0, 'hata']]);
  let sql = ''; for (const ad in TAB) { sql += 'CREATE TABLE ' + ad + ' (' + TAB[ad].kol.map((k, i) => k + ' ' + TAB[ad].tip[i]).join(', ') + ');\n' + ins(ad, TAB[ad].kol, TAB[ad].rows); }
  root.SQLP_SEED = (root.SQLP_SEED || '') + sql;
  Object.assign(root.SQLP_SCHEMA_NOTES = root.SQLP_SCHEMA_NOTES || {}, NOT);
  Object.assign(root.SQLP_COLMETA = root.SQLP_COLMETA || {}, META);
})(typeof window !== 'undefined' ? window : globalThis);
