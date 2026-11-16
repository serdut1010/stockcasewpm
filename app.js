const defaultInteriorProducts = [
    { sku: "WPM-PREM-001", name: "Wallpaper Premium Damask Gold", category: "Wallpaper", material: "Vinyl Bertekstur 0.5m x 10m", rack: "Gudang Utama - A1", stock: 18, price: 185000 },
    { sku: "WPM-CLSC-002", name: "Wallpaper Classic Floral Silver", category: "Wallpaper", material: "Vinyl Bertekstur 0.5m x 10m", rack: "Gudang Utama - A3", stock: 3, price: 175000 },
    { sku: "WPM-3DFM-003", name: "3D Foam Brick Putih Modern", category: "Foam", material: "PE Foam 70cm x 77cm", rack: "Gudang B - B1", stock: 65, price: 25000 },
    { sku: "WPM-VNYL-004", name: "Lantai Vinyl Wood Grain Natural", category: "Vinyl", material: "Plank 3mm Premium", rack: "Gudang B - C2", stock: 2, price: 145000 }
];

const defaultMutationLogs = [
    { timestamp: "08/11/2026, 09:00", sku: "WPM-PREM-001", name: "Wallpaper Premium Damask Gold", type: "Pendaftaran Barang", qty: 18, currentStock: 18 }
];

const productsStorageKey = "wallpaperInventoryProducts";
const logsStorageKey = "wallpaperInventoryLogs";
let interiorProducts = JSON.parse(localStorage.getItem(productsStorageKey)) || defaultInteriorProducts;
let mutationLogs = JSON.parse(localStorage.getItem(logsStorageKey)) || defaultMutationLogs;

document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("wallpaperAdminAuthenticated") !== "true") {
        window.location.replace("login.html");
        return;
    }

    initAuthentication();
    if (document.getElementById("dashboard-container")) {
        initDashboardNavigation();
        initMutationForm();
        updateDashboardUI();
    }
    if (document.getElementById("product-form")) {
        initProductForm();
    }
});

function initAuthentication() {
    const logoutBtn = document.getElementById("btn-admin-logout");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", () => {
        if(confirm("Apakah Anda yakin ingin keluar dari sistem admin?")) {
            sessionStorage.removeItem("wallpaperAdminAuthenticated");
            window.location.replace("login.html");
        }
    });
}

function initDashboardNavigation() {
    const navItems = document.querySelectorAll(".nav-item[data-target]");
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            navItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            const target = item.getAttribute("data-target");
            document.querySelectorAll(".content-section").forEach(sec => sec.classList.remove("active"));
            document.getElementById(`${target}-section`).classList.add("active");
        });
    });

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
                <td><strong>${p.sku}</strong></td>
                <td>${p.name}</td>
                <td>${p.category}</td>
                <td><small>${p.material}</small></td>
                <td>${p.rack}</td>
                <td><span class="${p.stock < 5 ? 'badge-danger' : ''}">${p.stock} Unit</span></td>
                <td>Rp ${p.price.toLocaleString('id-ID')}</td>
            </tr>
        `;

        if (p.stock < 5) {
            criticalCount++;
            criticalBody.innerHTML += `
                <tr>
                    <td>${p.sku}</td>
                    <td>${p.name}</td>
                    <td><span class="badge-danger">${p.stock} Unit</span></td>
                    <td><span class="badge-danger">Stok Kritis</span></td>
                </tr>
            `;
        }

        selectSkuMenu.innerHTML += `<option value="${p.sku}">${p.sku} - ${p.name}</option>`;
    });

    [...mutationLogs].reverse().forEach(log => {
        let actBadge = '';
        if (log.type === "Barang Masuk") {
            actBadge = `<span style="background: #e6fffa; color: #10b981; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.8rem;">📥 ${log.type}</span>`;
        } else if (log.type === "Barang Keluar") {
            actBadge = `<span style="background: #fff5f5; color: #ef4444; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.8rem;">📤 ${log.type}</span>`;
        } else {
            actBadge = `<span style="background: #f3e8ff; color: #8b5cf6; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.8rem;">✨ ${log.type}</span>`;
        }

        logsBody.innerHTML += `
            <tr>
                <td><small style="color:#6b7280;">${log.timestamp}</small></td>
                <td><strong>${log.sku}</strong></td>
                <td>${log.name}</td>
                <td>${actBadge}</td>
                <td><strong>${log.qty} Unit</strong></td>
                <td>${log.currentStock} Unit</td>
            </tr>
        `;
    });

    document.getElementById("stat-total-stock").innerText = totalStock;
    document.getElementById("stat-critical-stock").innerText = criticalCount;
    document.getElementById("stat-asset-value").innerText = `Rp ${totalAssetValue.toLocaleString('id-ID')}`;
}

function saveInventory() {
    localStorage.setItem(productsStorageKey, JSON.stringify(interiorProducts));
    localStorage.setItem(logsStorageKey, JSON.stringify(mutationLogs));
}

function initProductForm() {
    const timeStampEngine = () => new Date().toLocaleString('id-ID', { hour12: false }).replace(/\./g, ':');

    document.getElementById("product-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const s = document.getElementById("prod-sku").value.trim().toUpperCase();
        if (interiorProducts.some(product => product.sku === s)) {
            alert("Kode SKU sudah terdaftar. Gunakan kode SKU lain.");
            document.getElementById("prod-sku").focus();
            return;
        }
        const n = document.getElementById("prod-name").value;
        const q = parseInt(document.getElementById("prod-stock").value);

        const itemNew = {
            sku: s, name: n,
            category: document.getElementById("prod-category").value,
            material: document.getElementById("prod-material").value,
            rack: document.getElementById("prod-rack").value,
            stock: q, price: parseInt(document.getElementById("prod-price").value)
        };

        interiorProducts.push(itemNew);
        mutationLogs.push({
            timestamp: timeStampEngine(), sku: s, name: n, type: "Registrasi Baru", qty: q, currentStock: q
        });

        saveInventory();
        document.getElementById("product-form").reset();
        alert("Produk baru berhasil ditambahkan!");
        window.location.href = "index.html";
    });
}

function initMutationForm() {
    const timeStampEngine = () => new Date().toLocaleString('id-ID', { hour12: false }).replace(/\./g, ':');
    document.getElementById("mutation-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const skuSelect = document.getElementById("mutate-sku").value;
        const actType = document.getElementById("mutate-type").value;
        const inputQty = parseInt(document.getElementById("mutate-qty").value);

        const currentItem = interiorProducts.find(prod => prod.sku === skuSelect);

        if (currentItem) {
            let labelLog = "";
            if (actType === "in") {
                currentItem.stock += inputQty;
                labelLog = "Barang Masuk";
            } else {
                if (currentItem.stock < inputQty) {
                    alert(`Gagal! Stok fisik '${currentItem.name}' tidak mencukupi untuk dikeluarkan.`);
                    return;
                }
                currentItem.stock -= inputQty;
                labelLog = "Barang Keluar";
            }

            mutationLogs.push({
                timestamp: timeStampEngine(), sku: currentItem.sku, name: currentItem.name, type: labelLog, qty: inputQty, currentStock: currentItem.stock
            });

            saveInventory();
            document.getElementById("mutation-form").reset();
            updateDashboardUI();
            alert(`Pencatatan ${labelLog} berhasil diproses!`);
        }
    });
}
