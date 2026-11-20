let interiorProducts = [];
let mutationLogs = [];

// Mencegah teks input berisi tag HTML dieksekusi (XSS)
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));
const formatWaktu = (iso) => new Date(iso).toLocaleString("id-ID", { hour12: false }).replace(/\./g, ":");

document.addEventListener("DOMContentLoaded", async () => {
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
        window.location.replace("login.html");
        return;
    }

    initAuthentication();
    if (document.getElementById("dashboard-container")) {
        initDashboardNavigation();
        initMutationForm();
        await loadData();
        updateDashboardUI();
    }
    if (document.getElementById("product-form")) {
        initProductForm();
    }
});

function initAuthentication() {
    const logoutBtn = document.getElementById("btn-admin-logout");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", async () => {
        if (confirm("Apakah Anda yakin ingin keluar dari sistem admin?")) {
            await db.auth.signOut();
            window.location.replace("login.html");
        }
    });
}

function initDashboardNavigation() {
    const navItems = document.querySelectorAll(".nav-item[data-target]");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            const target = item.getAttribute("data-target");
            document.querySelectorAll(".content-section").forEach(sec => sec.classList.remove("active"));
            document.getElementById(`${target}-section`).classList.add("active");
        });
    });
}

// Ambil data terbaru dari database Supabase
async function loadData() {
    const [p, l] = await Promise.all([
        db.from("products").select("*").order("created_at", { ascending: true }),
        db.from("mutation_logs").select("*").order("created_at", { ascending: false }).limit(200)
    ]);
    const err = p.error || l.error;
    if (err) {
        alert("Gagal memuat data: " + err.message);
        return;
    }
    interiorProducts = p.data;
    mutationLogs = l.data;
}

function updateDashboardUI() {
    let totalStock = 0, criticalCount = 0, totalAssetValue = 0;

    const catalogBody = document.getElementById("product-list-body");
    const criticalBody = document.querySelector("#critical-table tbody");
    const logsBody = document.getElementById("log-list-body");
    const selectSkuMenu = document.getElementById("mutate-sku");

    catalogBody.innerHTML = "";
    criticalBody.innerHTML = "";
    logsBody.innerHTML = "";
    selectSkuMenu.innerHTML = '<option value="" disabled selected>-- Pilih Kode SKU Barang --</option>';

    interiorProducts.forEach(p => {
        totalStock += p.stock;
        totalAssetValue += (p.stock * p.price);

        catalogBody.innerHTML += `
            <tr>
                <td><strong>${esc(p.sku)}</strong></td>
                <td>${esc(p.name)}</td>
                <td>${esc(p.category)}</td>
                <td><small>${esc(p.material)}</small></td>
                <td>${esc(p.rack)}</td>
                <td><span class="${p.stock < 5 ? 'badge-danger' : ''}">${p.stock} Unit</span></td>
                <td>Rp ${p.price.toLocaleString('id-ID')}</td>
            </tr>
        `;

        if (p.stock < 5) {
            criticalCount++;
            criticalBody.innerHTML += `
                <tr>
                    <td>${esc(p.sku)}</td>
                    <td>${esc(p.name)}</td>
                    <td><span class="badge-danger">${p.stock} Unit</span></td>
                    <td><span class="badge-danger">Stok Kritis</span></td>
                </tr>
            `;
        }

        selectSkuMenu.innerHTML += `<option value="${esc(p.sku)}">${esc(p.sku)} - ${esc(p.name)}</option>`;
    });

    // Log sudah diurutkan terbaru di atas dari database, jadi tidak perlu reverse()
    mutationLogs.forEach(log => {
        let actBadge = '';
        if (log.type === "Barang Masuk") {
            actBadge = `<span style="background: #e6fffa; color: #10b981; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.8rem;">📥 ${esc(log.type)}</span>`;
        } else if (log.type === "Barang Keluar") {
            actBadge = `<span style="background: #fff5f5; color: #ef4444; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.8rem;">📤 ${esc(log.type)}</span>`;
        } else {
            actBadge = `<span style="background: #f3e8ff; color: #8b5cf6; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.8rem;">✨ ${esc(log.type)}</span>`;
        }

        logsBody.innerHTML += `
            <tr>
                <td><small style="color:#6b7280;">${formatWaktu(log.created_at)}</small></td>
                <td><strong>${esc(log.sku)}</strong></td>
                <td>${esc(log.name)}</td>
                <td>${actBadge}</td>
                <td><strong>${log.qty} Unit</strong></td>
                <td>${log.current_stock} Unit</td>
            </tr>
        `;
    });

    document.getElementById("stat-total-stock").innerText = totalStock;
    document.getElementById("stat-critical-stock").innerText = criticalCount;
    document.getElementById("stat-asset-value").innerText = `Rp ${totalAssetValue.toLocaleString('id-ID')}`;
}

function initProductForm() {
    const form = document.getElementById("product-form");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const sku = document.getElementById("prod-sku").value.trim().toUpperCase();
        const name = document.getElementById("prod-name").value.trim();
        const stock = parseInt(document.getElementById("prod-stock").value);

        submitBtn.disabled = true;

        const { error } = await db.from("products").insert({
            sku, name,
            category: document.getElementById("prod-category").value.trim(),
            material: document.getElementById("prod-material").value.trim(),
            rack: document.getElementById("prod-rack").value.trim(),
            stock,
            price: parseInt(document.getElementById("prod-price").value)
        });

        if (error) {
            submitBtn.disabled = false;
            if (error.code === "23505") {
                alert("Kode SKU sudah terdaftar. Gunakan kode SKU lain.");
                document.getElementById("prod-sku").focus();
            } else {
                alert("Gagal menyimpan produk: " + error.message);
            }
            return;
        }

        const { error: logError } = await db.from("mutation_logs").insert({
            sku, name, type: "Registrasi Baru", qty: stock, current_stock: stock
        });
        if (logError) {
            console.error("Produk tersimpan, tetapi log gagal dicatat:", logError);
        }

        alert("Produk baru berhasil ditambahkan!");
        window.location.href = "index.html";
    });
}

function initMutationForm() {
    const form = document.getElementById("mutation-form");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const sku = document.getElementById("mutate-sku").value;
        const actType = document.getElementById("mutate-type").value;
        const qty = parseInt(document.getElementById("mutate-qty").value);

        if (!sku) {
            alert("Pilih produk terlebih dahulu.");
            return;
        }

        submitBtn.disabled = true;
        // Perhitungan stok dilakukan di database (fungsi mutate_stock) agar aman
        const { error } = await db.rpc("mutate_stock", { p_sku: sku, p_type: actType, p_qty: qty });
        submitBtn.disabled = false;

        if (error) {
            if (error.message.includes("STOK_TIDAK_CUKUP")) {
                const item = interiorProducts.find(p => p.sku === sku);
                alert(`Gagal! Stok fisik '${item ? item.name : sku}' tidak mencukupi untuk dikeluarkan.`);
            } else {
                alert("Gagal memproses mutasi: " + error.message);
            }
            return;
        }

        form.reset();
        await loadData();
        updateDashboardUI();
        alert(`Pencatatan ${actType === "in" ? "Barang Masuk" : "Barang Keluar"} berhasil diproses!`);
    });
}
